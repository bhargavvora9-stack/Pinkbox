alter table public.website_products
  add column if not exists personalization_enabled boolean not null default false,
  add column if not exists personalization_required boolean not null default false;
