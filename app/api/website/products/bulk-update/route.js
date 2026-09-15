import { getWebsiteAdminContext, jsonError } from '@/lib/website-admin';

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
  const { supabase, companyId, user } = ctx;
  const body = await request.json().catch(() => null);
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

  const { data, error } = await supabase.rpc('bulk_update_website_products', {
    p_company_id: companyId,
    p_user_id: user.id,
    p_product_ids: ids,
    p_field: field,
    p_value: value,
    p_stock_mode: stockMode,
  });
  if(error) return jsonError(error.message, 500);
  return Response.json({ ok: true, ...data });
}
