'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toAnalyticsItems, trackGa4Event } from '@/lib/analytics';
import { Loader2 } from 'lucide-react';

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ProductPurchasePanel({ product, description = '' }) {
  const variants = Array.isArray(product.variants)
    ? product.variants.filter((variant) => variant?.is_active !== false)
    : [];
  const canSellVariant = (variant) =>
    product.track_inventory === false ||
    product.allow_backorder === true ||
    Number(variant?.stock_quantity || 0) > 0;
  const preferredVariant = variants.find(canSellVariant) || variants[0] || null;
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
  const [personalization, setPersonalization] = useState('');
  const [personalizationError, setPersonalizationError] = useState('');
  const [status, setStatus] = useState('');
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    trackGa4Event('view_item', {
      currency: 'INR',
      value: effectivePrice,
      items: toAnalyticsItems([product]),
    });
  }, [product.id, effectivePrice]);

  function addToCart() {
    if (!canBuy || busy) return;
    if (product.requires_personalization && !personalization.trim()) {
      setPersonalizationError('Please enter a name for embroidery.');
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
      const nextQuantity = Number(existing?.quantity || 0) + 1;
      if (max > 0 && nextQuantity > max && !product.allow_backorder) {
        setStatus('Only ' + max + ' available');
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
        quantity: 1,
        personalization: product.requires_personalization ? personalization.trim() : null,
      };
      const next = existing
        ? current.map((item) =>
            item.id === cartId
              ? { ...item, quantity: nextQuantity, personalization: cartItem.personalization }
              : item,
          )
        : [...current, cartItem];

      localStorage.setItem('pinkbox_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('pinkbox-cart-updated'));
      setStatus('Added to cart');
      setAdded(true);
      trackGa4Event('add_to_cart', {
        currency: 'INR',
        value: effectivePrice,
        items: toAnalyticsItems([{ ...product, ...cartItem, quantity: 1 }]),
      });
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

      {product.requires_personalization && canBuy && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-foreground" htmlFor="personalization-input">
            {product.personalization_label || 'Name for embroidery'}
          </label>
          <input
            id="personalization-input"
            value={personalization}
            onChange={(event) => {
              setPersonalization(event.target.value.slice(0, 20));
              setPersonalizationError('');
            }}
            placeholder="e.g. Priya"
            maxLength={20}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary sm:max-w-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Max 20 characters. This name will be added to your personalized product.
          </p>
          {personalizationError && (
            <p className="mt-1.5 text-xs font-medium text-destructive">{personalizationError}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={addToCart}
        disabled={!canBuy || busy}
        className="mt-8 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:w-fit"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? 'Adding…' : canBuy ? 'Add to Cart' : 'Out of stock'}
      </button>

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