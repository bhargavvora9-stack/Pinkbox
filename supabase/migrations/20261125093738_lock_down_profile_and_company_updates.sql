-- Remove broad data-change privileges from untrusted client roles.
revoke insert, update, delete, truncate, references, trigger
  on table public.profiles from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.companies from anon, authenticated;

-- Clear any separately granted column-level UPDATE privileges too.
revoke update (id, company_id, display_name, role, active, created_at)
  on table public.profiles from anon, authenticated;
revoke update (id, name, theme_color, logo_url, subscription_status,
               subscription_expires_on, is_super_admin_company, created_at, updated_at)
  on table public.companies from anon, authenticated;

-- Allow only a user's display name to be edited from the client.
grant update (display_name) on table public.profiles to authenticated;

-- Only company admins may edit non-sensitive display settings.
grant update (name, theme_color, logo_url, updated_at)
  on table public.companies to authenticated;

-- A user may update only their own profile row.
alter policy profiles_update on public.profiles
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Only an active company admin (or designated super admin) may edit company settings.
alter policy company_update on public.companies
  to authenticated
  using (
    (
      id = (select private.my_company_id())
      and exists (
        select 1
        from public.profiles as actor
        where actor.id = (select auth.uid())
          and actor.company_id = companies.id
          and actor.active is true
          and actor.role in ('admin', 'super_admin')
      )
    )
    or (select private.is_super_admin())
  )
  with check (
    (
      id = (select private.my_company_id())
      and exists (
        select 1
        from public.profiles as actor
        where actor.id = (select auth.uid())
          and actor.company_id = companies.id
          and actor.active is true
          and actor.role in ('admin', 'super_admin')
      )
    )
    or (select private.is_super_admin())
  );
