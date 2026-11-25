DROP POLICY IF EXISTS "website_abandoned_carts_tenant_all" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_tenant_select" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_module_select" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_tenant_select" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_module_insert" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_tenant_select" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_module_update" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_tenant_select" ON public.website_abandoned_carts;
DROP POLICY IF EXISTS "website_abandoned_carts_module_delete" ON public.website_abandoned_carts;
CREATE POLICY "website_abandoned_carts_tenant_select" ON public.website_abandoned_carts FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_audit_logs_tenant_all" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_tenant_select" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_module_select" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_tenant_select" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_module_insert" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_tenant_select" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_module_update" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_tenant_select" ON public.website_audit_logs;
DROP POLICY IF EXISTS "website_audit_logs_module_delete" ON public.website_audit_logs;
CREATE POLICY "website_audit_logs_tenant_select" ON public.website_audit_logs FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_inventory_transactions_tenant_all" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_tenant_select" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_module_select" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_tenant_select" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_module_insert" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_tenant_select" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_module_update" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_tenant_select" ON public.website_inventory_transactions;
DROP POLICY IF EXISTS "website_inventory_transactions_module_delete" ON public.website_inventory_transactions;
CREATE POLICY "website_inventory_transactions_tenant_select" ON public.website_inventory_transactions FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_order_items_tenant_all" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_tenant_select" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_module_select" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_tenant_select" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_module_insert" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_tenant_select" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_module_update" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_tenant_select" ON public.website_order_items;
DROP POLICY IF EXISTS "website_order_items_module_delete" ON public.website_order_items;
CREATE POLICY "website_order_items_tenant_select" ON public.website_order_items FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_order_status_history_tenant_all" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_tenant_select" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_module_select" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_tenant_select" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_module_insert" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_tenant_select" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_module_update" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_tenant_select" ON public.website_order_status_history;
DROP POLICY IF EXISTS "website_order_status_history_module_delete" ON public.website_order_status_history;
CREATE POLICY "website_order_status_history_tenant_select" ON public.website_order_status_history FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_orders_tenant_all" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_tenant_select" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_module_select" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_tenant_select" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_module_insert" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_tenant_select" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_module_update" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_tenant_select" ON public.website_orders;
DROP POLICY IF EXISTS "website_orders_module_delete" ON public.website_orders;
CREATE POLICY "website_orders_tenant_select" ON public.website_orders FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_products_tenant_all" ON public.website_products;
DROP POLICY IF EXISTS "website_products_tenant_select" ON public.website_products;
DROP POLICY IF EXISTS "website_products_module_select" ON public.website_products;
DROP POLICY IF EXISTS "website_products_tenant_select" ON public.website_products;
DROP POLICY IF EXISTS "website_products_module_insert" ON public.website_products;
DROP POLICY IF EXISTS "website_products_tenant_select" ON public.website_products;
DROP POLICY IF EXISTS "website_products_module_update" ON public.website_products;
DROP POLICY IF EXISTS "website_products_tenant_select" ON public.website_products;
DROP POLICY IF EXISTS "website_products_module_delete" ON public.website_products;
CREATE POLICY "website_products_tenant_select" ON public.website_products FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_product_variants_tenant_all" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_tenant_select" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_module_select" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_tenant_select" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_module_insert" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_tenant_select" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_module_update" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_tenant_select" ON public.website_product_variants;
DROP POLICY IF EXISTS "website_product_variants_module_delete" ON public.website_product_variants;
CREATE POLICY "website_product_variants_tenant_select" ON public.website_product_variants FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
DROP POLICY IF EXISTS "website_settings_tenant_all" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_tenant_select" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_module_select" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_tenant_select" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_module_insert" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_tenant_select" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_module_update" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_tenant_select" ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_module_delete" ON public.website_settings;
CREATE POLICY "website_settings_tenant_select" ON public.website_settings FOR SELECT TO authenticated USING (company_id = private.my_company_id() OR private.is_super_admin());
CREATE POLICY "website_abandoned_carts_module_insert" ON public.website_abandoned_carts FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'abandoned_carts','create'));
CREATE POLICY "website_abandoned_carts_module_update" ON public.website_abandoned_carts FOR UPDATE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'abandoned_carts','update')) WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'abandoned_carts','update'));
CREATE POLICY "website_abandoned_carts_module_delete" ON public.website_abandoned_carts FOR DELETE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'abandoned_carts','delete'));
CREATE POLICY "website_audit_logs_append_own" ON public.website_audit_logs FOR INSERT TO authenticated WITH CHECK (user_id=(select auth.uid()) AND company_id=private.my_company_id() AND public.has_website_admin_permission(company_id,(select auth.uid()),'dashboard','view'));
CREATE POLICY "website_audit_logs_module_select" ON public.website_audit_logs FOR SELECT TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'audit_log','view'));
CREATE POLICY "website_inventory_transactions_module_insert" ON public.website_inventory_transactions FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','update') AND created_by=(select auth.uid()));
CREATE POLICY "website_order_status_history_module_insert" ON public.website_order_status_history FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'orders','update') AND created_by=(select auth.uid()));
CREATE POLICY "website_orders_module_insert" ON public.website_orders FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'orders','create'));
CREATE POLICY "website_orders_module_update" ON public.website_orders FOR UPDATE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'orders','update')) WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'orders','update'));
CREATE POLICY "website_orders_module_delete" ON public.website_orders FOR DELETE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'orders','delete'));
CREATE POLICY "website_products_module_insert" ON public.website_products FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'products','create') OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','create'));
CREATE POLICY "website_products_module_update" ON public.website_products FOR UPDATE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'products','update') OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','create') OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','update') OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','update')) WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'products','update') OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','create') OR public.has_website_admin_permission(company_id,(select auth.uid()),'import_export','update') OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','update'));
CREATE POLICY "website_products_module_delete" ON public.website_products FOR DELETE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'products','delete'));
CREATE POLICY "website_product_variants_module_insert" ON public.website_product_variants FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'variants','create'));
CREATE POLICY "website_product_variants_module_update" ON public.website_product_variants FOR UPDATE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'variants','update') OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','update')) WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'variants','update') OR public.has_website_admin_permission(company_id,(select auth.uid()),'inventory','update'));
CREATE POLICY "website_product_variants_module_delete" ON public.website_product_variants FOR DELETE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'variants','delete'));
CREATE POLICY "website_settings_module_insert" ON public.website_settings FOR INSERT TO authenticated WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'settings','update'));
CREATE POLICY "website_settings_module_update" ON public.website_settings FOR UPDATE TO authenticated USING (public.has_website_admin_permission(company_id,(select auth.uid()),'settings','update')) WITH CHECK (public.has_website_admin_permission(company_id,(select auth.uid()),'settings','update'));

