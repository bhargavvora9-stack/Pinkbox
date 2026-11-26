const EXTERNAL_RATINGS = {
  'MDH-030': {
    rating: 4.4,
    ratingCount: 9,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/24-care-ultra-long-sanitary-pads-soft-cotton-anti-bacterial-night-protection-320mm-pad/p/itm8fa74c9baf489',
    listing: '24 Care XXL 320mm sanitary pad listing',
    note: 'Public marketplace rating for the 320mm XXL listing.',
  },
  'MDH-001': {
    rating: 4.1,
    ratingCount: 40,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/7-soft-premium-baby-diaper-pants-s-size-40-3-8-kg-extra-absorbent-pant-diapers/p/itm5913b72af9eb9',
    listing: '7 Soft Premium Baby Diaper Pants — S, 40 pcs',
    note: 'Size and pack quantity match this PinkBox listing.',
  },
  'MDH-002': {
    rating: 3.8,
    ratingCount: 81,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/7-soft-premium-baby-diaper-pants-m-size-34-5-11-kg-extra-absorbent/p/itmbd2fa2c5de9c9',
    listing: '7 Soft Premium Baby Diaper Pants — M, 34 pcs',
    note: 'The external listing matches this PinkBox single-pack size and quantity.',
  }
  'MDH-003': {
    rating: 4.1,
    ratingCount: 101,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/mr/baby-care/diaper-potty-training/baby-diapers/7-soft~brand/pr?sid=kyh%2Cfdp%2Cyvf',
    listing: '7 Soft Premium Baby Diaper Pants — L, 30 pcs',
    note: 'The external L-size 30-piece listing matches this PinkBox pack.',
  }
  'MDH-007': {
    rating: 3.8,
    ratingCount: 150,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/mr/baby-care/diaper-potty-training/baby-diapers/7-soft~brand/pr?sid=kyh%2Cfdp%2Cyvf',
    listing: '7 Soft Baby Diaper Pants — L, 124 pcs (2 × 62)',
    note: 'The source is a 2-pack combo of the same 62-piece L pack; PinkBox lists one 62-piece pack.',
  }
  'MDH-010': {
    rating: 3.7,
    ratingCount: 264,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/mr/baby-care/diaper-potty-training/baby-diapers/7-soft~brand/pr?sid=kyh%2Cfdp%2Cyvf',
    listing: '7 Soft Baby Diaper Pants — M, 50 pcs',
    note: 'The external M-size 50-piece listing matches this PinkBox pack.',
  }
  'MDH-012': {
    rating: 4.4,
    ratingCount: 10,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/mr/baby-care/diaper-potty-training/baby-diapers/7-soft~brand/pr?sid=kyh%2Cfdp%2Cyvf',
    listing: '7 Soft Premium Baby Diaper Pants — S, 75 pcs',
    note: 'The external S-size 75-piece listing matches this PinkBox pack.',
  }
  'MDH-014': {
    rating: 4.4,
    ratingCount: 10,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/mr/baby-care/diaper-potty-training/baby-diapers/7-soft~brand/pr?sid=kyh%2Cfdp%2Cyvf',
    listing: '7 Soft Baby Diaper Pants — L, 75 pcs',
    note: 'The external L-size 75-piece listing matches this PinkBox pack.',
  }
  'MDH-023': {
    rating: 4.2,
    ratingCount: 78,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/beauty-and-grooming/womens-personal-hygiene-products/sanitary-pad/7-soft~brand/pr?sid=g9b%2Ciph%2Cjth',
    listing: '7 Soft Maxi Care Cottony XXL — 320mm, 40 pcs',
    note: 'Size and pack quantity match the 7 Soft Maxi Care Cottony listing.',
  },
  'MDH-024': {
    rating: 4.7,
    ratingCount: 9,
    source: 'Flipkart',
    href: 'https://www.flipkart.com/beauty-and-grooming/womens-personal-hygiene-products/sanitary-pad/7-soft~brand/pr?sid=g9b%2Ciph%2Cjth',
    listing: '7 Soft Ultra Cottony Care XXL — 320mm, 40 pcs',
    note: 'Size and pack quantity match the 7 Soft Ultra Cottony Care listing.',
  },
};

export default function ExternalMarketplaceRating({ sku }) {
  const details = EXTERNAL_RATINGS[sku];
  if (!details) return null;

  return (
    <section
      className="mt-8 rounded-2xl border border-border bg-card p-5"
      aria-label={details.source + ' customer rating'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Public customer rating · {details.source}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {details.listing}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
          <span className="text-lg font-bold text-foreground">{details.rating.toFixed(1)}</span>
          <span
            className="text-sm tracking-tight text-primary"
            aria-label={details.rating.toFixed(1) + ' out of 5 stars'}
          >
            {Array.from({ length: 5 }, (_, index) =>
              index + 1 <= Math.round(details.rating) ? '★' : '☆',
            ).join('')}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Based on {details.ratingCount.toLocaleString('en-IN')} public marketplace ratings.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {details.note}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          Checked 26 Nov 2026 · External marketplace rating, not a PinkBox review
        </span>
        <a
          href={details.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
        >
          View original ratings on Flipkart
        </a>
      </div>
    </section>
  );
}
