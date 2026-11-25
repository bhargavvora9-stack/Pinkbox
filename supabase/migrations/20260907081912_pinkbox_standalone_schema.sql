-- ============================================================
-- Pinkbox — standalone Supabase schema
-- companies/profiles/customers core + full website module
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  theme_color text default '#ec4899',
  logo_url text,
  subscription_status text not null default 'active',
  subscription_expires_on date,
  is_super_admin_company boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  display_name text not null,
  role text not null default 'staff',
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_name text not null,
  phone1 text,
  email text,
  address text,
  pincode text,
  city text,
  state text,
  gstin text,
  extra_fields jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_customers_company on customers(company_id);

create or replace function my_company_id() returns uuid as $$
  select company_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_super_admin() returns boolean as $$
  select exists (
    select 1 from profiles p
    join companies c on c.id = p.company_id
    where p.id = auth.uid() and p.role = 'super_admin' and c.is_super_admin_company = true
  );
$$ language sql stable security definer;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;

drop policy if exists company_select on companies;
drop policy if exists company_update on companies;
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_update on profiles;
drop policy if exists customers_isolation on customers;

create policy company_select on companies for select using (id = my_company_id() or is_super_admin());
create policy company_update on companies for update using (id = my_company_id() or is_super_admin());
create policy profiles_select on profiles for select using (company_id = my_company_id() or is_super_admin());
create policy profiles_update on profiles for update using (company_id = my_company_id() or is_super_admin()) with check (company_id = my_company_id() or is_super_admin());
create policy customers_isolation on customers for all using (company_id = my_company_id() or is_super_admin()) with check (company_id = my_company_id() or is_super_admin());

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, company_id, display_name, role)
  values (
    new.id,
    (new.raw_user_meta_data->>'company_id')::uuid,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table if not exists website_settings (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  website_name text not null default 'PinkBox', slug text not null default 'pinkbox', logo_url text, favicon_url text,
  whatsapp_number text, phone text, email text, address text, gstin text, currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata', cod_enabled boolean not null default true, online_payment_enabled boolean not null default false,
  shipping_enabled boolean not null default true, free_shipping_threshold numeric not null default 0, default_shipping_charge numeric not null default 0,
  meta_title text, meta_description text, status text not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id), unique(company_id, slug)
);
create table if not exists website_categories (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  parent_id uuid references website_categories(id) on delete set null, name text not null, slug text not null, description text, image_url text,
  sort_order int not null default 0, is_active boolean not null default true, seo_title text, seo_description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, slug)
);
create table if not exists website_products (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  crm_product_id uuid, sku text not null, title text not null, slug text not null,
  short_description text, description text, brand text, price numeric not null default 0, compare_at_price numeric, cost_price numeric,
  gst_percent numeric not null default 0, hsn_code text, barcode text, weight numeric, stock_quantity numeric not null default 0,
  low_stock_threshold numeric not null default 5, track_inventory boolean not null default true, allow_backorder boolean not null default false,
  featured boolean not null default false, is_active boolean not null default true, seo_title text, seo_description text, seo_keywords text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, sku), unique(company_id, slug)
);
create table if not exists website_product_images (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references website_products(id) on delete cascade, image_url text not null, alt_text text,
  sort_order int not null default 0, is_primary boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists website_product_categories (
  company_id uuid not null references companies(id) on delete cascade, product_id uuid not null references website_products(id) on delete cascade,
  category_id uuid not null references website_categories(id) on delete cascade, primary key(product_id, category_id)
);
create table if not exists website_orders (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  order_number text not null, customer_id uuid references customers(id) on delete set null, customer_name text not null,
  customer_phone text, customer_email text, shipping_address jsonb not null default '{}', billing_address jsonb not null default '{}',
  subtotal numeric not null default 0, discount_amount numeric not null default 0, shipping_amount numeric not null default 0,
  tax_amount numeric not null default 0, total_amount numeric not null default 0, payment_method text not null default 'COD',
  payment_status text not null default 'pending', order_status text not null default 'new', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, order_number)
);
create table if not exists website_order_items (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  order_id uuid not null references website_orders(id) on delete cascade, product_id uuid references website_products(id) on delete set null,
  product_name text not null, sku text, quantity numeric not null default 1, unit_price numeric not null default 0,
  discount_amount numeric not null default 0, tax_amount numeric not null default 0, line_total numeric not null default 0
);
create table if not exists website_order_status_history (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  order_id uuid not null references website_orders(id) on delete cascade, status text not null, note text,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists website_pages (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  title text not null, slug text not null, content jsonb not null default '{}', seo_title text, seo_description text,
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, slug)
);
create table if not exists website_banners (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  title text, subtitle text, image_url text, mobile_image_url text, button_text text, button_url text,
  sort_order int not null default 0, is_active boolean not null default true, starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_homepage_sections (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  section_type text not null, title text, settings jsonb not null default '{}', sort_order int not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_menus (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  location text not null default 'header', name text not null, items jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, location)
);
create table if not exists website_discounts (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, code text, discount_type text not null default 'percentage', value numeric not null default 0,
  minimum_order_amount numeric not null default 0, maximum_discount_amount numeric, usage_limit int, usage_count int not null default 0,
  starts_at timestamptz, ends_at timestamptz, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, code)
);
create table if not exists website_audit_logs (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, action text not null, entity_type text, entity_id uuid,
  old_data jsonb, new_data jsonb, created_at timestamptz not null default now()
);

