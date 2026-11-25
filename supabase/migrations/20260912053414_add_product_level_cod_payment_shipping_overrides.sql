alter table public.website_products
  add column if not exists cod_override boolean,
  add column if not exists online_payment_override boolean,
  add column if not exists shipping_charge_override numeric;

comment on column public.website_products.cod_override is 'NULL = inherit store-wide COD setting; true/false = per-product override';
comment on column public.website_products.online_payment_override is 'NULL = inherit store-wide online payment setting; true/false = per-product override';
comment on column public.website_products.shipping_charge_override is 'NULL = inherit store-wide shipping charge; numeric = per-product override amount';
