drop policy if exists website_roles_insert on public.website_roles;
create policy website_roles_insert on public.website_roles
for insert to authenticated
with check (
  company_id = (select private.my_company_id())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.company_id = website_roles.company_id
      and p.active = true
      and p.role in ('admin','super_admin')
  )
);

drop policy if exists website_roles_select on public.website_roles;
create policy website_roles_select on public.website_roles
for select to authenticated
using (company_id = (select private.my_company_id()));

drop policy if exists website_roles_update on public.website_roles;
create policy website_roles_update on public.website_roles
for update to authenticated
using (
  company_id = (select private.my_company_id())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.company_id = website_roles.company_id
      and p.active = true
      and p.role in ('admin','super_admin')
  )
)
with check (
  company_id = (select private.my_company_id())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.company_id = website_roles.company_id
      and p.active = true
      and p.role in ('admin','super_admin')
  )
);

drop policy if exists website_roles_delete on public.website_roles;
create policy website_roles_delete on public.website_roles
for delete to authenticated
using (
  company_id = (select private.my_company_id())
  and is_system = false
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.company_id = website_roles.company_id
      and p.active = true
      and p.role in ('admin','super_admin')
  )
);

create index if not exists idx_fk_profiles_company_id on public.profiles (company_id);
create index if not exists idx_fk_website_audit_logs_company_id on public.website_audit_logs (company_id);
create index if not exists idx_fk_website_audit_logs_user_id on public.website_audit_logs (user_id);
create index if not exists idx_fk_website_automations_company_id on public.website_automations (company_id);
create index if not exists idx_fk_website_bulk_enquiries_company_id on public.website_bulk_enquiries (company_id);
create index if not exists idx_fk_website_campaigns_company_id on public.website_campaigns (company_id);
create index if not exists idx_fk_website_categories_parent_id on public.website_categories (parent_id);
create index if not exists idx_fk_website_inventory_transactions_created_by on public.website_inventory_transactions (created_by);
create index if not exists idx_fk_website_inventory_transactions_product_id on public.website_inventory_transactions (product_id);
create index if not exists idx_fk_website_inventory_transactions_variant_id on public.website_inventory_transactions (variant_id);
create index if not exists idx_fk_website_notification_logs_company_id on public.website_notification_logs (company_id);
create index if not exists idx_fk_website_order_items_product_id on public.website_order_items (product_id);
create index if not exists idx_fk_website_order_items_variant_id on public.website_order_items (variant_id);
create index if not exists idx_fk_website_order_status_history_company_id on public.website_order_status_history (company_id);
create index if not exists idx_fk_website_order_status_history_created_by on public.website_order_status_history (created_by);
create index if not exists idx_fk_website_order_status_history_order_id on public.website_order_status_history (order_id);
create index if not exists idx_fk_website_orders_customer_id on public.website_orders (customer_id);
create index if not exists idx_fk_website_product_categories_category_id on public.website_product_categories (category_id);
create index if not exists idx_fk_website_product_categories_company_id on public.website_product_categories (company_id);
create index if not exists idx_fk_website_product_collections_collection_id on public.website_product_collections (collection_id);
create index if not exists idx_fk_website_product_collections_company_id on public.website_product_collections (company_id);
create index if not exists idx_fk_website_product_images_company_id on public.website_product_images (company_id);
create index if not exists idx_fk_website_product_images_product_id on public.website_product_images (product_id);
create index if not exists idx_fk_website_product_reviews_company_id on public.website_product_reviews (company_id);
create index if not exists idx_fk_website_product_reviews_customer_id on public.website_product_reviews (customer_id);
create index if not exists idx_fk_website_product_reviews_product_id on public.website_product_reviews (product_id);
create index if not exists idx_fk_website_product_variants_company_id on public.website_product_variants (company_id);
create index if not exists idx_fk_website_product_variants_product_id on public.website_product_variants (product_id);
create index if not exists idx_fk_website_shipping_methods_company_id on public.website_shipping_methods (company_id);
create index if not exists idx_fk_website_shipping_rules_company_id on public.website_shipping_rules (company_id);
create index if not exists idx_fk_website_shipping_rules_method_id on public.website_shipping_rules (method_id);
create index if not exists idx_fk_website_shipping_rules_zone_id on public.website_shipping_rules (zone_id);
create index if not exists idx_fk_website_shipping_zones_company_id on public.website_shipping_zones (company_id);
create index if not exists idx_fk_website_user_role_assignments_assigned_by on public.website_user_role_assignments (assigned_by);
create index if not exists idx_fk_website_user_role_assignments_role_id on public.website_user_role_assignments (role_id);
create index if not exists idx_fk_website_user_role_assignments_user_id on public.website_user_role_assignments (user_id);
