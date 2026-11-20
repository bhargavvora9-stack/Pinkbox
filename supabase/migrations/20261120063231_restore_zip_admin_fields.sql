-- Restore the admin data fields present in the original PinkBox ZIP.
-- All additions are nullable (or have a safe false default); existing rows are preserved.

alter table public.website_settings
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists announcement_text text;

alter table public.website_newsletter_subscribers
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists source text;

alter table public.website_bulk_enquiries
  add column if not exists city text,
  add column if not exists lead_type text,
  add column if not exists notes text;

alter table public.website_blog_posts
  add column if not exists category text;
