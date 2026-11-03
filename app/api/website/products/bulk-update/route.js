import { createAdminClient } from '@/lib/supabase-admin';
import { getWebsiteAdminContext, jsonError, audit } from '@/lib/website-admin';
import { runWebsiteAutomations } from '@/lib/website-automation';

const MAX_PRODUCTS = 200;
const FIELDS = new Set([
  'brand','price','compare_at_price','cost_price','gst_percent','low_stock_threshold',
  'track_inventory','allow_backorder','featured','is_active','cod_override',
  'online_payment_override','shipping_charge_override','stock_quantity'
]);

const booleanFields = new Set(['track_inventory','allow_backorder','featured','is_active','cod_override','online_payment_override']);
const numericFields = new Set(['price','compare_at_price','cost_price','gst_percent','low_stock_threshold','shipping_charge_override','stock_quantity']);
const nullableFields = new Set(['cod_override','online_payment_override']);

function validateValue(field, value){
  if(nullableFields.has(field)){
    if(value !== null && typeof value !== 'boolean') throw new Error(`${field} must be true, false, or null.`);
    return value;
  }
  if(booleanFields.has(field) && typeof value !== 'boolean') throw new Error(`${field} must be boolean.`);
  if(numericFields.has(field)){
    const n = Number(value);
    if(!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number.`);
    return n;
  }
  if(field === 'brand'){
    if(typeof value !== 'string') throw new Error('Brand must be text.');
    return value.trim().slice(0,120);
  }
  return value;
}

export async function PATCH(request){
  const ctx = await getWebsiteAdminContext();
  if(ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { companyId, user, supabase } = ctx;
  const body = await request.json().catch(()=>null);
  if(!body?.product_ids || !Array.isArray(body.product_ids)) return jsonError('product_ids array is required.');
  if(body.product_ids.length < 1) return jsonError('Select at least one product.');
  if(body.product_ids.length > MAX_PRODUCTS) return jsonError(`Maximum ${MAX_PRODUCTS} products per bulk update.`);
  const ids = [...new Set(body.product_ids.map(String).filter(Boolean))];
  if(ids.length !== body.product_ids.length) return jsonError('Duplicate or invalid product ids detected.');
  const field = String(body.field || '');
  if(!FIELDS.has(field)) return jsonError('This field is not allowed for bulk update.');
  let value;
  try { value = validateValue(field, body.value); } catch(e) { return jsonError(e.message); }
  const stockMode = field === 'stock_quantity' ? String(body.stock_mode || 'set') : 'set';
  if(field === 'stock_quantity' && !['set','increase','decrease'].includes(stockMode)) return jsonError('Invalid stock mode.');

  // The authenticated admin/company check above remains on the user-scoped client.
  // The RPC is intentionally restricted to service_role, so invoke it server-side
  // only after that check. The database function also verifies the supplied user
  // is an active admin for this company and scopes every product update by company.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('bulk_update_website_products', {
    p_company_id: companyId,
    p_user_id: user.id,
    p_product_ids: ids,
    p_field: field,
    p_value: value,
    p_stock_mode: stockMode,
  });
  if(error) return jsonError(error.message, 500);

  await audit(supabase, {
    companyId,
    userId: user.id,
    action: 'products.bulk_update',
    entityType: 'website_products',
    entityId: null,
    newData: { count: data?.updated_count ?? data?.count ?? 0, field, stock_mode: stockMode, product_ids: ids },
  });

  if(field === 'stock_quantity') {
    try {
      const { data: products, error: productsError } = await supabase
        .from('website_products')
        .select('id,title,sku,stock_quantity,low_stock_threshold,track_inventory')
        .eq('company_id', companyId)
        .in('id', ids);
      if(productsError) throw productsError;
      for(const product of products || []) {
        const threshold = Number(product.low_stock_threshold ?? 5);
        const stock = Number(product.stock_quantity ?? 0);
        if(product.track_inventory !== false && stock <= threshold) {
          await runWebsiteAutomations({
            companyId,
            trigger: 'low_stock',
            order: {
              product_title: product.title,
              product_sku: product.sku || '',
              stock_quantity: stock,
              low_stock_threshold: threshold,
            },
          });
        }
      }
    } catch(automationError) {
      console.error('Bulk low-stock automation failed:', automationError);
    }
  }

  return Response.json({ ok: true, ...data });
}
