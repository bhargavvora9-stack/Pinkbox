DROP POLICY IF EXISTS "website_abandoned_carts_tenant_select" ON public.website_abandoned_carts;
CREATE POLICY "website_abandoned_carts_module_select"
ON public.website_abandoned_carts
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'abandoned_carts','view')
);

DROP POLICY IF EXISTS "website_inventory_transactions_tenant_select" ON public.website_inventory_transactions;
CREATE POLICY "website_inventory_transactions_module_select"
ON public.website_inventory_transactions
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','view')
);

DROP POLICY IF EXISTS "website_order_status_history_tenant_select" ON public.website_order_status_history;
CREATE POLICY "website_order_status_history_module_select"
ON public.website_order_status_history
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
);

DROP POLICY IF EXISTS "website_order_items_tenant_select" ON public.website_order_items;
CREATE POLICY "website_order_items_module_select"
ON public.website_order_items
FOR SELECT TO authenticated
USING (
  public.has_website_admin_permission(company_id,(select auth.uid()),'orders','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'analytics','view')
  OR public.has_website_admin_permission(company_id,(select auth.uid()),'reports','view')
);
