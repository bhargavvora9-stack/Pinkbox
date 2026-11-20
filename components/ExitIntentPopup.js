'use client';

import { useEffect, useState } from 'react';
import { Copy, X } from 'lucide-react';

const SESSION_KEY = 'pinkbox-exit-offer-shown';

function discountLabel(offer) {
  const value = Number(offer?.value || 0);
  return ['percentage', 'percent'].includes(String(offer?.discount_type || '').toLowerCase())
    ? value + '% off'
    : '₹' + value.toLocaleString('en-IN') + ' off';
}

export default function ExitIntentPopup() {
  const [offer, setOffer] = useState(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let timer;
    let onLeave;

    async function prepareOffer() {
      try {
        const response = await fetch('/api/storefront/exit-offer', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!active || !data?.offer?.code) return;

        let alreadyShown = false;
        try {
          alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === '1';
        } catch {
          alreadyShown = true;
        }
        if (alreadyShown) return;

        setOffer(data.offer);
        onLeave = (event) => {
          if (event.clientY <= 0 && !event.relatedTarget) {
            try {
              window.sessionStorage.setItem(SESSION_KEY, '1');
            } catch {}
            setOpen(true);
            document.removeEventListener('mouseout', onLeave);
          }
        };
        timer = window.setTimeout(() => {
          document.addEventListener('mouseout', onLeave);
        }, 8000);
      } catch {
        // The storefront remains fully usable when the offer service is unavailable.
      }
    }

    prepareOffer();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      if (onLeave) document.removeEventListener('mouseout', onLeave);
    };
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!open || !offer) return null;
  const label = discountLabel(offer);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pinkbox-exit-title"
        aria-describedby="pinkbox-exit-description"
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center text-card-foreground shadow-2xl sm:p-9"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close offer"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">A little treat from Pink Box</p>
        <h2 id="pinkbox-exit-title" className="mt-3 font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Wait — {label} on your first order
        </h2>
        <p id="pinkbox-exit-description" className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Use this code at checkout before you go.
        </p>
        <p className="mx-auto mt-6 w-fit rounded-md border border-dashed border-primary px-7 py-3 font-mono text-xl font-semibold tracking-wider text-primary">
          {offer.code}
        </p>
        {Number(offer.minimum_order_amount || 0) > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            On orders above ₹{Number(offer.minimum_order_amount).toLocaleString('en-IN')}
          </p>
        )}
        <button
          type="button"
          onClick={copyCode}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Code copied' : 'Copy code & keep shopping'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Maybe later
        </button>
      </section>
    </div>
  );
}