CREATE OR REPLACE FUNCTION private.guard_website_stock_column_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_module text;
  v_can_manage boolean := false;
  v_can_inventory boolean := false;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  v_module := CASE WHEN TG_TABLE_NAME = 'website_products' THEN 'products' ELSE 'variants' END;
  v_can_manage := public.has_website_admin_permission(NEW.company_id, auth.uid(), v_module, 'update');

  IF TG_TABLE_NAME = 'website_products' THEN
    v_can_manage := v_can_manage
      OR public.has_website_admin_permission(NEW.company_id, auth.uid(), 'import_export', 'create')
      OR public.has_website_admin_permission(NEW.company_id, auth.uid(), 'import_export', 'update');
  END IF;

  v_can_inventory := public.has_website_admin_permission(NEW.company_id, auth.uid(), 'inventory', 'update');

  IF NOT v_can_manage AND NOT v_can_inventory THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  IF v_can_manage AND v_can_inventory THEN
    RETURN NEW;
  ELSIF v_can_manage THEN
    IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
      RAISE EXCEPTION 'Inventory permission is required to change stock_quantity.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  ELSE
    IF (to_jsonb(NEW) - ARRAY['stock_quantity','updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['stock_quantity','updated_at']) THEN
      RAISE EXCEPTION 'Product or variant permission is required to change non-stock fields.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS website_products_guard_stock_update ON public.website_products;
CREATE TRIGGER website_products_guard_stock_update
BEFORE UPDATE ON public.website_products
FOR EACH ROW EXECUTE FUNCTION private.guard_website_stock_column_updates();

DROP TRIGGER IF EXISTS website_product_variants_guard_stock_update ON public.website_product_variants;
CREATE TRIGGER website_product_variants_guard_stock_update
BEFORE UPDATE ON public.website_product_variants
FOR EACH ROW EXECUTE FUNCTION private.guard_website_stock_column_updates();

ALTER FUNCTION public.adjust_website_stock(uuid,uuid,numeric,text,uuid) SET search_path = '';
