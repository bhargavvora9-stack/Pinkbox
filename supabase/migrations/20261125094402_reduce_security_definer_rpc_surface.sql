alter function public.adjust_website_inventory(uuid, uuid, numeric, text)
  security invoker;

alter function public.adjust_website_variant_stock(uuid, uuid, numeric, text, uuid)
  security invoker;

alter function public.get_website_dashboard_stats(uuid)
  security invoker;

alter function public.has_website_admin_permission(uuid, uuid, text, text)
  security invoker;

alter function public.replace_website_product_links(uuid, uuid, text, uuid[])
  security invoker;

alter function public.update_website_order_status(uuid, uuid, text, text)
  security invoker;

-- Role assignment writes are intentionally restricted to this audited RPC.
alter function public.assign_website_user_role(uuid, uuid, uuid)
  security definer;
