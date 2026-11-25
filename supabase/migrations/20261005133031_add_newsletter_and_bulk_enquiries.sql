create table if not exists public.website_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  coupon_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,email)
);

create table if not exists public.website_bulk_enquiries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  company_name text,
  phone text not null,
  email text,
  organisation_type text,
  quantity text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.website_newsletter_subscribers enable row level security;
alter table public.website_bulk_enquiries enable row level security;

revoke all on public.website_newsletter_subscribers from anon, authenticated;
revoke all on public.website_bulk_enquiries from anon, authenticated;
grant all on public.website_newsletter_subscribers to service_role;
grant all on public.website_bulk_enquiries to service_role;
