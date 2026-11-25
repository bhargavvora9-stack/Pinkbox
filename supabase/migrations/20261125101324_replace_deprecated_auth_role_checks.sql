CREATE OR REPLACE FUNCTION public.has_website_admin_permission(
  p_company_id uuid,
  p_user_id uuid,
  p_module text,
  p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  select private.is_super_admin()
    OR exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.company_id = p_company_id
        and coalesce(p.active, true) = true
        and (coalesce((select auth.jwt()->>'role'),'') = 'service_role' or p_user_id = (select auth.uid()))
        and (
          p.role in ('admin', 'super_admin')
          or exists (
            select 1
            from public.website_user_role_assignments a
            join public.website_roles r
              on r.id = a.role_id
             and r.company_id = a.company_id
            where a.company_id = p_company_id
              and a.user_id = p_user_id
              and r.permissions #> array['modules', p_module, p_action] = 'true'::jsonb
          )
        )
    );
$function$;

CREATE OR REPLACE FUNCTION private.guard_website_stock_column_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_module text;
  v_can_manage boolean := false;
  v_can_inventory boolean := false;
BEGIN
  IF coalesce((select auth.jwt()->>'role'), '') = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  v_module := CASE WHEN TG_TABLE_NAME = 'website_products' THEN 'products' ELSE 'variants' END;
  v_can_manage := public.has_website_admin_permission(NEW.company_id, auth.uid(), v_module, 'update');

  IF TG_TABLE_NAME = 'website_products' THEN
    v_can_manage := v_can_manage
      OR public.has_website_admin_permission(NEW.company_id, auth.uid(), 'import_export', 'create')
      OR public.has_website_admin_permission(NEW.company_id, auth.uid(), 'import_export', 'update');
  END IF;

  v_can_inventory := public.has_website_admin_permission(NEW.company_id, auth.uid(), 'inventory', 'update');

  IF NOT v_can_manage AND NOT v_can_inventory THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  IF v_can_manage AND v_can_inventory THEN
    RETURN NEW;
  ELSIF v_can_manage THEN
    IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
      RAISE EXCEPTION 'Inventory permission is required to change stock_quantity.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  ELSE
    IF (to_jsonb(NEW) - ARRAY['stock_quantity','updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['stock_quantity','updated_at']) THEN
      RAISE EXCEPTION 'Product or variant permission is required to change non-stock fields.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_website_order_status(
  p_company_id uuid,
  p_order_id uuid,
  p_status text,
  p_note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $function$
declare
  v_before public.website_orders;
  v_after public.website_orders;
  v_actor uuid;
begin
  if coalesce((select auth.jwt()->>'role'), '') = 'service_role' then
    v_actor := null;
  else
    if not public.has_website_admin_permission(p_company_id, auth.uid(), 'orders', 'update') then
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
$function$;
