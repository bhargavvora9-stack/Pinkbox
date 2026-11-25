-- Admin-only, tenant-scoped access for Leads and Subscribers.
-- Public storefront submissions continue to use the server-side service role client.
create policy website_bulk_enquiries_admin_select
on public.website_bulk_enquiries
for select
to authenticated
using (public.has_website_admin_permission(company_id, (select auth.uid()), 'b2b_enquiries', 'view'));

create policy website_bulk_enquiries_admin_insert
on public.website_bulk_enquiries
for insert
to authenticated
with check (public.has_website_admin_permission(company_id, (select auth.uid()), 'b2b_enquiries', 'create'));

create policy website_bulk_enquiries_admin_update
on public.website_bulk_enquiries
for update
to authenticated
using (public.has_website_admin_permission(company_id, (select auth.uid()), 'b2b_enquiries', 'update'))
with check (public.has_website_admin_permission(company_id, (select auth.uid()), 'b2b_enquiries', 'update'));

create policy website_bulk_enquiries_admin_delete
on public.website_bulk_enquiries
for delete
to authenticated
using (public.has_website_admin_permission(company_id, (select auth.uid()), 'b2b_enquiries', 'delete'));

create policy website_newsletter_subscribers_admin_select
on public.website_newsletter_subscribers
for select
to authenticated
using (public.has_website_admin_permission(company_id, (select auth.uid()), 'notifications', 'view'));

create policy website_newsletter_subscribers_admin_insert
on public.website_newsletter_subscribers
for insert
to authenticated
with check (public.has_website_admin_permission(company_id, (select auth.uid()), 'notifications', 'create'));

create policy website_newsletter_subscribers_admin_update
on public.website_newsletter_subscribers
for update
to authenticated
using (public.has_website_admin_permission(company_id, (select auth.uid()), 'notifications', 'update'))
with check (public.has_website_admin_permission(company_id, (select auth.uid()), 'notifications', 'update'));

create policy website_newsletter_subscribers_admin_delete
on public.website_newsletter_subscribers
for delete
to authenticated
using (public.has_website_admin_permission(company_id, (select auth.uid()), 'notifications', 'delete'));
