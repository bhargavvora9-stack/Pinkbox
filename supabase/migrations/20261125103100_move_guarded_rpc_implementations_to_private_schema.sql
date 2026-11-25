-- Move guarded privileged implementations into the private schema.
-- Public RPCs remain SECURITY INVOKER wrappers with the caller's auth.uid().

CREATE OR REPLACE FUNCTION private.get_website_dashboard_stats_internal(
  p_company_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare v jsonb;
begin
  if not public.has_website_admin_permission(p_company_id,p_user_id,'dashboard','view') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'sales', coalesce((
      select sum(total_amount)
      from public.website_orders
      where company_id=p_company_id
        and lower(coalesce(order_status,'')) not in ('cancelled','returned')
    ),0),
    'orders', (
      select count(*)
      from public.website_orders
      where company_id=p_company_id
        and lower(coalesce(order_status,'')) not in ('cancelled','returned')
    ),
    'products', (
      select count(*) from public.website_products
      where company_id=p_company_id and is_active=true
    ),
    'customers', (
      select count(*) from public.customers
      where company_id=p_company_id
    )
  ) into v;

  return v;
end;
$function$;

REVOKE ALL ON FUNCTION private.get_website_dashboard_stats_internal(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_website_dashboard_stats_internal(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_website_dashboard_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  select private.get_website_dashboard_stats_internal(p_company_id,(select auth.uid()));
$function$;

REVOKE ALL ON FUNCTION public.get_website_dashboard_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_website_dashboard_stats(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.get_website_analytics_internal(
  p_company_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare v_result jsonb;
begin
  if not (
    public.has_website_admin_permission(p_company_id,p_user_id,'analytics','view')
    OR public.has_website_admin_permission(p_company_id,p_user_id,'reports','view')
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

REVOKE ALL ON FUNCTION private.get_website_analytics_internal(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_website_analytics_internal(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_website_analytics(p_company_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  select private.get_website_analytics_internal(p_company_id,(select auth.uid()));
$function$;

REVOKE ALL ON FUNCTION public.get_website_analytics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_website_analytics(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.replace_website_product_links_internal(
  p_company_id uuid,
  p_product_id uuid,
  p_relation text,
  p_related_ids uuid[],
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_count integer;
  v_expected integer;
begin
  if not public.has_website_admin_permission(
    p_company_id,
    p_user_id,
    case
      when p_relation='categories' then 'categories'
      when p_relation='collections' then 'collections'
      else '__invalid__'
    end,
    'update'
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_product_id is null or not exists (
    select 1 from public.website_products p
    where p.id=p_product_id and p.company_id=p_company_id
  ) then
    raise exception 'Product not found.' using errcode='P0002';
  end if;

  if p_relation is null or p_relation not in ('categories','collections') then
    raise exception 'Unsupported product relation.';
  end if;

  if coalesce(cardinality(p_related_ids),0) <> (
    select count(distinct x) from unnest(coalesce(p_related_ids,array[]::uuid[])) as x
  ) then
    raise exception 'Duplicate relation ids are not allowed.';
  end if;

  v_expected:=coalesce(cardinality(p_related_ids),0);

  if p_relation='categories' then
    select count(*) into v_count
    from public.website_categories c
    where c.company_id=p_company_id
      and c.id=any(coalesce(p_related_ids,array[]::uuid[]));

    if v_count<>v_expected then
      raise exception 'One or more categories were not found for this company.';
    end if;

    delete from public.website_product_categories
    where company_id=p_company_id and product_id=p_product_id;

    insert into public.website_product_categories(company_id,product_id,category_id)
    select p_company_id,p_product_id,x
    from unnest(coalesce(p_related_ids,array[]::uuid[])) as x;
  else
    select count(*) into v_count
    from public.website_collections c
    where c.company_id=p_company_id
      and c.id=any(coalesce(p_related_ids,array[]::uuid[]));

    if v_count<>v_expected then
      raise exception 'One or more collections were not found for this company.';
    end if;

    delete from public.website_product_collections
    where company_id=p_company_id and product_id=p_product_id;

    insert into public.website_product_collections(company_id,product_id,collection_id)
    select p_company_id,p_product_id,x
    from unnest(coalesce(p_related_ids,array[]::uuid[])) as x;
  end if;

  return v_expected;
end;
$function$;

REVOKE ALL ON FUNCTION private.replace_website_product_links_internal(uuid,uuid,text,uuid[],uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.replace_website_product_links_internal(uuid,uuid,text,uuid[],uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.replace_website_product_links(
  p_company_id uuid,
  p_product_id uuid,
  p_relation text,
  p_related_ids uuid[]
)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  select private.replace_website_product_links_internal(
    p_company_id,p_product_id,p_relation,p_related_ids,(select auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION public.replace_website_product_links(uuid,uuid,text,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_website_product_links(uuid,uuid,text,uuid[]) TO authenticated, service_role;
