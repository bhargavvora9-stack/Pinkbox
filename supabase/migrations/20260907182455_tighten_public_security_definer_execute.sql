revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_super_admin() from public, anon, authenticated;
revoke execute on function public.my_company_id() from public, anon, authenticated;
revoke execute on function public.place_website_order(uuid,text,text,text,jsonb,jsonb,text,text,text) from public, anon, authenticated;
