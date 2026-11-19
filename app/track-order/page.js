'use client';

import { useState } from 'react';
import Link from 'next/link';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import { PackageCheck, Search, Loader2 } from 'lucide-react';

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/storefront/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, phone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to find this order.');
      const destination = String(data.tracking_url || '');
      if (!destination.startsWith('/orders/')) throw new Error('A secure tracking link could not be created.');
      window.location.assign(destination);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to find this order. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader />
      <main className="container mx-auto flex min-h-[65vh] max-w-4xl items-center justify-center px-4 py-16">
        <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-7 shadow-soft md:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <PackageCheck className="h-7 w-7" />
          </div>
          <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[.22em] text-primary">Order support</p>
          <h1 className="mt-2 text-center font-display text-3xl font-semibold text-foreground md:text-4xl">Track your order</h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-muted-foreground">
            Enter the order number and the mobile number you used at checkout. We’ll open your secure order status page.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="track-order-number" className="block text-sm font-semibold text-foreground">Order number</label>
              <input
                id="track-order-number"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value.toUpperCase().slice(0, 50))}
                placeholder="e.g. PB-000123"
                autoComplete="off"
                required
                minLength={3}
                maxLength={50}
                className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="track-order-phone" className="block text-sm font-semibold text-foreground">Mobile number</label>
              <input
                id="track-order-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.slice(0, 16))}
                placeholder="10-digit mobile number"
                required
                minLength={10}
                maxLength={16}
                className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">You may enter the number with or without +91.</p>
            </div>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy || orderNumber.trim().length < 3 || phone.replace(/\D/g, '').length < 10}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find my order
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Prefer to sign in? <Link href="/account/login?next=/account" className="font-semibold text-primary hover:underline">Open your account</Link>
          </p>
        </section>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
