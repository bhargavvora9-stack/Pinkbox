'use client';

import { useState } from 'react';
import { Heart, Minus, Plus, ShoppingBag, Copy, Check } from 'lucide-react';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ProductPurchasePanel({ product }) {
  const max = Number(product.stock_quantity || 0);
  const canBuy = max > 0 || product.allow_backorder;
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);

  function toggleWishlist() {
    try {
      const current = JSON.parse(localStorage.getItem('pinkbox_wishlist') || '[]');
      const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id];
      localStorage.setItem('pinkbox_wishlist', JSON.stringify(next));
      setWished(next.includes(product.id));
      setStatus(next.includes(product.id) ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch {
      setStatus('Unable to update wishlist');
    }
  }

  function addToCart() {
    if (!canBuy) return;
    try {
      const current = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
      const existing = current.find((item) => item.id === product.id);
      const nextQty = existing ? existing.quantity + qty : qty;
      if (max > 0 && nextQty > max && !product.allow_backorder) {
        setStatus(`Only ${max} available`);
        setQty(Math.max(1, max - (existing?.quantity || 0)));
        return;
      }
      const next = existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: nextQty } : item)
        : [...current, { ...product, quantity: qty }];
      localStorage.setItem('pinkbox_cart', JSON.stringify(next));
      setStatus(`${qty} item${qty === 1 ? '' : 's'} added to cart`);
    } catch {
      setStatus('Unable to add to cart');
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setStatus('Product link copied');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setStatus('Copy this page link from your browser');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <span className="text-3xl font-black">{money(product.price)}</span>
        {Number(product.compare_at_price) > 0 && <del className="pb-1 text-sm text-gray-400">{money(product.compare_at_price)}</del>}
      </div>
      <div className={`rounded-2xl border p-4 text-sm ${canBuy ? 'bg-[#fff8fa] text-gray-700' : 'bg-gray-50 text-gray-500'}`}>
        {canBuy ? (max > 0 ? `${max} in stock` : 'Available to order') : 'Currently out of stock'}
      </div>
      {canBuy && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Quantity</span>
            <div className="flex items-center rounded-full border">
              <button type="button" aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center" onClick={() => setQty((v) => Math.max(1, v - 1))}><Minus size={15}/></button>
              <span className="min-w-8 text-center text-sm font-bold">{qty}</span>
              <button type="button" aria-label="Increase quantity" className="grid h-10 w-10 place-items-center" onClick={() => setQty((v) => (max > 0 && !product.allow_backorder ? Math.min(max, v + 1) : v + 1))}><Plus size={15}/></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addToCart} className="inline-flex items-center gap-2 rounded-2xl bg-[#d9295f] px-6 py-3 font-bold text-white"><ShoppingBag size={18}/> Add to cart</button>
            <button type="button" onClick={toggleWishlist} className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-bold ${wished ? 'border-[#d9295f] text-[#d9295f]' : ''}`}><Heart size={18} fill={wished ? 'currentColor' : 'none'}/> {wished ? 'Saved' : 'Wishlist'}</button>
            <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-bold">{copied ? <Check size={18}/> : <Copy size={18}/>} Share</button>
          </div>
        </>
      )}
      {status && <p role="status" className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">{status}</p>}
    </div>
  );
}
