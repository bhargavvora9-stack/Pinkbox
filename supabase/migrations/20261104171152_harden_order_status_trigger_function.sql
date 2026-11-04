ALTER FUNCTION public.validate_website_order_status_value() SET search_path = '';
REVOKE ALL ON FUNCTION public.validate_website_order_status_value() FROM PUBLIC, anon, authenticated;
