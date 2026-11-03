create or replace function public.update_website_order_status(
  p_company_id uuid,
  p_order_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.website_orders;
  v_after public.website_orders;
  v_actor uuid;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    v_actor := null;
  else
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = p_company_id
        and coalesce(p.active, true) = true
        and p.role in ('admin', 'super_admin')
    ) then
      raise exception 'Access denied.' using errcode = '42501';
    end if;
    v_actor := auth.uid();
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
    p_company_id, p_order_id, v_after.order_status, nullif(trim(coalesce(p_note,'')),''), v_actor
  );

  return jsonb_build_object('before', to_jsonb(v_before), 'data', to_jsonb(v_after));
end;
$$;

revoke all on function public.update_website_order_status(uuid, uuid, text, text) from public, anon;
grant execute on function public.update_website_order_status(uuid, uuid, text, text) to authenticated, service_role;
