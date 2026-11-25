create table if not exists public.website_roles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  permissions jsonb not null default '{"view":true,"create":false,"update":false,"delete":false}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);
create index if not exists website_roles_company_id_idx on public.website_roles(company_id);
alter table public.website_roles enable row level security;
drop policy if exists website_roles_select on public.website_roles;
drop policy if exists website_roles_insert on public.website_roles;
drop policy if exists website_roles_update on public.website_roles;
drop policy if exists website_roles_delete on public.website_roles;
create policy website_roles_select on public.website_roles for select to authenticated using (company_id = public.my_company_id());
create policy website_roles_insert on public.website_roles for insert to authenticated with check (company_id = public.my_company_id());
create policy website_roles_update on public.website_roles for update to authenticated using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy website_roles_delete on public.website_roles for delete to authenticated using (company_id = public.my_company_id() and is_system = false);
grant select,insert,update,delete on public.website_roles to authenticated;
