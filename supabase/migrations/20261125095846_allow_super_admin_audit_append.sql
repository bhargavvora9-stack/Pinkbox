ALTER POLICY "website_audit_logs_append_own"
ON public.website_audit_logs
WITH CHECK (
  user_id = (select auth.uid())
  AND (company_id = private.my_company_id() OR private.is_super_admin())
  AND public.has_website_admin_permission(company_id,(select auth.uid()),'dashboard','view')
);
