-- Company records are administrative metadata, not public storefront data.
REVOKE SELECT ON TABLE public.companies FROM anon;

DROP POLICY IF EXISTS company_select ON public.companies;
CREATE POLICY company_select
ON public.companies
FOR SELECT
TO authenticated
USING (
  id = (SELECT private.my_company_id())
  OR (SELECT private.is_super_admin())
);

-- The private schema contains internal helpers. Authenticated admin policies
-- retain access; anonymous clients must not resolve private helper functions.
REVOKE USAGE ON SCHEMA private FROM anon;

-- This is an internal trigger function, not a client-callable RPC.
REVOKE ALL ON FUNCTION private.guard_website_stock_column_updates() FROM PUBLIC, anon;
