create or replace function public.get_website_analytics(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active,true)=true
      and p.role in ('admin','super_admin')
  ) then raise exception 'Access denied.' using errcode='42501'; end if;

  with eligible as (
    select * from public.website_orders
    where company_id=p_company_id
      and lower(coalesce(order_status,'')) not in ('cancelled','returned','refunded')
  ),
  daily as (
    select to_char(date(created_at),'YYYY-MM-DD') as date, coalesce(sum(total_amount),0) total
    from eligible
    where created_at >= now() - interval '90 days'
    group by date(created_at)
    order by date(created_at)
  ),
  top_products as (
    select oi.product_id,
           coalesce(max(oi.product_name),'Unknown') product_name,
           coalesce(sum(oi.quantity),0) quantity,
           coalesce(sum(oi.line_total),0) sales
    from public.website_order_items oi
    join eligible o on o.id=oi.order_id
    where oi.company_id=p_company_id
    group by oi.product_id
    order by coalesce(sum(oi.line_total),0) desc
    limit 20
  ),
  order_status as (
    select coalesce(order_status,'unknown') status, count(*) count
    from public.website_orders where company_id=p_company_id group by order_status
  ),
  payment_status as (
    select coalesce(payment_status,'unknown') status, count(*) count
    from public.website_orders where company_id=p_company_id group by payment_status
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'grossOrderValue', coalesce((select sum(total_amount) from public.website_orders where company_id=p_company_id),0),
      'sales', coalesce((select sum(total_amount) from eligible),0),
      'orders', (select count(*) from eligible),
      'totalOrders', (select count(*) from public.website_orders where company_id=p_company_id),
      'aov', case when (select count(*) from eligible)>0 then coalesce((select sum(total_amount) from eligible),0)/(select count(*) from eligible) else 0 end,
      'customers', (select count(*) from public.customers where company_id=p_company_id),
      'products', (select count(*) from public.website_products where company_id=p_company_id),
      'lowStock', (select count(*) from public.website_products where company_id=p_company_id and coalesce(stock_quantity,0)<=coalesce(low_stock_threshold,0) and coalesce(stock_quantity,0)>0),
      'outOfStock', (select count(*) from public.website_products where company_id=p_company_id and coalesce(stock_quantity,0)<=0),
      'paidSales', coalesce((select sum(total_amount) from eligible where lower(coalesce(payment_status,'')) in ('paid','captured','success')),0),
      'outstandingSales', coalesce((select sum(total_amount) from eligible where lower(coalesce(payment_status,'')) not in ('paid','captured','success')),0),
      'discounts', coalesce((select sum(discount_amount) from eligible),0),
      'shipping', coalesce((select sum(shipping_amount) from eligible),0),
      'tax', coalesce((select sum(tax_amount) from eligible),0)
    ),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('date',date,'total',total) order by date) from daily),'[]'::jsonb),
    'topProducts', coalesce((select jsonb_agg(jsonb_build_object('product_id',product_id,'product_name',product_name,'quantity',quantity,'sales',sales) order by sales desc) from top_products),'[]'::jsonb),
    'orderStatus', coalesce((select jsonb_object_agg(status,count) from order_status),'{}'::jsonb),
    'paymentStatus', coalesce((select jsonb_object_agg(status,count) from payment_status),'{}'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.get_website_analytics(uuid) from public,anon;
grant execute on function public.get_website_analytics(uuid) to authenticated;

create or replace function public.get_website_dashboard_stats(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.company_id=p_company_id
      and coalesce(p.active,true)=true and p.role in ('admin','super_admin')
  ) then raise exception 'Access denied.' using errcode='42501'; end if;
  select jsonb_build_object(
    'sales',coalesce((select sum(total_amount) from public.website_orders where company_id=p_company_id and lower(coalesce(order_status,'')) not in ('cancelled','returned','refunded')),0),
    'orders',(select count(*) from public.website_orders where company_id=p_company_id and lower(coalesce(order_status,'')) not in ('cancelled','returned','refunded')),
    'products',(select count(*) from public.website_products where company_id=p_company_id),
    'customers',(select count(*) from public.customers where company_id=p_company_id)
  ) into v;
  return v;
end;
$$;
revoke execute on function public.get_website_dashboard_stats(uuid) from public,anon;
grant execute on function public.get_website_dashboard_stats(uuid) to authenticated;