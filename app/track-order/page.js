'use client';

import { useState } from 'react';
import Link from 'next/link';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import { Package, Search, Loader2 } from 'lucide-react';

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
      <main className="container mx-auto max-w-2xl px-4 py-14">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">Track your order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the order number from your confirmation and the mobile number you used at checkout.
          </p>
        </div>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <form onSubmit={submit} className="space-y-4">
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
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {busy ? 'Checking…' : 'Check status'}
            </button>
          </form>
        </section>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
