import { getWebsiteAdminContext, jsonError } from '@/lib/website-admin';

export async function GET() {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId } = ctx;

  const [ordersRes, productsRes, customersRes, recentRes, lowStockRes] = await Promise.all([
    supabase.from('website_orders').select('total_amount').eq('company_id', companyId),
    supabase.from('website_products').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('website_orders').select('id,order_number,total_amount,order_status,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(6),
    supabase.from('website_products').select('id,title,sku,stock_quantity,low_stock_threshold').eq('company_id', companyId).eq('is_active', true).eq('track_inventory', true),
  ]);
  const errs = [ordersRes, productsRes, customersRes, recentRes, lowStockRes].map(x => x.error).filter(Boolean);
  if (errs.length) return jsonError(errs[0].message, 500);

  const sales = (ordersRes.data || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const lowStock = (lowStockRes.data || []).filter(p => Number(p.stock_quantity || 0) <= Number(p.low_stock_threshold || 0));

  return Response.json({
    stats: {
      sales,
      orders: (ordersRes.data || []).length,
      products: productsRes.count || 0,
      customers: customersRes.count || 0,
    },
    recentOrders: recentRes.data || [],
    lowStock,
  });
}
