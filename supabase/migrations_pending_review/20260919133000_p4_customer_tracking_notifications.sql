-- P4 customer-facing order tracking and notification support.

alter table public.website_orders
  add column if not exists tracking_token text;

create unique index if not exists website_orders_tracking_token_key
  on public.website_orders(tracking_token)
  where tracking_token is not null;

create or replace function public.set_website_order_tracking_token()
returns trigger
language plpgsql
security definer
set search_path=public,extensions
as $function$
begin
  if new.tracking_token is null or btrim(new.tracking_token)='' then
    new.tracking_token := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_set_website_order_tracking_token on public.website_orders;
create trigger trg_set_website_order_tracking_token
before insert on public.website_orders
for each row execute function public.set_website_order_tracking_token();

update public.website_orders
set tracking_token=encode(gen_random_bytes(24),'hex')
where tracking_token is null;

revoke all on function public.set_website_order_tracking_token() from public,anon,authenticated;

-- Keep database-side order status writes aligned with supported statuses.
create or replace function public.validate_website_order_status_value()
returns trigger
language plpgsql
as $function$
begin
  if new.order_status not in ('pending','confirmed','processing','packed','shipped','delivered','cancelled','returned') then
    raise exception 'Invalid website order status.';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_validate_website_order_status on public.website_orders;
create trigger trg_validate_website_order_status
before insert or update of order_status on public.website_orders
for each row execute function public.validate_website_order_status_value();
