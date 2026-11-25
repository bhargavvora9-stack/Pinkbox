
revoke all privileges on table
  public.website_orders,
  public.website_order_items,
  public.website_order_status_history,
  public.website_inventory_transactions
from public, anon, authenticated;

grant select, insert, update, delete
  on table public.website_orders
  to authenticated;

grant select
  on table public.website_order_items
  to authenticated;

grant select, insert
  on table public.website_order_status_history
  to authenticated;

grant select, insert
  on table public.website_inventory_transactions
  to authenticated;

alter function public.cancel_website_online_order(uuid, text)
  set search_path = '';

alter function public.place_website_order(uuid, text, text, text, jsonb, jsonb, text, text, text)
  set search_path = '';

alter function public.restore_website_order_stock_on_terminal_status()
  set search_path = '';

alter function public.release_website_order_coupon_on_cancel()
  set search_path = '';

alter function public.set_website_order_tracking_token()
  set search_path = '';
