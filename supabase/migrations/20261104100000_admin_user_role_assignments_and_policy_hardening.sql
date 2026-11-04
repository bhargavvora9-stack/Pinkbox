create table if not exists public.website_user_role_assignments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.website_roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_user_role_assignments_company_user_key unique (company_id, user_id)
);
create index if not exists website_user_role_assignments_role_idx on public.website_user_role_assignments(company_id, role_id);
alter table public.website_user_role_assignments enable row level security;
drop policy if exists website_user_role_assignments_select on public.website_user_role_assignments;
create policy website_user_role_assignments_select on public.website_user_role_assignments for select to authenticated using (company_id = private.my_company_id() or private.is_super_admin());
revoke all on public.website_user_role_assignments from anon, authenticated;
grant select on public.website_user_role_assignments to authenticated;
drop policy if exists website_roles_insert on public.website_roles;
drop policy if exists website_roles_update on public.website_roles;
drop policy if exists website_roles_delete on public.website_roles;
create policy website_roles_insert on public.website_roles for insert to authenticated with check (company_id = private.my_company_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = website_roles.company_id and p.active = true and p.role in ('admin','super_admin')));
create policy website_roles_update on public.website_roles for update to authenticated using (company_id = private.my_company_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = website_roles.company_id and p.active = true and p.role in ('admin','super_admin'))) with check (company_id = private.my_company_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = website_roles.company_id and p.active = true and p.role in ('admin','super_admin')));
create policy website_roles_delete on public.website_roles for delete to authenticated using (company_id = private.my_company_id() and is_system = false and exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = website_roles.company_id and p.active = true and p.role in ('admin','super_admin')));
create or replace function public.assign_website_user_role(p_company_id uuid,p_user_id uuid,p_role_id uuid) returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare v_actor public.profiles%rowtype; v_target public.profiles%rowtype;
begin
 select * into v_actor from public.profiles where id = auth.uid() for share;
 if v_actor.id is null or v_actor.company_id <> p_company_id or v_actor.active is not true or v_actor.role not in ('admin','super_admin') then raise exception 'Only an active company admin can assign roles' using errcode = '42501'; end if;
 select * into v_target from public.profiles where id = p_user_id and company_id = p_company_id and active = true for share;
 if v_target.id is null then raise exception 'Active company staff member not found' using errcode = 'P0002'; end if;
 if v_target.role in ('admin','super_admin') then raise exception 'Administrator roles cannot be changed here' using errcode = '42501'; end if;
 if p_role_id is null then delete from public.website_user_role_assignments where company_id = p_company_id and user_id = p_user_id; return jsonb_build_object('user_id',p_user_id,'role_id',null); end if;
 if not exists (select 1 from public.website_roles where id = p_role_id and company_id = p_company_id) then raise exception 'Role not found for this company' using errcode = 'P0002'; end if;
 insert into public.website_user_role_assignments(company_id,user_id,role_id,assigned_by,updated_at) values (p_company_id,p_user_id,p_role_id,auth.uid(),now())
 on conflict (company_id,user_id) do update set role_id=excluded.role_id,assigned_by=excluded.assigned_by,updated_at=now();
 return jsonb_build_object('user_id',p_user_id,'role_id',p_role_id);
end; $$;
revoke all on function public.assign_website_user_role(uuid,uuid,uuid) from public, anon;
grant execute on function public.assign_website_user_role(uuid,uuid,uuid) to authenticated;
