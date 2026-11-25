CREATE OR REPLACE FUNCTION public.has_website_admin_permission(
  p_company_id uuid,
  p_user_id uuid,
  p_module text,
  p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  select private.is_super_admin()
    OR exists (
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
              on r.id = a.role_id
             and r.company_id = a.company_id
            where a.company_id = p_company_id
              and a.user_id = p_user_id
              and r.permissions #> array['modules', p_module, p_action] = 'true'::jsonb
          )
        )
    );
$function$;
