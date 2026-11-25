create table if not exists public.website_seo_redirects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  from_path text not null,
  to_path text not null,
  status_code integer not null default 301,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_seo_redirects_status_code_check check (status_code in (301,302,307,308))
);
create index if not exists website_seo_redirects_company_idx on public.website_seo_redirects(company_id);
create unique index if not exists website_seo_redirects_company_from_idx on public.website_seo_redirects(company_id,from_path);
