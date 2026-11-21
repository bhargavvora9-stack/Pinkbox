'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toAnalyticsItems, trackGa4Event } from '@/lib/analytics';
import { Loader2, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ProductPurchasePanel({ product, description = '' }) {
  const router = useRouter();
  const variants = useMemo(
    () => Array.isArray(product.variants)
      ? product.variants.filter((variant) => variant?.is_active !== false)
      : [],
    [product.variants],
  );
  const canSellVariant = useCallback((variant) =>
    product.track_inventory === false ||
    product.allow_backorder === true ||
    Number(variant?.stock_quantity || 0) > 0,
  [product.track_inventory, product.allow_backorder]);
  const preferredVariant = useMemo(
    () => variants.find(canSellVariant) || variants[0] || null,
    [variants, canSellVariant],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(preferredVariant?.id || null);
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) || preferredVariant,
    [variants, selectedVariantId, preferredVariant],
  );
  const effectivePrice = Number(
    selectedVariant && Number(selectedVariant.price) > 0
      ? selectedVariant.price
      : product.price ?? 0,
  );
  const effectiveImage = selectedVariant?.image_url || product.image_url || product.images?.[0]?.image_url || null;
  const tracksInventory = product.track_inventory !== false;
  const max = tracksInventory
    ? Number(selectedVariant ? selectedVariant.stock_quantity || 0 : product.stock_quantity || 0)
    : 0;
  const canBuy = !tracksInventory || max > 0 || product.allow_backorder === true;
  const [quantity, setQuantity] = useState(1);
  const [personalization, setPersonalization] = useState('');
  const [personalizationError, setPersonalizationError] = useState('');
  const [spellingConfirmed, setSpellingConfirmed] = useState(false);
  const [status, setStatus] = useState('');
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantId]);

  useEffect(() => {
    trackGa4Event('view_item', {
      currency: 'INR',
      value: effectivePrice,
      items: toAnalyticsItems([product]),
    });
  }, [product, effectivePrice]);

  function changeQuantity(value) {
    const parsed = Math.max(1, Number.parseInt(value, 10) || 1);
    const capped = max > 0 && !product.allow_backorder ? Math.min(parsed, max) : parsed;
    setQuantity(capped);
  }

  function addToCart({ buyNow = false } = {}) {
    if (!canBuy || busy) return;
    if (product.requires_personalization && !personalization.trim()) {
      setPersonalizationError('Please enter a name for embroidery.');
      return;
    }
    if (product.requires_personalization && !spellingConfirmed) {
      setPersonalizationError('Please confirm that the name spelling is correct.');
      return;
    }

    setPersonalizationError('');
    setBusy(true);
    setStatus('');
    try {
      const stored = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
      const current = Array.isArray(stored) ? stored : [];
      const cartId = selectedVariant ? product.id + ':' + selectedVariant.id : product.id;
      const existing = current.find((item) => item.id === cartId);
      const nextQuantity = Number(existing?.quantity || 0) + quantity;
      if (max > 0 && nextQuantity > max && !product.allow_backorder) {
        setStatus('Only ' + max + ' available in total');
        setAdded(false);
        return;
      }

      const cartItem = {
        ...product,
        id: cartId,
        product_id: product.id,
        variant_id: selectedVariant?.id || null,
        variant_title: selectedVariant?.title || null,
        sku: selectedVariant?.sku || product.sku,
        title: selectedVariant ? product.title + ' - ' + selectedVariant.title : product.title,
        price: effectivePrice,
        image_url: effectiveImage,
        quantity,
        personalization: product.requires_personalization ? personalization.trim() : null,
        quantity_limit: max > 0 && !product.allow_backorder ? max : null,
      };
      const next = existing
        ? current.map((item) =>
            item.id === cartId
              ? { ...item, quantity: nextQuantity, personalization: cartItem.personalization, image_url: effectiveImage, quantity_limit: cartItem.quantity_limit, allow_backorder: product.allow_backorder }
              : item,
          )
        : [...current, cartItem];

      localStorage.setItem('pinkbox_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('pinkbox-cart-updated'));
      trackGa4Event('add_to_cart', {
        currency: 'INR',
        value: effectivePrice * quantity,
        items: toAnalyticsItems([{ ...product, ...cartItem, quantity }]),
      });

      if (buyNow) {
        router.push('/checkout');
        return;
      }

      setStatus('Added to cart');
      setAdded(true);
    } catch {
      setStatus('Unable to add to cart. Please try again.');
      setAdded(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col">
      <p className="text-2xl font-semibold text-foreground">{money(effectivePrice)}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {product.online_payment_enabled !== false && <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />Secure online payment</span>}
        <Link href="/policies/returns" className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-primary">Returns & refund policy</Link>
        <Link href="/policies/shipping" className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" />Shipping information</Link>
      </div>

      {!canBuy && (
        <span className="mt-4 w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Out of stock
        </span>
      )}

      {description && (
        <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {variants.length > 1 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-foreground">Choose pack</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose pack">
            {variants.map((variant) => {
              const available = canSellVariant(variant);
              const selected = variant.id === selectedVariant?.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setStatus('');
                    setAdded(false);
                  }}
                  disabled={!available}
                  className={'inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ' +
                    (selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:border-primary hover:text-primary')}
                >
                  {variant.title || variant.option_values?.Color || variant.sku}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-foreground">Quantity</p>
        <div className="inline-flex h-11 items-center rounded-md border border-input bg-background">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => changeQuantity(quantity - 1)}
            disabled={quantity <= 1 || !canBuy || busy}
            className="h-full w-11 text-xl font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <input
            aria-label="Product quantity"
            type="number"
            min="1"
            max={max > 0 && !product.allow_backorder ? max : undefined}
            value={quantity}
            onChange={(event) => changeQuantity(event.target.value)}
            disabled={!canBuy || busy}
            className="h-full w-14 border-x border-input bg-transparent text-center text-sm font-semibold text-foreground outline-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => changeQuantity(quantity + 1)}
            disabled={!canBuy || busy || (max > 0 && !product.allow_backorder && quantity >= max)}
            className="h-full w-11 text-xl font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
        {max > 0 && <p className="mt-2 text-xs text-muted-foreground">{max} available</p>}
      </div>

      {product.requires_personalization && canBuy && (
        <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Personalise your product
          </p>
          <label className="mt-3 block text-sm font-semibold text-foreground" htmlFor="personalization-input">
            {product.personalization_label || 'Name for embroidery'}
          </label>
          <input
            id="personalization-input"
            value={personalization}
            onChange={(event) => {
              setPersonalization(event.target.value.slice(0, 20));
              setSpellingConfirmed(false);
              setPersonalizationError('');
            }}
            placeholder="Enter the name exactly as you want it embroidered"
            maxLength={20}
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary sm:max-w-md"
          />
          <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Use the exact spelling, capital letters and spaces you want.</span>
            <span className="shrink-0 tabular-nums">{personalization.length}/20</span>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={spellingConfirmed}
              onChange={(event) => {
                setSpellingConfirmed(event.target.checked);
                setPersonalizationError('');
              }}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>I have checked the spelling and confirm this is exactly how I want the name embroidered.</span>
          </label>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Please check carefully before adding to cart. Personalised names are made using the text entered above.
          </p>
          {personalizationError && (
            <p className="mt-2 text-xs font-semibold text-destructive" role="alert">{personalizationError}</p>
          )}
        </div>
      )}

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 md:max-w-xl">
        <button
          type="button"
          onClick={() => addToCart()}
          disabled={!canBuy || busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-primary bg-background px-5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add to Cart
        </button>
        <button
          type="button"
          onClick={() => addToCart({ buyNow: true })}
          disabled={!canBuy || busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Buy Now
        </button>
      </div>
      {!canBuy && <p className="mt-3 text-sm text-muted-foreground">This item is currently unavailable.</p>}

      {status && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{status}</span>
          {added && (
            <Link href="/cart" className="font-semibold text-primary underline underline-offset-4">
              View cart
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
