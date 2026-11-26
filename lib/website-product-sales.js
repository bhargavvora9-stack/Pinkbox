import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';

const ORDER_PAGE_SIZE = 500;
const TERMINAL_ORDER_STATUSES = new Set(['cancelled', 'canceled', 'returned', 'refunded']);

async function loadWebsiteProductOrderCounts(companyId) {
  const db = createAdminClient();
  const counts = {};
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from('website_orders')
      .select('id,payment_method,payment_status,order_status,website_order_items(product_id)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .range(offset, offset + ORDER_PAGE_SIZE - 1);

    if (error) {
      // Keep storefront browsing available even if the optional ranking query is temporarily unavailable.
      console.error('[website-product-sales] Could not read completed website orders:', error.message);
      return {};
    }

    const orders = data || [];
    for (const order of orders) {
      const paymentMethod = String(order.payment_method || '').toUpperCase();
      const paymentStatus = String(order.payment_status || '').toLowerCase();
      const orderStatus = String(order.order_status || '').toLowerCase();

      if (TERMINAL_ORDER_STATUSES.has(orderStatus)) continue;

      // Online purchases count only after Razorpay confirms payment.
      // COD purchases count only after successful delivery.
      const isCompletedWebsiteOrder =
        (paymentMethod === 'ONLINE' && paymentStatus === 'paid') ||
        (paymentMethod === 'COD' && orderStatus === 'delivered');

      if (!isCompletedWebsiteOrder) continue;

      // A product contributes at most one order per order ID, even when multiple
      // variants/lines for the same product appear in the same basket.
      const productIdsInOrder = new Set(
        (order.website_order_items || [])
          .map((item) => item.product_id)
          .filter(Boolean),
      );

      for (const productId of productIdsInOrder) {
        counts[productId] = (counts[productId] || 0) + 1;
      }
    }

    if (orders.length < ORDER_PAGE_SIZE) break;
    offset += ORDER_PAGE_SIZE;
  }

  return counts;
}

const getCachedWebsiteProductOrderCounts = unstable_cache(
  loadWebsiteProductOrderCounts,
  ['pinkbox-website-product-order-counts-v1'],
  { revalidate: 60, tags: ['pinkbox-website-product-order-counts'] },
);

export function getWebsiteProductOrderCounts(companyId) {
  if (!companyId) return Promise.resolve({});
  return getCachedWebsiteProductOrderCounts(companyId);
}

/**
 * Orders products by completed PinkBox website orders. Sellable products stay
 * ahead of out-of-stock products, and the supplied order is preserved for ties.
 */
export function sortProductsByWebsiteOrders(products = [], orderCounts = {}, sellableProductIds = null) {
  return [...products].sort((a, b) => {
    if (sellableProductIds) {
      const availabilityDifference =
        Number(sellableProductIds.has(b.id)) - Number(sellableProductIds.has(a.id));
      if (availabilityDifference !== 0) return availabilityDifference;
    }

    const orderDifference =
      Number(orderCounts[b.id] || 0) - Number(orderCounts[a.id] || 0);
    return orderDifference;
  });
}
