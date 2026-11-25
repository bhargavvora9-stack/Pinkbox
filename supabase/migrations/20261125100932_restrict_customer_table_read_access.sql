DROP POLICY IF EXISTS "customers_isolation" ON public.customers;

CREATE POLICY "customers_module_select"
ON public.customers
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'customers','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'dashboard','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'analytics','view')
);
