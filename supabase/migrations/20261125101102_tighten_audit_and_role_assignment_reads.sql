CREATE OR REPLACE FUNCTION private.can_write_website_audit_log(
  p_company_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  select p_user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.company_id = p_company_id
        and coalesce(p.active, false) = true
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
              and exists (
                select 1
                from jsonb_each(coalesce(r.permissions->'modules', '{}'::jsonb)) as module(key, value)
                where module.value->'create' = 'true'::jsonb
                   or module.value->'update' = 'true'::jsonb
                   or module.value->'delete' = 'true'::jsonb
              )
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION private.can_write_website_audit_log(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_website_audit_log(uuid,uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "website_audit_logs_append_own" ON public.website_audit_logs;
CREATE POLICY "website_audit_logs_append_own"
ON public.website_audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND company_id = private.my_company_id()
  AND private.can_write_website_audit_log(company_id, user_id)
);

DROP POLICY IF EXISTS "website_roles_select" ON public.website_roles;
CREATE POLICY "website_roles_select"
ON public.website_roles
FOR SELECT TO authenticated
USING (
  company_id = private.my_company_id()
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.company_id = website_roles.company_id
        AND p.active = true
        AND p.role IN ('admin','super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.website_user_role_assignments a
      WHERE a.company_id = website_roles.company_id
        AND a.role_id = website_roles.id
        AND a.user_id = (select auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "website_user_role_assignments_select" ON public.website_user_role_assignments;
CREATE POLICY "website_user_role_assignments_select"
ON public.website_user_role_assignments
FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid())
      AND p.company_id = website_user_role_assignments.company_id
      AND p.active = true
      AND p.role IN ('admin','super_admin')
  )
);
