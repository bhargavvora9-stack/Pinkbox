'use client';

import { useMemo, useState } from 'react';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import ZipReferenceProductGrid from '@/components/ZipReferenceProductGrid';

export default function PinkBoxShopListing({ settings = {}, products = [] }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((product) =>
      !q || [product.title, product.description, product.short_description, product.brand, product.sku]
        .some((value) => String(value || '').toLowerCase().includes(q))
    );
    const price = (product) => Number(product.price || 0);
    if (sort === 'price-asc') return [...list].sort((a, b) => price(a) - price(b));
    if (sort === 'price-desc') return [...list].sort((a, b) => price(b) - price(a));
    return list;
  }, [products, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader settings={settings} />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Shop</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-5xl">All products</h1>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pads…" aria-label="Search pads" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground sm:max-w-xs" />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
        <div className="mt-10"><ZipReferenceProductGrid products={visible} /></div>
      </main>
      <ZipReferenceFooter settings={settings} />
    </div>
  );
}
