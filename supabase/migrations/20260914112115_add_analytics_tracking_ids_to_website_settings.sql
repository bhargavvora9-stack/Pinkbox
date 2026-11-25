alter table public.website_settings
  add column if not exists ga4_measurement_id text,
  add column if not exists meta_pixel_id text;
comment on column public.website_settings.ga4_measurement_id is 'Google Analytics 4 Measurement ID, e.g. G-XXXXXXX';
comment on column public.website_settings.meta_pixel_id is 'Meta (Facebook) Pixel ID';
