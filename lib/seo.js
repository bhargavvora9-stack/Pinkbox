const DEFAULT_SITE_URL = 'https://mypinkbox.vercel.app';

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path = '/') {
  const base = getSiteUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function limitMetaText(value, maxLength = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
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

function isProductAvailableForPurchase(product) {
  if (product?.track_inventory === false || product?.allow_backorder === true) return true;

  const activeVariants = Array.isArray(product?.variants)
    ? product.variants.filter((variant) => variant?.is_active !== false)
    : [];
  if (activeVariants.length > 0) {
    return activeVariants.some((variant) => Number(variant?.stock_quantity || 0) > 0);
  }

  return Number(product?.stock_quantity || 0) > 0;
}

export function buildProductMetaDescription(product) {
  const title = String(product?.title || 'Product').replace(/\s+/g, ' ').trim();
  const details = sanitizePublicProductText(product?.short_description)
    .replace(/[|•]+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:,\s*)+|(?:,\s*)+$/g, '')
    .trim();

  // Keep search snippets aligned with the same stock rules used by checkout.
  // An unavailable item remains discoverable, but its snippet must not invite a purchase.
  if (!isProductAvailableForPurchase(product)) {
    // Put the status first so long admin-managed product titles cannot truncate it.
    const outOfStock = `Currently out of stock at PinkBox: ${title}.${details ? ` ${details}.` : ''}`;
    return limitMetaText(outOfStock, 160);
  }

  const saved = sanitizePublicProductText(product?.seo_description).trim();
  // Saved catalogue copy can become stale after stock changes. The live
  // availability check above must win over any older "out of stock" wording.
  // Reject saved copy that claims any form of unavailable stock, including
  // older catalogue wording such as "sold out" or "not available".
  const savedClaimsOutOfStock = /\b(?:out[\s-]+of[\s-]+stock|sold[\s-]+out|unavailable|not[\s-]+available|no[\s-]+longer[\s-]+available)\b/i.test(saved);
  // Keep manually curated descriptions only when they do not contradict live
  // availability and do not contain a potentially stale saved price.
  if (
    saved &&
    !savedClaimsOutOfStock &&
    !/(?:₹|\bRs\.?|\bINR)\s*[\d,]+(?:\.\d{1,2})?/i.test(saved)
  ) {
    return saved;
  }

  const price = Number(product?.price);
  const priceText = Number.isFinite(price) && price > 0
    ? ` for ₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '';
  const full = `Buy ${title} online at PinkBox${priceText}.${details ? ` ${details}.` : ''} Delivery across India.`;
  if (full.length <= 160) return full;
  const shortened = full.slice(0, 157);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > 100 ? boundary : 157).trimEnd()}…`;
}

export function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
