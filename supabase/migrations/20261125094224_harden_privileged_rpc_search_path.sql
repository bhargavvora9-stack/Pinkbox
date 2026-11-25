alter function public.adjust_website_inventory(uuid, uuid, numeric, text)
  set search_path = '';

alter function public.adjust_website_variant_stock(uuid, uuid, numeric, text, uuid)
  set search_path = '';

alter function public.assign_website_user_role(uuid, uuid, uuid)
  set search_path = '';

alter function public.get_website_dashboard_stats(uuid)
  set search_path = '';

alter function public.has_website_admin_permission(uuid, uuid, text, text)
  set search_path = '';

alter function public.replace_website_product_links(uuid, uuid, text, uuid[])
  set search_path = '';

alter function public.update_website_order_status(uuid, uuid, text, text)
  set search_path = '';
