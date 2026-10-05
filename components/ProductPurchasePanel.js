'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toAnalyticsItems, trackGa4Event } from '@/lib/analytics';
import { Heart, Minus, Plus, ShoppingBag, Copy, Check, ArrowRight } from 'lucide-react';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ProductPurchasePanel({ product }) {
  const variants = Array.isArray(product.variants) ? product.variants.filter(v => v?.is_active !== false) : [];
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || null);
  const selectedVariant = useMemo(() => variants.find(v => v.id === selectedVariantId) || variants[0] || null, [variants, selectedVariantId]);
  const effectivePrice = Number(selectedVariant && Number(selectedVariant.price) > 0 ? selectedVariant.price : product.price ?? 0);
  const effectiveImage = selectedVariant?.image_url || product.image_url || product.images?.[0]?.image_url || null;
  const max = Number(selectedVariant && Number(selectedVariant.stock_quantity) > 0 ? selectedVariant.stock_quantity : product.stock_quantity || 0);
  const canBuy = max > 0 || product.allow_backorder;
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [status, setStatus] = useState('');
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackGa4Event('view_item', {
      currency: 'INR',
      value: effectivePrice,
      items: toAnalyticsItems([product]),
    });
  }, [product.id, effectivePrice]);

  function toggleWishlist() {
    try {
      const current = JSON.parse(localStorage.getItem('pinkbox_wishlist') || '[]');
      const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id];
      localStorage.setItem('pinkbox_wishlist', JSON.stringify(next));
      setWished(next.includes(product.id));
      setStatus(next.includes(product.id) ? 'Saved to wishlist' : 'Removed from wishlist');
      setAdded(false);
    } catch {
      setStatus('Unable to update wishlist');
    }
  }

  function addToCart() {
    if (!canBuy) return;
    try {
      const current = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
      const cartId = selectedVariant ? `${product.id}:${selectedVariant.id}` : product.id;
      const existing = current.find((item) => item.id === cartId);
      const nextQty = existing ? existing.quantity + qty : qty;
      if (max > 0 && nextQty > max && !product.allow_backorder) {
        setStatus(`Only ${max} available`);
        setAdded(false);
        setQty(Math.max(1, max - (existing?.quantity || 0)));
        return;
      }
      const cartItem = {
        ...product,
        id: cartId,
        product_id: product.id,
        variant_id: selectedVariant?.id || null,
        variant_title: selectedVariant?.title || null,
        sku: selectedVariant?.sku || product.sku,
        title: selectedVariant ? `${product.title} - ${selectedVariant.title}` : product.title,
        price: effectivePrice,
        image_url: effectiveImage,
        quantity: qty,
      };
      const next = existing
        ? current.map((item) => item.id === cartId ? { ...item, quantity: nextQty } : item)
        : [...current, cartItem];
      localStorage.setItem('pinkbox_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('pinkbox-cart-updated'));
      setStatus(`${qty} item${qty === 1 ? '' : 's'} added to cart`);
      trackGa4Event('add_to_cart', {
        currency: 'INR',
        value: effectivePrice * qty,
        items: toAnalyticsItems([{ ...product, ...cartItem, quantity: qty }]),
      });
      setAdded(true);
    } catch {
      setStatus('Unable to add to cart');
      setAdded(false);
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setStatus('Product link copied');
      setAdded(false);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setStatus('Copy this page link from your browser');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <span className="text-3xl font-black">{money(effectivePrice)}</span>
        {Number(selectedVariant?.compare_at_price || product.compare_at_price) > effectivePrice && <del className="pb-1 text-sm text-gray-400">{money(selectedVariant?.compare_at_price || product.compare_at_price)}</del>}
      </div>
      {variants.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-semibold">Color</div>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => { setSelectedVariantId(variant.id); setQty(1); setStatus(''); setAdded(false); }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${variant.id === selectedVariant?.id ? 'border-[#d9295f] bg-[#fff0f5] text-[#d9295f]' : 'border-gray-200'}`}
              >
                {variant.title || variant.option_values?.Color || variant.sku}
              </button>
            ))}
          </div>
        </div>
      )}
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
      {status && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">
          <span>{status}</span>
          {added && <Link href="/cart" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">View cart <ArrowRight size={13}/></Link>}
        </div>
      )}
    </div>
  );
}
