
create or replace function private.update_website_order_status_internal(
  p_company_id uuid,
  p_order_id uuid,
  p_status text,
  p_note text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_before public.website_orders;
  v_after public.website_orders;
begin
  if p_actor_id is null or p_actor_id is distinct from auth.uid() then
    raise exception 'Invalid order status actor.' using errcode = '42501';
  end if;

  if not public.has_website_admin_permission(p_company_id, p_actor_id, 'orders', 'update') then
    raise exception 'Access denied.' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('pending','confirmed','processing','packed','shipped','delivered','cancelled','returned') then
    raise exception 'Invalid order status.';
  end if;

  select * into v_before
  from public.website_orders
  where company_id = p_company_id and id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  update public.website_orders
  set order_status = p_status, updated_at = now()
  where company_id = p_company_id and id = p_order_id
  returning * into v_after;

  insert into public.website_order_status_history(
    company_id, order_id, status, note, created_by
  ) values (
    p_company_id, p_order_id, v_after.order_status, nullif(trim(coalesce(p_note,'')),''),
    p_actor_id
  );

  return jsonb_build_object(
    'before', to_jsonb(v_before) - ARRAY['tracking_token','razorpay_signature','razorpay_order_id','razorpay_payment_id']::text[],
    'data', to_jsonb(v_after) - ARRAY['tracking_token','razorpay_signature','razorpay_order_id','razorpay_payment_id']::text[]
  );
end;
$function$;

revoke all on function private.update_website_order_status_internal(uuid,uuid,text,text,uuid) from public, anon, service_role;
grant execute on function private.update_website_order_status_internal(uuid,uuid,text,text,uuid) to authenticated;

create or replace function public.update_website_order_status(
  p_company_id uuid,
  p_order_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.update_website_order_status_internal(
    p_company_id, p_order_id, p_status, p_note, auth.uid()
  );
$function$;

revoke all on function public.update_website_order_status(uuid,uuid,text,text) from public, anon, service_role;
grant execute on function public.update_website_order_status(uuid,uuid,text,text) to authenticated;

revoke update on table public.website_orders from authenticated;
revoke update (order_status, updated_at) on table public.website_orders from authenticated;
revoke insert on table public.website_order_status_history from authenticated;

drop policy if exists website_orders_module_update on public.website_orders;
drop policy if exists website_order_status_history_module_insert on public.website_order_status_history;
