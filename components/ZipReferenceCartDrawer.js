'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, X } from 'lucide-react';
import Image from 'next/image';

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const readCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

export default function ZipReferenceCartDrawer({ settings = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const threshold = Math.max(0, Number(settings.free_shipping_threshold || 499));
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items]);
  const remaining = Math.max(0, threshold - totalPrice);
  const progress = threshold > 0 ? Math.min(100, (totalPrice / threshold) * 100) : 100;
  const syncCart = () => setItems(readCart());

  useEffect(() => {
    syncCart();
    const sync = () => syncCart();
    window.addEventListener('pinkbox-cart-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('pinkbox-cart-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (isOpen) syncCart();
  }, [isOpen]);

  function persist(next) {
    setItems(next);
    try {
      localStorage.setItem('pinkbox_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('pinkbox-cart-updated'));
    } catch {}
  }
  function updateQuantity(id, quantity) {
    if (quantity <= 0) return persist(items.filter((item) => item.id !== id));
    persist(items.map((item) => item.id === id ? { ...item, quantity } : item));
  }
  function removeItem(id) {
    persist(items.filter((item) => item.id !== id));
  }

  return (
    <>
      <button type="button" aria-label="Open shopping cart" aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setIsOpen(true)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary">
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-0 text-xs text-primary-foreground">{totalItems}</span>}
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <div className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]" />
          <section role="dialog" aria-modal="true" aria-labelledby="zip-cart-title" className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl">
            <header className="flex-shrink-0 border-b border-border px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="zip-cart-title" className="font-display text-xl font-semibold text-foreground">Shopping Cart</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{totalItems === 0 ? 'Your cart is empty' : totalItems + ' item' + (totalItems !== 1 ? 's' : '') + ' in your cart'}</p>
                </div>
                <button type="button" aria-label="Close cart" onClick={() => setIsOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
              </div>
            </header>
            <div className="flex min-h-0 flex-1 flex-col pt-6">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-6">
                  <div className="text-center">
                    <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <Link href="/shop" onClick={() => setIsOpen(false)} className="mt-5 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Browse products</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 pr-4">
                    <div className="space-y-4">
                      {items.map((item) => {
                        const image = item.image_url || item.images?.[0]?.image_url;
                        return (
                          <div key={item.id} className="flex gap-4 rounded-xl p-2">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                              {image ? <Image src={image} alt={item.title || 'Pink Box product'} width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">Pink Box</div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-medium text-foreground">{item.title || item.name}</h3>
                              {item.variant_title && <p className="text-sm text-muted-foreground">{item.variant_title}</p>}
                              {item.personalization && <p className="text-sm text-muted-foreground">Name: {item.personalization}</p>}
                              <p className="font-semibold text-foreground">{money(item.price)}</p>
                            </div>
                            <div className="flex flex-shrink-0 flex-col items-end gap-2">
                              <button type="button" aria-label={'Remove ' + (item.title || 'item')} onClick={() => removeItem(item.id)} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"><Trash2 className="h-3.5 w-3.5" /></button>
                              <div className="flex items-center gap-1">
                                <button type="button" aria-label="Decrease quantity" className="grid h-7 w-7 place-items-center rounded-md border border-border" onClick={() => updateQuantity(item.id, Number(item.quantity || 1) - 1)}><Minus className="h-3 w-3" /></button>
                                <span className="w-7 text-center text-sm">{item.quantity}</span>
                                <button type="button" aria-label="Increase quantity" className="grid h-7 w-7 place-items-center rounded-md border border-border" onClick={() => updateQuantity(item.id, Number(item.quantity || 1) + 1)}><Plus className="h-3 w-3" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex-shrink-0 space-y-4 border-t border-border bg-background px-6 pt-4 pb-6">
                    <div className="space-y-2 rounded-md bg-secondary/50 p-3">
                      <p className="text-sm text-foreground">{remaining > 0 ? <>Add <strong>{money(remaining)}</strong> more for free delivery</> : <>You&apos;ve unlocked <strong>free delivery</strong>!</>}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all" style={{ width: progress + '%' }} /></div>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-lg font-semibold text-foreground">Total</span><span className="text-xl font-bold text-foreground">{money(totalPrice)}</span></div>
                    <Link href="/cart" onClick={() => setIsOpen(false)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><ExternalLink className="mr-2 h-4 w-4" />Continue to checkout</Link>
                    <Link href="/cart" onClick={() => setIsOpen(false)} className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary">View full cart</Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
