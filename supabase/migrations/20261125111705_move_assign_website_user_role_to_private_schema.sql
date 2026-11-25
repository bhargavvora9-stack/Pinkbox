-- Keep the staff-role assignment API while moving its privileged implementation
-- out of the exposed public schema.
CREATE OR REPLACE FUNCTION private.assign_website_user_role_internal(
  p_company_id uuid,
  p_user_id uuid,
  p_role_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_actor public.profiles%rowtype;
  v_target public.profiles%rowtype;
begin
  -- Bind the internal call to the authenticated caller. This prevents direct
  -- invocation with another user's actor id if the private schema is ever exposed.
  if p_actor_id is null or p_actor_id is distinct from (select auth.uid()) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select * into v_actor
  from public.profiles
  where id = p_actor_id
  for share;

  if v_actor.id is null
     or v_actor.company_id <> p_company_id
     or v_actor.active is not true
     or v_actor.role not in ('admin','super_admin') then
    raise exception 'Only an active company admin can assign roles'
      using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_user_id
    and company_id = p_company_id
    and active = true
  for share;

  if v_target.id is null then
    raise exception 'Active company staff member not found' using errcode = 'P0002';
  end if;

  if v_target.role in ('admin','super_admin') then
    raise exception 'Administrator roles cannot be changed here'
      using errcode = '42501';
  end if;

  if p_role_id is null then
    delete from public.website_user_role_assignments
    where company_id = p_company_id and user_id = p_user_id;
    return jsonb_build_object('user_id',p_user_id,'role_id',null);
  end if;

  if not exists (
    select 1
    from public.website_roles
    where id = p_role_id
      and company_id = p_company_id
      and coalesce(permissions #>> '{modules,dashboard,view}','false') = 'true'
  ) then
    raise exception 'Role not found or dashboard access is missing'
      using errcode = 'P0002';
  end if;

  insert into public.website_user_role_assignments(
    company_id,user_id,role_id,assigned_by,updated_at
  )
  values (p_company_id,p_user_id,p_role_id,p_actor_id,now())
  on conflict (company_id,user_id)
  do update set
    role_id = excluded.role_id,
    assigned_by = excluded.assigned_by,
    updated_at = now();

  return jsonb_build_object('user_id',p_user_id,'role_id',p_role_id);
end;
$function$;

REVOKE ALL ON FUNCTION private.assign_website_user_role_internal(uuid,uuid,uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.assign_website_user_role_internal(uuid,uuid,uuid,uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_website_user_role(
  p_company_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  select private.assign_website_user_role_internal(
    p_company_id,p_user_id,p_role_id,(select auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION public.assign_website_user_role(uuid,uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_website_user_role(uuid,uuid,uuid)
  TO authenticated;
