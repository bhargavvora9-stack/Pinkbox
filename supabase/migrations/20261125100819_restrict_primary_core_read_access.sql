DROP POLICY IF EXISTS "website_orders_tenant_select" ON public.website_orders;
CREATE POLICY "website_orders_module_select"
ON public.website_orders
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'dashboard','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'analytics','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'reports','view')
);

DROP POLICY IF EXISTS "website_products_tenant_select" ON public.website_products;
CREATE POLICY "website_products_module_select"
ON public.website_products
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'products','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'dashboard','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'analytics','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'reports','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','view')
);

DROP POLICY IF EXISTS "website_product_variants_tenant_select" ON public.website_product_variants;
CREATE POLICY "website_product_variants_module_select"
ON public.website_product_variants
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'variants','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','view')
);

DROP POLICY IF EXISTS "website_settings_tenant_select" ON public.website_settings;
CREATE POLICY "website_settings_module_select"
ON public.website_settings
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'settings','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'dashboard','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
);
