set local lock_timeout = '5s';
alter table if exists public.website_products drop column if exists crm_product_id;
