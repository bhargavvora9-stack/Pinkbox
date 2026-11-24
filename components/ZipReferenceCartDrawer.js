'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, X } from 'lucide-react';
import Image from 'next/image';

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const readCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function ZipReferenceCartDrawer({ settings = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState([]);

  const threshold = Math.max(0, Number(settings.free_shipping_threshold || 499));
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  );
  const remaining = Math.max(0, threshold - totalPrice);
  const progress = threshold > 0 ? Math.min(100, (totalPrice / threshold) * 100) : 100;

  const syncCart = () => setItems(readCart());

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
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

    persist(items.map((item) => {
      if (item.id !== id) return item;
      const limit = Number(item.quantity_limit || 0);
      const safeQuantity = limit > 0 && !item.allow_backorder
        ? Math.min(quantity, limit)
        : quantity;
      return { ...item, quantity: safeQuantity };
    }));
  }

  function removeItem(id) {
    persist(items.filter((item) => item.id !== id));
  }

  return (
    <>
      <button
        type="button"
        aria-label={totalItems > 0 ? 'Open shopping cart with ' + totalItems + ' items' : 'Open shopping cart'}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
            {totalItems}
          </span>
        )}
      </button>

      {isMounted && isOpen && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex justify-end overflow-hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]" aria-hidden="true" />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="zip-cart-title"
            className="relative flex h-screen h-[100dvh] w-full min-h-0 max-w-lg flex-col overflow-hidden border-l border-border bg-background shadow-2xl"
          >
            <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="zip-cart-title" className="font-display text-xl font-semibold text-foreground">
                    Shopping Cart
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalItems === 0
                      ? 'Your cart is empty'
                      : totalItems + ' item' + (totalItems !== 1 ? 's' : '') + ' in your cart'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close cart"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col">
              {items.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6">
                  <div className="text-center">
                    <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <Link
                      href="/shop"
                      onClick={() => setIsOpen(false)}
                      className="mt-5 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Browse products
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                    <div className="divide-y divide-border">
                      {items.map((item) => {
                        const image = item.image_url || item.images?.[0]?.image_url;
                        const title = item.title || item.name || 'PinkBox product';
                        const quantity = Math.max(1, Number(item.quantity || 1));
                        const limit = Number(item.quantity_limit || 0);
                        const atLimit = limit > 0 && !item.allow_backorder && quantity >= limit;
                        const showVariant = item.variant_title &&
                          !title.toLowerCase().includes(String(item.variant_title).toLowerCase());

                        return (
                          <article key={item.id} className="flex min-w-0 gap-3 py-4 first:pt-1 sm:gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-20">
                              {image ? (
                                <Image
                                  src={image}
                                  alt={title}
                                  width={80}
                                  height={80}
                                  unoptimized
                                  className="h-full w-full object-contain p-1"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-xs text-muted-foreground">PinkBox</div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">
                                {title}
                              </h3>
                              {showVariant && (
                                <p className="mt-1 whitespace-normal break-words text-xs text-muted-foreground">
                                  Pack: {item.variant_title}
                                </p>
                              )}
                              {item.personalization && (
                                <p className="mt-1 whitespace-normal break-words text-xs text-muted-foreground">
                                  Name: {item.personalization}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-muted-foreground">
                                {money(item.price)} × {quantity}
                              </p>
                              <p className="mt-1 font-semibold text-foreground">
                                {money(Number(item.price || 0) * quantity)}
                              </p>

                              <div className="mt-3 inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background">
                                <button
                                  type="button"
                                  aria-label={'Decrease quantity for ' + title}
                                  className="grid h-7 w-8 place-items-center rounded-md hover:bg-secondary"
                                  onClick={() => updateQuantity(item.id, quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-6 text-center text-sm font-medium" aria-live="polite">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label={'Increase quantity for ' + title}
                                  className="grid h-7 w-8 place-items-center rounded-md hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => updateQuantity(item.id, quantity + 1)}
                                  disabled={atLimit}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              aria-label={'Remove ' + title + ' from cart'}
                              onClick={() => removeItem(item.id)}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className="shrink-0 space-y-3 border-t border-border bg-background px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-4 sm:px-6 sm:pb-6">
                    <div className="space-y-2 rounded-md bg-secondary/50 p-3">
                      <p className="text-sm text-foreground">
                        {remaining > 0
                          ? <>Add <strong>{money(remaining)}</strong> more for free delivery</>
                          : <>You&apos;ve unlocked <strong>free delivery</strong>!</>}
                      </p>
                      <div className="h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: progress + '%' }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-foreground">Subtotal ({totalItems} items)</span>
                      <span className="text-xl font-bold text-foreground">{money(totalPrice)}</span>
                    </div>
                    <p className="-mt-2 text-xs text-muted-foreground">
                      Shipping and any discounts are calculated at checkout.
                    </p>

                    <Link
                      href="/cart"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Continue to checkout
                    </Link>
                    <Link
                      href="/cart"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      View full cart
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
