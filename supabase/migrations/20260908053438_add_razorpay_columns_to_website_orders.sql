alter table public.website_orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_signature text;

create index if not exists website_orders_razorpay_order_id_idx on public.website_orders(razorpay_order_id);
