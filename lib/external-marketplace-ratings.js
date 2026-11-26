const MARKETPLACE_RATINGS = Object.freeze({
  'MDH-030': {
    rating: 4.4,
    ratingCount: 9,
    source: 'Flipkart',
    note: 'Public rating for the 24 Care XXL 320mm listing.',
  },
  'MDH-001': {
    rating: 4.1,
    ratingCount: 40,
    source: 'Flipkart',
    note: 'Size S, 40-piece pack.',
  },
  'MDH-002': {
    rating: 3.8,
    ratingCount: 81,
    source: 'Flipkart',
    note: 'Size M, 34-piece single pack.',
  },
  'MDH-003': {
    rating: 4.1,
    ratingCount: 101,
    source: 'Flipkart',
    note: 'Size L, 30-piece pack.',
  },
  'MDH-007': {
    rating: 3.8,
    ratingCount: 150,
    source: 'Flipkart',
    note: 'Source listing is a 2 × 62-piece L-size combo; PinkBox lists one 62-piece pack.',
  },
  'MDH-010': {
    rating: 3.7,
    ratingCount: 264,
    source: 'Flipkart',
    note: 'Size M, 50-piece pack.',
  },
  'MDH-012': {
    rating: 4.4,
    ratingCount: 10,
    source: 'Flipkart',
    note: 'Size S, 75-piece pack.',
  },
  'MDH-014': {
    rating: 4.4,
    ratingCount: 10,
    source: 'Flipkart',
    note: 'Size L, 75-piece pack.',
  },
  'MDH-023': {
    rating: 4.2,
    ratingCount: 78,
    source: 'Flipkart',
    note: 'Maxi Care Cottony XXL, 320mm, 40-piece pack.',
  },
  'MDH-024': {
    rating: 4.7,
    ratingCount: 9,
    source: 'Flipkart',
    note: 'Ultra Cottony Care XXL, 320mm, 40-piece pack.',
  },
});

export function getExternalMarketplaceRating(sku) {
  if (typeof sku !== 'string') return null;
  return MARKETPLACE_RATINGS[sku] || null;
}
