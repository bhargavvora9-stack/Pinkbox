-- No SVG objects currently exist in website-images. Stop accepting SVG uploads.
UPDATE storage.buckets
SET allowed_mime_types = array_remove(
  coalesce(allowed_mime_types, ARRAY[]::text[]),
  'image/svg+xml'
)
WHERE id='website-images';

-- Direct Storage writes to the legacy product-images bucket must obey the
-- same images module permission as the website upload API.
DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='product-images'
  AND (storage.foldername(name))[1] = (private.my_company_id())::text
  AND public.has_website_admin_permission(
    private.my_company_id(),(select auth.uid()),'images','create'
  )
);

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id='product-images'
  AND (storage.foldername(name))[1] = (private.my_company_id())::text
  AND public.has_website_admin_permission(
    private.my_company_id(),(select auth.uid()),'images','update'
  )
)
WITH CHECK (
  bucket_id='product-images'
  AND (storage.foldername(name))[1] = (private.my_company_id())::text
  AND public.has_website_admin_permission(
    private.my_company_id(),(select auth.uid()),'images','update'
  )
);

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id='product-images'
  AND (storage.foldername(name))[1] = (private.my_company_id())::text
  AND public.has_website_admin_permission(
    private.my_company_id(),(select auth.uid()),'images','delete'
  )
);
