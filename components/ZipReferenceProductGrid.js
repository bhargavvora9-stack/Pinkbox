'use client';

import { useMemo, useState } from 'react';
import ZipReferenceProductCard from '@/components/ZipReferenceProductCard';

function productText(product) {
  return [product.title, product.brand, ...(product.variants || []).map((variant) => variant.title || variant.sku || '')].join(' ');
}
function sizeOf(product) {
  return productText(product).toUpperCase().match(/\b(XXXL|XXL|XL|L|M|S)\b/)?.[1] || '';
}
function packOf(product) {
  const match = productText(product).match(/\b(\d{1,3})\s*(?:pcs?|pieces|pads?|counts?)\b/i);
  return match ? Number(match[1]) : null;
}

export default function ZipReferenceProductGrid({ products = [] }) {
  const [size, setSize] = useState('all');
  const [pack, setPack] = useState('all');
  const [priceBand, setPriceBand] = useState('all');
  const [sort, setSort] = useState('featured');
  const sizes = useMemo(() => [...new Set(products.map(sizeOf).filter(Boolean))].sort(), [products]);
  const packs = useMemo(() => [...new Set(products.map(packOf).filter(Boolean))].sort((a, b) => a - b), [products]);
  const visible = useMemo(() => {
    const rows = products.filter((product) => {
      const price = Number(product.price || 0);
      const productSize = sizeOf(product);
      const productPack = packOf(product);
      const matchesSize = size === 'all' || productSize === size;
      const matchesPack = pack === 'all' || String(productPack || '') === pack;
      const matchesPrice = priceBand === 'all'
        || (priceBand === 'under-100' && price < 100)
        || (priceBand === '100-299' && price >= 100 && price < 300)
        || (priceBand === '300-499' && price >= 300 && price < 500)
        || (priceBand === '500-plus' && price >= 500);
      return matchesSize && matchesPack && matchesPrice;
    });
    if (sort === 'price-low') rows.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price-high') rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'featured') rows.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return rows;
  }, [products, size, pack, priceBand, sort]);

  if (products.length === 0) return <div className="py-20 text-center"><h3 className="text-xl font-semibold text-foreground">No products found</h3><p className="mt-2 text-muted-foreground">Please check back soon.</p></div>;
  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sizes.length > 0 && <label className="grid gap-1 text-xs font-medium text-muted-foreground">Size<select value={size} onChange={(event) => setSize(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="all">All sizes</option>{sizes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
        {packs.length > 0 && <label className="grid gap-1 text-xs font-medium text-muted-foreground">Pack quantity<select value={pack} onChange={(event) => setPack(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="all">All pack quantities</option>{packs.map((value) => <option key={value} value={String(value)}>{value} pieces</option>)}</select></label>}
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Price range<select value={priceBand} onChange={(event) => setPriceBand(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="all">All prices</option><option value="under-100">Under ₹100</option><option value="100-299">₹100–₹299</option><option value="300-499">₹300–₹499</option><option value="500-plus">₹500 and above</option></select></label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="featured">Featured first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
      </div>
      <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">Showing {visible.length} of {products.length} products</p>
      {visible.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((product) => <ZipReferenceProductCard key={product.id} product={product} />)}</div> : <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No products match these filters. Try another size, pack or price range.</div>}
    </div>
  );
}
