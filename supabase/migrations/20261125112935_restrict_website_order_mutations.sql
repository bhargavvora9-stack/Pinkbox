
revoke insert, delete on table public.website_orders from authenticated;
revoke update on table public.website_orders from authenticated;
grant update (order_status, updated_at) on table public.website_orders to authenticated;

drop policy if exists website_orders_module_insert on public.website_orders;
drop policy if exists website_orders_module_delete on public.website_orders;
