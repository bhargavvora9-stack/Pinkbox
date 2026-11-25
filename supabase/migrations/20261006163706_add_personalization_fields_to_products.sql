alter table public.website_products
  add column if not exists requires_personalization boolean default false,
  add column if not exists personalization_label text default 'Name for embroidery';
comment on column public.website_products.requires_personalization is 'If true, storefront shows a personalization text field before Add to Cart';
