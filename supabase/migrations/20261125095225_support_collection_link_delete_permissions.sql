DROP POLICY IF EXISTS "website_product_collections_module_delete" ON public.website_product_collections;
CREATE POLICY "website_product_collections_module_delete"
ON public.website_product_collections
FOR DELETE
TO authenticated
USING (
  public.has_website_admin_permission(company_id, (select auth.uid()), 'collections', 'update')
  OR public.has_website_admin_permission(company_id, (select auth.uid()), 'collections', 'delete')
);
