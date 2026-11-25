alter table public.website_order_items
  add column if not exists variant_id uuid references public.website_product_variants(id) on delete set null,
  add column if not exists variant_title text;
