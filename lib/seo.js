const DEFAULT_SITE_URL = 'https://mypinkbox.vercel.app';

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path = '/') {
  const base = getSiteUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildProductMetaDescription(product) {
  const saved = String(product?.seo_description || '').trim();
  // Catalog SEO descriptions were generated with prices that can become stale.
  // Keep manually curated descriptions without a price; otherwise build from live product data.
  if (saved && !/(?:₹|\\bRs\\.?|\\bINR)\\s*[\\d,]+(?:\\.\\d{1,2})?/i.test(saved)) {
    return saved;
  }

  const title = String(product?.title || 'Product').replace(/\\s+/g, ' ').trim();
  const price = Number(product?.price);
  const priceText = Number.isFinite(price) && price > 0
    ? ` for ₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '';
  const details = String(product?.short_description || '')
    .replace(/[|•]+/g, ', ')
    .replace(/\\s+/g, ' ')
    .replace(/^(?:,\\s*)+|(?:,\\s*)+$/g, '')
    .trim();
  const full = `Buy ${title} online at PinkBox${priceText}.${details ? ` ${details}.` : ''} Delivery across India.`;
  if (full.length <= 160) return full;
  const shortened = full.slice(0, 157);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > 100 ? boundary : 157).trimEnd()}…`;
}

export function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
