'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ZipHeader, ZipFooter, ZipProductGrid } from '@/components/ZipReferenceHome';

export default function PinkBoxShopListing({ settings = {}, products = [] }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) =>
      !q || String(p.title || '').toLowerCase().includes(q) ||
      String(p.description || '').toLowerCase().includes(q)
    );
    const price = (p) => Number(p.price || 0);
    if (sort === 'price-asc') return [...list].sort((a, b) => price(a) - price(b));
    if (sort === 'price-desc') return [...list].sort((a, b) => price(b) - price(a));
    return list;
  }, [products, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <ZipHeader />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Shop</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-5xl">All products</h1>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pads…"
            className="sm:max-w-xs"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
        <div className="mt-10">
          <ZipProductGrid products={visible} />
        </div>
      </main>
      <ZipFooter />
    </div>
  );
}
