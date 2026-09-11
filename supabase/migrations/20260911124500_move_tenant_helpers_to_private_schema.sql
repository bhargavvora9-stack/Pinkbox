create schema if not exists private;

create or replace function private.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public.companies c on c.id = p.company_id
    where p.id = (select auth.uid())
      and p.role = 'super_admin'
      and c.is_super_admin_company = true
  );
$$;

revoke all on function private.my_company_id() from public;
revoke all on function private.is_super_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.my_company_id() to anon, authenticated;
grant execute on function private.is_super_admin() to anon, authenticated;

do $$
declare r record; q text; wc text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public','storage')
      and (coalesce(qual,'') like '%my_company_id()%' or coalesce(with_check,'') like '%my_company_id()%' or coalesce(qual,'') like '%is_super_admin()%' or coalesce(with_check,'') like '%is_super_admin()%')
  loop
    q := r.qual;
    wc := r.with_check;
    if q is not null and position('private.my_company_id()' in q) = 0 then q := replace(q, 'my_company_id()', 'private.my_company_id()'); end if;
    if q is not null and position('private.is_super_admin()' in q) = 0 then q := replace(q, 'is_super_admin()', 'private.is_super_admin()'); end if;
    if wc is not null and position('private.my_company_id()' in wc) = 0 then wc := replace(wc, 'my_company_id()', 'private.my_company_id()'); end if;
    if wc is not null and position('private.is_super_admin()' in wc) = 0 then wc := replace(wc, 'is_super_admin()', 'private.is_super_admin()'); end if;
    if q is not null and wc is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', r.policyname, r.schemaname, r.tablename, q, wc);
    elsif q is not null then
      execute format('alter policy %I on %I.%I using (%s)', r.policyname, r.schemaname, r.tablename, q);
    elsif wc is not null then
      execute format('alter policy %I on %I.%I with check (%s)', r.policyname, r.schemaname, r.tablename, wc);
    end if;
  end loop;
end $$;

do $$ begin
  if to_regprocedure('public.my_company_id()') is not null then
    execute 'revoke all on function public.my_company_id() from public, anon, authenticated';
    execute 'drop function public.my_company_id()';
  end if;
  if to_regprocedure('public.is_super_admin()') is not null then
    execute 'revoke all on function public.is_super_admin() from public, anon, authenticated';
    execute 'drop function public.is_super_admin()';
  end if;
end $$;
