'use client';

import { useState } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/storefront/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to subscribe.');
      setStatus(data.message || 'WELCOME10 is ready for your first order.');
      setEmail('');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="min-w-0 flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/65"
        />
        <button
          disabled={busy}
          className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#b85e7a] disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Get WELCOME10'}
        </button>
      </div>
      {status && <p className="mt-3 text-xs font-semibold text-white/90">{status}</p>}
    </div>
  );
}
