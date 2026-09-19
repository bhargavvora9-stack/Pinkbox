alter function public.calculate_website_shipping(uuid,numeric,numeric,text,text,jsonb) security invoker;
revoke execute on function public.calculate_website_shipping(uuid,numeric,numeric,text,text,jsonb) from public, anon, authenticated;

alter function public.get_website_analytics(uuid) security invoker;
revoke execute on function public.get_website_analytics(uuid) from public, anon;
grant execute on function public.get_website_analytics(uuid) to authenticated;

alter function public.get_website_dashboard_stats(uuid) security invoker;
revoke execute on function public.get_website_dashboard_stats(uuid) from public, anon;
grant execute on function public.get_website_dashboard_stats(uuid) to authenticated;