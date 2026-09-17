import { getWebsiteAdminContext, jsonError, cleanString, audit } from '@/lib/website-admin';

export async function GET() {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId } = ctx;
  const [products, transactions] = await Promise.all([
    supabase.from('website_products').select('id,title,sku,stock_quantity,low_stock_threshold').eq('company_id', companyId).eq('is_active', true).order('title'),
    supabase.from('website_inventory_transactions').select('id,product_id,change_quantity,quantity_before,quantity_after,reason,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
  ]);
  if (products.error) return jsonError(products.error.message, 500);
  if (transactions.error) return jsonError(transactions.error.message, 500);
  return Response.json({ products: products.data || [], transactions: transactions.data || [] });
}

export async function POST(request) {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId, user } = ctx;
  const body = await request.json().catch(() => null);
  const productId = body?.product_id;
  const changeQty = Number(body?.change_quantity);
  if (!productId) return jsonError('Please select a product.');
  if (!Number.isFinite(changeQty) || changeQty === 0) return jsonError('Enter a non-zero quantity, e.g. +10 or -5.');

  const { data: product, error: pErr } = await supabase.from('website_products').select('id,stock_quantity').eq('company_id', companyId).eq('id', productId).maybeSingle();
  if (pErr) return jsonError(pErr.message, 500);
  if (!product) return jsonError('Product not found.', 404);

  const before = Number(product.stock_quantity || 0);
  const after = before + changeQty;
  if (after < 0) return jsonError(`This would take stock below zero (currently ${before}).`);

  const { error: uErr } = await supabase.from('website_products').update({ stock_quantity: after, updated_at: new Date().toISOString() }).eq('company_id', companyId).eq('id', productId);
  if (uErr) return jsonError(uErr.message, 500);

  const { data: txn, error: tErr } = await supabase.from('website_inventory_transactions').insert({
    company_id: companyId,
    product_id: productId,
    change_quantity: changeQty,
    quantity_before: before,
    quantity_after: after,
    reason: cleanString(body.reason, 500) || 'Manual adjustment',
    reference_type: 'manual',
    created_by: user.id,
  }).select().single();
  if (tErr) return jsonError(tErr.message, 500);

  await audit(supabase, { companyId, userId: user.id, action: 'inventory.adjust', entityType: 'website_products', entityId: productId, oldData: { stock_quantity: before }, newData: { stock_quantity: after } });
  return Response.json({ data: txn });
}
