-- Extend database-side authorization to honor assigned company staff roles.
-- Administrator/super-admin access is unchanged; all staff grants remain company-scoped.

create or replace function public.has_website_admin_permission(
  p_company_id uuid,
  p_user_id uuid,
  p_module text,
  p_action text
) returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.company_id = p_company_id
      and coalesce(p.active, true) = true
      and (auth.role() = 'service_role' or p_user_id = auth.uid())
      and (
        p.role in ('admin', 'super_admin')
        or exists (
          select 1
          from public.website_user_role_assignments a
          join public.website_roles r
            on r.id = a.role_id and r.company_id = a.company_id
          where a.company_id = p_company_id
            and a.user_id = p_user_id
            and r.permissions #> array['modules', p_module, p_action] = 'true'::jsonb
        )
      )
  );
$$;

revoke all on function public.has_website_admin_permission(uuid,uuid,text,text) from public, anon;
grant execute on function public.has_website_admin_permission(uuid,uuid,text,text) to authenticated, service_role;

do $$
declare v_def text; v_old text; v_new text; v_sig regprocedure;
begin
  v_sig := 'public.update_website_order_status(uuid,uuid,text,text)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = p_company_id
        and coalesce(p.active, true) = true
        and p.role in ('admin', 'super_admin')
    ) then
      raise exception 'Access denied.' using errcode = '42501';
    end if;$old$;
  v_new := $new$    if not public.has_website_admin_permission(p_company_id, auth.uid(), 'orders', 'update') then
      raise exception 'Access denied.' using errcode = '42501';
    end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Order status guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.adjust_website_stock(uuid,uuid,numeric,text,uuid)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active,true) = true
      and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(p_company_id, auth.uid(), 'inventory', 'update') then
    raise exception 'Access denied.' using errcode='42501';
  end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Product stock guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.adjust_website_variant_stock(uuid,uuid,numeric,text,uuid)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.company_id=p_company_id
      and coalesce(p.active,true)=true
      and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(p_company_id, auth.uid(), 'inventory', 'update') then
    raise exception 'Access denied.' using errcode='42501';
  end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Variant stock guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.adjust_website_inventory(uuid,uuid,numeric,text)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p
    where p.id=v_uid and p.company_id=p_company_id
      and coalesce(p.active,true)=true and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(p_company_id, v_uid, 'inventory', 'update') then
    raise exception 'Access denied.' using errcode='42501';
  end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Legacy inventory guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.bulk_update_website_products(uuid,uuid,uuid[],text,jsonb,text)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p where p.id=p_user_id and p.company_id=p_company_id and p.active=true and p.role in ('admin','super_admin')
  ) then raise exception 'Access denied.'; end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(
    p_company_id,
    p_user_id,
    case when p_field = 'stock_quantity' then 'inventory' else 'products' end,
    'update'
  ) then raise exception 'Access denied.' using errcode='42501'; end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Bulk update guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.get_website_analytics(uuid)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active,true)=true
      and p.role in ('admin','super_admin')
  ) then raise exception 'Access denied.' using errcode='42501'; end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(p_company_id, auth.uid(), 'analytics', 'view') then
    raise exception 'Access denied.' using errcode='42501';
  end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Analytics guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.get_website_dashboard_stats(uuid)'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.company_id=p_company_id
      and coalesce(p.active,true)=true and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(p_company_id, auth.uid(), 'dashboard', 'view') then
    raise exception 'Access denied.' using errcode='42501';
  end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Dashboard stats guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);

  v_sig := 'public.replace_website_product_links(uuid,uuid,text,uuid[])'::regprocedure;
  select pg_get_functiondef(v_sig) into v_def;
  v_old := $old$  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active, true) = true
      and p.role in ('admin', 'super_admin')
  ) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;$old$;
  v_new := $new$  if not public.has_website_admin_permission(
    p_company_id,
    auth.uid(),
    case when p_relation = 'categories' then 'categories' when p_relation = 'collections' then 'collections' else '__invalid__' end,
    'update'
  ) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;$new$;
  if position(v_old in v_def) = 0 then raise exception 'Product link guard not found; migration stopped.'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
