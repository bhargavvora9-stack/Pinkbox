'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, X } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const readCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function ZipCartDrawer() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const sync = () => setItems(readCart());
  useEffect(() => {
    sync();
    window.addEventListener('pinkbox-cart-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('pinkbox-cart-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (open) sync();
  }, [open]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items]);
  const remaining = Math.max(0, 499 - totalPrice);
  const progress = Math.min(100, (totalPrice / 499) * 100);

  function save(next) {
    setItems(next);
    localStorage.setItem('pinkbox_cart', JSON.stringify(next));
    window.dispatchEvent(new Event('pinkbox-cart-updated'));
  }
  function updateQuantity(id, quantity) {
    if (quantity < 1) return;
    save(items.map(item => item.id === id ? { ...item, quantity } : item));
  }
  function removeItem(id) {
    save(items.filter(item => item.id !== id));
  }

  return <>
    <button
      type="button"
      aria-label={`Shopping cart, ${totalItems} items`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{totalItems}</span>}
    </button>

    {open && <>
      <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} className="fixed inset-0 z-[90] bg-foreground/35 backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="zip-cart-title"
        className="fixed right-0 top-0 z-[91] flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id="zip-cart-title" className="font-display text-xl font-semibold text-foreground">Shopping Cart</h2>
            <p className="mt-1 text-sm text-muted-foreground">{totalItems === 0 ? 'Your cart is empty' : `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`}</p>
          </div>
          <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary"><X className="h-4 w-4"/></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pt-6">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground"/>
                <p className="font-display text-lg font-semibold text-foreground">Your cart is empty</p>
                <p className="mt-2 text-sm text-muted-foreground">Add something you love to get started.</p>
                <Link href="/shop" onClick={() => setOpen(false)} className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Continue shopping</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-5">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4 border-b border-border pb-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Pink Box</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
                          {item.variant_title && <p className="mt-1 text-xs text-muted-foreground">{item.variant_title}</p>}
                          {item.personalization && <p className="mt-1 text-xs text-muted-foreground">Name: {item.personalization}</p>}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">{money(Number(item.price || 0) * Number(item.quantity || 0))}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-border">
                          <button type="button" aria-label={`Decrease ${item.title} quantity`} onClick={() => updateQuantity(item.id, Number(item.quantity || 1) - 1)} className="flex h-8 w-8 items-center justify-center text-foreground hover:text-primary"><Minus className="h-3 w-3"/></button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button type="button" aria-label={`Increase ${item.title} quantity`} onClick={() => updateQuantity(item.id, Number(item.quantity || 1) + 1)} className="flex h-8 w-8 items-center justify-center text-foreground hover:text-primary"><Plus className="h-3 w-3"/></button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5"/> Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="shrink-0 space-y-4 border-t border-border bg-background py-5">
                <div className="space-y-2 rounded-md bg-secondary/50 p-3">
                  <p className="text-sm text-foreground">{remaining > 0 ? <>Add <strong>{money(remaining)}</strong> more for free delivery</> : <>You&apos;ve unlocked <strong>free delivery</strong>!</>}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all" style={{ width: progress + '%' }}/></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="font-display text-xl font-bold text-foreground">{money(totalPrice)}</span>
                </div>
                <Link href="/cart" onClick={() => setOpen(false)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <ExternalLink className="h-4 w-4"/> Proceed to checkout
                </Link>
                <Link href="/cart" onClick={() => setOpen(false)} className="inline-flex h-11 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-secondary">View full cart</Link>
              </div>
            </>
          )}
        </div>
      </aside>
    </>}
  </>;
}
