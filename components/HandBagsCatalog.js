'use client';

import { useMemo, useState } from 'react';
import { Search, ShoppingBag, X, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPES = ['All', 'Tote', 'Office', 'Mini'];
function bagType(title) {
  if (/mini/i.test(title)) return 'Mini';
  if (/office/i.test(title)) return 'Office';
  return 'Tote';
}
function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export default function HandBagsCatalog({ products = [] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [type, setType] = useState('All');
  const [selected, setSelected] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = products.filter((p) =>
      (type === 'All' || bagType(p.title) === type) &&
      (!q || p.title.toLowerCase().includes(q))
    );
    if (sort === 'low') rows.sort((a, b) => a.price - b.price);
    if (sort === 'high') rows.sort((a, b) => b.price - a.price);
    return rows;
  }, [products, query, sort, type]);

  function openProduct(product) {
    setSelected(product);
    setImageIndex(0);
  }

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hand bags…" aria-label="Search hand bags" className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {TYPES.map((item) => (
              <button key={item} type="button" aria-pressed={type === item} onClick={() => setType(item)} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${type === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary'}`}>
                {item}
              </button>
            ))}
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort hand bags" className="h-9 rounded-full border border-input bg-background px-3 text-xs text-foreground">
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">Showing {visible.length} of {products.length} designs</p>
      </div>

      {visible.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {visible.map((product) => (
            <li key={product.id}>
              <button type="button" onClick={() => openProduct(product)} className="group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="aspect-square overflow-hidden bg-muted">
                  {product.images[0] ? <img src={product.images[0] + '&width=600'} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-primary/50"><ShoppingBag className="h-10 w-10" /></div>}
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{bagType(product.title)}</p>
                  <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold text-card-foreground">{product.title}</h2>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary">PinkBox Price</p>
                  <p className="font-bold text-foreground">{money(product.price)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-20 text-center text-sm text-muted-foreground">No bags match your search.</p>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="hand-bag-title" className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-background p-4 shadow-2xl sm:p-6">
            <button type="button" onClick={() => setSelected(null)} aria-label="Close product details" className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground"><X className="h-4 w-4" /></button>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                  {selected.images[imageIndex] && <img src={selected.images[imageIndex] + '&width=900'} alt={selected.title} className="h-full w-full object-cover" />}
                </div>
                {selected.images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {selected.images.map((src, index) => (
                      <button key={src} type="button" onClick={() => setImageIndex(index)} aria-label={`Show photo ${index + 1}`} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${index === imageIndex ? 'border-primary' : 'border-transparent'}`}>
                        <img src={src + '&width=120'} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {selected.images.length > 1 && <div className="mt-2 flex gap-2"><button type="button" onClick={() => setImageIndex((v) => (v - 1 + selected.images.length) % selected.images.length)} className="rounded-full border p-2" aria-label="Previous photo"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setImageIndex((v) => (v + 1) % selected.images.length)} className="rounded-full border p-2" aria-label="Next photo"><ChevronRight className="h-4 w-4" /></button></div>}
              </div>
              <div className="flex flex-col py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{bagType(selected.title)} Bag</p>
                <h2 id="hand-bag-title" className="mt-3 font-display text-2xl font-semibold text-foreground">{selected.title}</h2>
                <p className="mt-6 text-xs font-bold uppercase tracking-wider text-primary">PinkBox Price</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{money(selected.price)}</p>
                <div className="mt-6 rounded-2xl bg-secondary/60 p-4">
                  <p className="text-sm font-semibold text-foreground">Ordering will open soon</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">This design is currently listed for viewing. Online ordering is not available yet.</p>
                </div>
                <button type="button" disabled className="mt-5 h-11 cursor-not-allowed rounded-full bg-primary/40 px-5 text-sm font-semibold text-primary-foreground">Coming soon</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
