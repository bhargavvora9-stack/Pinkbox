export function toAnalyticsItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    item_id: String(item.sku || item.id || ''),
    item_name: String(item.title || ''),
    ...(item.brand ? { item_brand: String(item.brand) } : {}),
    ...(item.category_name ? { item_category: String(item.category_name) } : {}),
    price: Number(item.price || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
  }));
}

export function trackGa4Event(name, params = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('event', name, params);
  } catch {}
}
