drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using ((id = (select auth.uid())) or (company_id = my_company_id()) or is_super_admin());

-- Keep profile updates restricted to authenticated users in their own company / super-admin scope.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using ((id = (select auth.uid())) or (company_id = my_company_id()) or is_super_admin())
with check ((id = (select auth.uid())) or (company_id = my_company_id()) or is_super_admin());
