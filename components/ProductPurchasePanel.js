'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toAnalyticsItems, trackGa4Event } from '@/lib/analytics';
import { Loader2, CheckCircle2, ShieldCheck, Truck, Gift, MessageCircle } from 'lucide-react';
import ProductFeatureList from './ProductFeatureList';

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

  const compareAtPrice = Number(
    selectedVariant && Number(selectedVariant.compare_at_price) > 0
      ? selectedVariant.compare_at_price
      : product.compare_at_price || 0,
  );
  const discountPercentage = compareAtPrice > effectivePrice
    ? Math.round((1 - effectivePrice / compareAtPrice) * 100)
    : 0;
  const isBagProduct = String(product.sku || '').toUpperCase().startsWith('BAG-');
  const rawWhatsappNumber = String(product.whatsapp_number || '').replace(/\\D/g, '');
  const whatsappNumber = rawWhatsappNumber.length === 10
    ? '91' + rawWhatsappNumber
    : rawWhatsappNumber.length >= 11 && rawWhatsappNumber.length <= 15
      ? rawWhatsappNumber
      : '';
  const whatsappHref = whatsappNumber
    ? 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(
        'Hi PinkBox, I am interested in ' + product.title + '. Could you please share more details?',
      )
    : '';
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
  const [pincode, setPincode] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [checkingDelivery, setCheckingDelivery] = useState(false);

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

  async function checkDelivery(event) {
    event.preventDefault();
    const code = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(code)) { setDeliveryStatus('Enter a valid 6-digit PIN code.'); return; }
    setCheckingDelivery(true);
    setDeliveryStatus('');
    try {
      const response = await fetch('/api/storefront/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: code, subtotal: effectivePrice * quantity, items: [{ product_id: product.id, variant_id: selectedVariant?.id || null, quantity }] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not calculate delivery charges.');
      setDeliveryStatus('Estimated shipping: ' + money(data.shipping) + '. Standard delivery usually takes 3–7 business days after dispatch; courier serviceability may vary.');
    } catch (error) {
      setDeliveryStatus(error instanceof Error ? error.message : 'Could not calculate delivery charges.');
    } finally { setCheckingDelivery(false); }
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
    <div className="mt-4 flex flex-col pb-24 md:pb-0">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <p className="text-2xl font-semibold text-foreground">{money(effectivePrice)}</p>
        {compareAtPrice > effectivePrice && (
          <>
            <p className="text-sm text-muted-foreground line-through">MRP {money(compareAtPrice)}</p>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {discountPercentage}% OFF
            </span>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {product.online_payment_enabled !== false && (
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Secure online payment
          </span>
        )}
        {product.cod_enabled === true && (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Cash on Delivery available
          </span>
        )}
        <Link href="/policies/returns" className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-primary">
          Returns &amp; refund policy
        </Link>
        <Link href="/policies/shipping" className="inline-flex items-center gap-1.5 hover:text-primary">
          <Truck className="h-4 w-4 text-primary" /> Shipping information
        </Link>
      </div>

      {!canBuy && (
        <span className="mt-4 w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Out of stock
        </span>
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

      {isBagProduct && (
        <section className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4" aria-label="Gift idea">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
            <Gift className="h-4 w-4" /> A thoughtful gift idea
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground">
            A lovely gift for your wife, a friend, your sister or someone special.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Browse the product photos above to see the exact design and details before ordering.
          </p>
        </section>
      )}

      <div className="mt-7 grid w-full gap-3 sm:grid-cols-2 md:max-w-xl">
        <button
          type="button"
          onClick={() => addToCart()}
          disabled={!canBuy || busy}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-primary bg-background px-5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add to Cart
        </button>
        <button
          type="button"
          onClick={() => addToCart({ buyNow: true })}
          disabled={!canBuy || busy}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Buy Now
        </button>
      </div>

      {status && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{status}</span>
          {added && <Link href="/cart" className="font-semibold text-primary underline underline-offset-4">View cart</Link>}
        </div>
      )}

      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <MessageCircle className="h-4 w-4" /> Questions about this product? Chat on WhatsApp
        </a>
      )}

      {canBuy && (
        <form onSubmit={checkDelivery} className="mt-6 rounded-xl border border-border bg-card p-4">
          <label htmlFor="delivery-pincode" className="block text-sm font-semibold text-foreground">
            Check delivery charges
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="delivery-pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={pincode}
              onChange={(event) => {
                setPincode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setDeliveryStatus('');
              }}
              placeholder="Enter 6-digit PIN code"
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={checkingDelivery}
              className="h-10 rounded-md bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
            >
              {checkingDelivery ? 'Checking…' : 'Check'}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Shipping charges are calculated using PinkBox’s current shipping rules. Delivery dates depend on courier serviceability.
          </p>
          {deliveryStatus && <p className="mt-2 text-sm text-muted-foreground" role="status">{deliveryStatus}</p>}
        </form>
      )}

      {description && !isBagProduct && (
        <section className="mt-7" aria-label="Product features">
          <h2 className="text-base font-semibold text-foreground">Product details</h2>
          <ProductFeatureList description={description} />
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_1fr] gap-2 border-t border-border bg-background/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="flex min-w-0 flex-col justify-center pl-1">
          <span className="text-[11px] text-muted-foreground">Price</span>
          <span className="truncate text-sm font-bold text-foreground">{money(effectivePrice)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addToCart()}
            disabled={!canBuy || busy}
            className="h-11 rounded-md border border-primary px-2 text-xs font-semibold text-primary disabled:opacity-50"
          >
            {busy ? 'Please wait…' : 'Add to Cart'}
          </button>
          <button
            type="button"
            onClick={() => addToCart({ buyNow: true })}
            disabled={!canBuy || busy}
            className="h-11 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Please wait…' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
