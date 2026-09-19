import { getWebsiteAdminContext, jsonError } from '@/lib/website-admin';

const TERMINAL_INVALID = new Set(['cancelled', 'returned', 'refunded']);
const INDIA_OFFSET_MS = 330 * 60 * 1000;

function startOfIndiaDay() {
  const indiaNow = new Date(Date.now() + INDIA_OFFSET_MS);
  indiaNow.setUTCHours(0, 0, 0, 0);
  return new Date(indiaNow.getTime() - INDIA_OFFSET_MS);
}

export async function GET() {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId } = ctx;
  const startOfToday = startOfIndiaDay();

  const [ordersRes, productsRes, customersRes, recentRes, lowStockRes, todayRes, settingsRes] = await Promise.all([
    supabase.from('website_orders').select('total_amount,order_status').eq('company_id', companyId),
    supabase.from('website_products').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('website_orders').select('id,order_number,total_amount,order_status,payment_status,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(8),
    supabase.from('website_products').select('id,title,sku,stock_quantity,low_stock_threshold').eq('company_id', companyId).eq('is_active', true).eq('track_inventory', true),
    supabase.from('website_orders').select('total_amount,payment_method,order_status,created_at').eq('company_id', companyId).gte('created_at', startOfToday.toISOString()),
    supabase.from('website_settings').select('website_name,whatsapp_number').eq('company_id', companyId).maybeSingle(),
  ]);

  const errs = [ordersRes, productsRes, customersRes, recentRes, lowStockRes, todayRes].map(x => x.error).filter(Boolean);
  if (errs.length) return jsonError(errs[0].message, 500);

  const allOrders = ordersRes.data || [];
  const eligible = allOrders.filter(o => !TERMINAL_INVALID.has(String(o.order_status || '').toLowerCase()));
  const sales = eligible.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const trackedProducts = lowStockRes.data || [];
  const lowStock = trackedProducts.filter(p => Number(p.stock_quantity || 0) > 0 && Number(p.stock_quantity || 0) <= Number(p.low_stock_threshold || 0));
  const outOfStock = trackedProducts.filter(p => Number(p.stock_quantity || 0) <= 0);

  const todayOrders = (todayRes.data || []).filter(o => !TERMINAL_INVALID.has(String(o.order_status || '').toLowerCase()));
  const today = {
    orders: todayOrders.length,
    sales: todayOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    cod: todayOrders.filter(o => String(o.payment_method || '').toUpperCase() === 'COD').length,
    online: todayOrders.filter(o => String(o.payment_method || '').toUpperCase() === 'ONLINE').length,
  };

  const queueStatuses = ['pending', 'new', 'confirmed', 'processing', 'packed', 'shipped'];
  const orderQueue = Object.fromEntries(queueStatuses.map(status => [
    status,
    allOrders.filter(o => String(o.order_status || '').toLowerCase() === status).length,
  ]));

  return Response.json({
    stats: {
      sales,
      orders: eligible.length,
      products: productsRes.count || 0,
      customers: customersRes.count || 0,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
    },
    recentOrders: recentRes.data || [],
    lowStock,
    outOfStock,
    orderQueue,
    today,
    websiteName: settingsRes.data?.website_name || 'PinkBox',
    whatsappNumber: settingsRes.data?.whatsapp_number || '',
  });
}
