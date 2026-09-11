-- Dashboard stats only reads rows already protected by tenant RLS policies.
-- Run as the caller so the RPC does not expose owner privileges.
alter function public.get_website_dashboard_stats(uuid) security invoker;

revoke execute on function public.get_website_dashboard_stats(uuid) from public;
grant execute on function public.get_website_dashboard_stats(uuid) to authenticated, service_role;
