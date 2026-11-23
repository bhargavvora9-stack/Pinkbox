const DEFAULT_SITE_URL = 'https://mypinkbox.vercel.app';

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path = '/') {
  const base = getSiteUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function limitMetaText(value, maxLength = 160) {
  const text = String(value || '').replace(/\\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength - 1);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > maxLength * 0.65 ? boundary : maxLength - 1).trimEnd()}…`;
}

export function sanitizePublicProductText(value) {
  return String(value || '')
    .replace(/\s*[|•]\s*Brochure case badge printed\s*["“]?\d+(?:[.,]\d+)?\s*(?:Pcs|Pieces)["”]?/gi, '')
    .replace(/\s*Supplier brochure case quantity\s*\(as printed\)\s*:\s*\d+(?:[.,]\d+)?\s*(?:Pcs|Pieces)?\.?/gi, '')
    .replace(/\s*Listed from the supplied MD Hygiene catalogue\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[|•,;]+\s*|\s*[|•,;]+\s*$/g, '')
    .trim();
}

export function buildProductMetaDescription(product) {
  const saved = sanitizePublicProductText(product?.seo_description).trim();
  // Catalog SEO descriptions were generated with prices that can become stale.
  // Keep manually curated descriptions without a price; otherwise build from live product data.
  if (saved && !/(?:₹|\bRs\.?|\bINR)\s*[\d,]+(?:\.\d{1,2})?/i.test(saved)) {
    return saved;
  }

  const title = String(product?.title || 'Product').replace(/\s+/g, ' ').trim();
  const price = Number(product?.price);
  const priceText = Number.isFinite(price) && price > 0
    ? ` for ₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '';
  const details = sanitizePublicProductText(product?.short_description)
    .replace(/[|•]+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:,\s*)+|(?:,\s*)+$/g, '')
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
