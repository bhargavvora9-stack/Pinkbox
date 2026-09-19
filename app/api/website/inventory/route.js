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

  const { data: txn, error: rpcError } = await supabase.rpc('adjust_website_stock', {
    p_company_id: companyId,
    p_product_id: productId,
    p_change: changeQty,
    p_reason: cleanString(body?.reason, 500) || 'Manual adjustment',
    p_user_id: user.id,
  });

  if (rpcError) return jsonError(rpcError.message, rpcError.code === '42501' ? 403 : 400);

  await audit(supabase, {
    companyId,
    userId: user.id,
    action: 'inventory.adjust',
    entityType: 'website_products',
    entityId: productId,
    oldData: { stock_quantity: Number(txn.quantity_before) },
    newData: { stock_quantity: Number(txn.quantity_after) },
  });

  return Response.json({ data: txn });
}