create table if not exists website_brands (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, slug text not null, logo_url text, description text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, slug)
);
create table if not exists website_collections (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, slug text not null, description text, image_url text, sort_order int not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, slug)
);
create table if not exists website_product_collections (
  company_id uuid not null references companies(id) on delete cascade, product_id uuid not null references website_products(id) on delete cascade,
  collection_id uuid not null references website_collections(id) on delete cascade, primary key(product_id, collection_id)
);
create table if not exists website_product_variants (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references website_products(id) on delete cascade, sku text not null, title text not null,
  option_values jsonb not null default '{}', price numeric not null default 0, compare_at_price numeric, cost_price numeric,
  stock_quantity numeric not null default 0, low_stock_threshold numeric not null default 5, barcode text, weight numeric,
  image_url text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_product_reviews (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references website_products(id) on delete cascade, customer_id uuid references customers(id) on delete set null,
  customer_name text, rating int not null, title text, review_text text, is_approved boolean not null default false, is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists website_shipping_methods (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, description text, rate numeric not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_shipping_zones (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, states jsonb not null default '[]', pincodes jsonb not null default '[]', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_shipping_rules (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  zone_id uuid references website_shipping_zones(id) on delete cascade, method_id uuid references website_shipping_methods(id) on delete cascade,
  min_order_amount numeric not null default 0, rate numeric not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_payment_methods (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, provider text, is_active boolean not null default true, config jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_abandoned_carts (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  customer_name text, customer_phone text, customer_email text, cart_items jsonb not null default '[]', total_amount numeric not null default 0,
  recovered boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists website_theme_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  primary_color text default '#ec4899', secondary_color text, font_family text, settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists website_seo_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  default_meta_title text, default_meta_description text, robots_txt text, sitemap_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists website_blog_posts (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  title text not null, slug text not null, excerpt text, content jsonb not null default '{}', cover_image_url text,
  is_published boolean not null default false, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id, slug)
);
create table if not exists website_footer_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  columns jsonb not null default '[]', social_links jsonb not null default '{}', copyright_text text, updated_at timestamptz not null default now()
);

create table if not exists website_campaigns (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, channel text not null default 'whatsapp', status text not null default 'draft', message text,
  scheduled_at timestamptz, sent_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists website_notification_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  order_confirmation boolean not null default true, shipping_updates boolean not null default true, abandoned_cart_reminder boolean not null default false,
  settings jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists website_notification_logs (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  channel text not null, recipient text, subject text, status text not null default 'sent', error text, created_at timestamptz not null default now()
);

create table if not exists website_automations (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  name text not null, trigger_type text not null, action_type text not null, config jsonb not null default '{}', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists website_inventory_transactions (
  id uuid primary key default uuid_generate_v4(), company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references website_products(id) on delete cascade, change_quantity numeric not null,
  quantity_before numeric not null default 0, quantity_after numeric not null default 0, reason text, reference_type text, reference_id uuid,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create index if not exists idx_web_products_company on website_products(company_id);
create index if not exists idx_web_orders_company_status on website_orders(company_id, order_status, created_at desc);
create index if not exists idx_web_order_items_order on website_order_items(order_id);
create index if not exists idx_web_banners_company on website_banners(company_id, sort_order);
create index if not exists idx_web_sections_company on website_homepage_sections(company_id, sort_order);
create index if not exists idx_web_inventory_company_product on website_inventory_transactions(company_id, product_id, created_at desc);

do $$ declare t text; begin
  foreach t in array array[
    'website_settings','website_categories','website_products','website_product_images','website_product_categories',
    'website_orders','website_order_items','website_order_status_history','website_pages','website_banners',
    'website_homepage_sections','website_menus','website_discounts','website_audit_logs',
    'website_brands','website_collections','website_product_collections','website_product_variants','website_product_reviews',
    'website_shipping_methods','website_shipping_zones','website_shipping_rules','website_payment_methods','website_abandoned_carts',
    'website_theme_settings','website_seo_settings','website_blog_posts','website_footer_settings',
    'website_campaigns','website_notification_settings','website_notification_logs',
    'website_automations','website_inventory_transactions'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_tenant_all', t);
    execute format('create policy %I on %I for all using (company_id = my_company_id() or is_super_admin()) with check (company_id = my_company_id() or is_super_admin())', t || '_tenant_all', t);
  end loop;
end $$;

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
grant execute on function my_company_id() to authenticated, anon;
grant execute on function is_super_admin() to authenticated, anon;
