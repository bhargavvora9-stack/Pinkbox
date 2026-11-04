REVOKE ALL ON FUNCTION public.adjust_website_inventory(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_website_inventory(uuid, uuid, numeric, text) TO authenticated;
