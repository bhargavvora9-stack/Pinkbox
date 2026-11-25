-- Isolate dashboard, analytics and report reads from raw table access.
-- This migration was applied to the live PinkBox Supabase project first.

ALTER FUNCTION public.get_website_dashboard_stats(uuid) SECURITY DEFINER;
ALTER FUNCTION public.get_website_dashboard_stats(uuid) SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_website_analytics(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare v_result jsonb;
begin
  if not (
    public.has_website_admin_permission(p_company_id, (select auth.uid()), 'analytics', 'view')
    OR public.has_website_admin_permission(p_company_id, (select auth.uid()), 'reports', 'view')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  with eligible as (
    select *
    from public.website_orders
    where company_id=p_company_id
      and lower(coalesce(order_status,'')) not in ('cancelled','returned','refunded')
  ),
  daily as (
    select to_char(date(created_at),'YYYY-MM-DD') as date,
           coalesce(sum(total_amount),0) total
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
    from public.website_orders
    where company_id=p_company_id
    group by order_status
  ),
  payment_status as (
    select coalesce(payment_status,'unknown') status, count(*) count
    from public.website_orders
    where company_id=p_company_id
    group by payment_status
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'grossOrderValue', coalesce((select sum(total_amount) from public.website_orders where company_id=p_company_id),0),
      'sales', coalesce((select sum(total_amount) from eligible),0),
      'orders', (select count(*) from eligible),
      'totalOrders', (select count(*) from public.website_orders where company_id=p_company_id),
      'aov', case
        when (select count(*) from eligible)>0
        then coalesce((select sum(total_amount) from eligible),0)/(select count(*) from eligible)
        else 0
      end,
      'customers', (select count(*) from public.customers where company_id=p_company_id),
      'products', (select count(*) from public.website_products where company_id=p_company_id),
      'lowStock', (
        select count(*) from public.website_products
        where company_id=p_company_id
          and coalesce(stock_quantity,0)<=coalesce(low_stock_threshold,0)
          and coalesce(stock_quantity,0)>0
      ),
      'outOfStock', (
        select count(*) from public.website_products
        where company_id=p_company_id and coalesce(stock_quantity,0)<=0
      ),
      'paidSales', coalesce((
        select sum(total_amount) from eligible
        where lower(coalesce(payment_status,'')) in ('paid','captured','success')
      ),0),
      'outstandingSales', coalesce((
        select sum(total_amount) from eligible
        where lower(coalesce(payment_status,'')) not in ('paid','captured','success')
      ),0),
      'discounts', coalesce((select sum(discount_amount) from eligible),0),
      'shipping', coalesce((select sum(shipping_amount) from eligible),0),
      'tax', coalesce((select sum(tax_amount) from eligible),0)
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date',date,'total',total) order by date)
      from daily
    ),'[]'::jsonb),
    'topProducts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id',product_id,'product_name',product_name,
        'quantity',quantity,'sales',sales
      ) order by sales desc)
      from top_products
    ),'[]'::jsonb),
    'orderStatus', coalesce((select jsonb_object_agg(status,count) from order_status),'{}'::jsonb),
    'paymentStatus', coalesce((select jsonb_object_agg(status,count) from payment_status),'{}'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

ALTER FUNCTION public.replace_website_product_links(uuid,uuid,text,uuid[]) SECURITY DEFINER;
ALTER FUNCTION public.replace_website_product_links(uuid,uuid,text,uuid[]) SET search_path = '';

DROP POLICY IF EXISTS "website_orders_module_select" ON public.website_orders;
CREATE POLICY "website_orders_module_select"
ON public.website_orders
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
);

DROP POLICY IF EXISTS "website_order_items_module_select" ON public.website_order_items;
CREATE POLICY "website_order_items_module_select"
ON public.website_order_items
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
);

DROP POLICY IF EXISTS "website_products_module_select" ON public.website_products;
CREATE POLICY "website_products_module_select"
ON public.website_products
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'products','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','view')
);

DROP POLICY IF EXISTS "website_categories_module_select" ON public.website_categories;
CREATE POLICY "website_categories_module_select"
ON public.website_categories
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'categories','view')
);

DROP POLICY IF EXISTS "website_settings_module_select" ON public.website_settings;
CREATE POLICY "website_settings_module_select"
ON public.website_settings
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'settings','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
);

DROP POLICY IF EXISTS "customers_module_select" ON public.customers;
CREATE POLICY "customers_module_select"
ON public.customers
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'customers','view')
);
