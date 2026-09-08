'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function WishlistPage() {
  const [ids, setIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pinkbox_wishlist') || '[]');
      setIds(Array.isArray(saved) ? saved : []);
    } catch { setIds([]); }
    fetch('/api/storefront', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const saved = useMemo(() => products.filter((p) => ids.includes(p.id) && p.is_active !== false), [products, ids]);

  function remove(id) {
    const next = ids.filter((value) => value !== id);
    setIds(next);
    localStorage.setItem('pinkbox_wishlist', JSON.stringify(next));
    window.dispatchEvent(new Event('pinkbox-wishlist-updated'));
  }

  function addToCart(product) {
    try {
      const current = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
      const existing = current.find((item) => item.id === product.id);
      const requested = Number(existing?.quantity || 0) + 1;
      const stock = Number(product.stock_quantity || 0);
      if (stock > 0 && requested > stock && !product.allow_backorder) return;
      const next = existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: requested } : item)
        : [...current, { ...product, quantity: 1 }];
      localStorage.setItem('pinkbox_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('pinkbox-cart-updated'));
    } catch {}
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] p-8 text-[#6a4b4e]">Loading wishlist…</main>;
  return <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="font-semibold text-[#c36f83]">← PinkBox</Link><Link href="/cart" className="inline-flex items-center gap-2 rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm font-semibold"><ShoppingBag size={16}/> Cart</Link></div>
      <header className="mt-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#c36f83]">Saved for later</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Wishlist</h1><p className="mt-2 text-[#846f70]">Keep your favourite PinkBox products close.</p></header>
      {!saved.length ? <section className="mt-8 rounded-3xl border border-[#eadfd9] bg-white p-10 text-center"><Heart className="mx-auto text-[#d8899d]" size={28}/><h2 className="mt-4 text-2xl font-semibold">Nothing saved yet</h2><p className="mt-2 text-[#846f70]">Tap the heart on a product to save it here.</p><Link href="/#new-arrivals" className="mt-5 inline-flex rounded-full bg-[#d8899d] px-5 py-3 font-semibold text-white">Explore products</Link></section> :
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{saved.map((p) => <article key={p.id} className="overflow-hidden rounded-3xl border border-[#eadfd9] bg-white">
        <Link href={`/products/${p.slug}`} className="block bg-[#f5eeea]"><div className="aspect-square">{p.image_url ? <img src={p.image_url} alt={p.title || ''} className="h-full w-full object-contain"/> : <div className="grid h-full place-items-center font-serif text-4xl text-[#b18489]">PB</div>}</div></Link>
        <div className="p-4"><div className="flex items-start justify-between gap-3"><Link href={`/products/${p.slug}`} className="font-semibold leading-5 hover:text-[#c36f83]">{p.title}</Link><button type="button" aria-label={`Remove ${p.title} from wishlist`} onClick={() => remove(p.id)} className="text-[#c36f83]"><Heart size={18} fill="currentColor"/></button></div><p className="mt-2 font-semibold">{money(p.price)}</p><button type="button" onClick={() => addToCart(p)} className="mt-4 w-full rounded-xl bg-[#d8899d] px-4 py-2.5 text-sm font-bold text-white">Add to cart</button></div>
      </article>)}</div>}
    </div>
  </main>;
}
