create or replace function public.set_website_order_tracking_token()
returns trigger
language plpgsql
security definer
set search_path=public
as $function$
begin
  if new.tracking_token is null or btrim(new.tracking_token)='' then
    new.tracking_token := replace(uuid_generate_v4()::text || uuid_generate_v4()::text,'-','');
  end if;
  return new;
end;
$function$;
update public.website_orders
set tracking_token=replace(uuid_generate_v4()::text || uuid_generate_v4()::text,'-','')
where tracking_token is null;
revoke all on function public.set_website_order_tracking_token() from public,anon,authenticated;
