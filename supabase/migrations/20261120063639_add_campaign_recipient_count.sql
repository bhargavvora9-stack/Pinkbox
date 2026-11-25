alter table public.website_campaigns
  add column if not exists recipient_count integer not null default 0;
