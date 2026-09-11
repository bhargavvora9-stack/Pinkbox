-- Dashboard aggregate stats with company and role validation.
create or replace function public.get_website_dashboard_stats(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active, true) = true
      and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'sales', coalesce((select sum(total_amount) from public.website_orders where company_id = p_company_id), 0),
    'orders', coalesce((select count(*) from public.website_orders where company_id = p_company_id), 0),
    'products', coalesce((select count(*) from public.website_products where company_id = p_company_id), 0),
    'customers', coalesce((select count(*) from public.customers where company_id = p_company_id), 0)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_website_dashboard_stats(uuid) from public, anon;
grant execute on function public.get_website_dashboard_stats(uuid) to authenticated;