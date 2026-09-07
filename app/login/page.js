'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        setError(result.error || `Sign in failed (${response.status}).`);
        return;
      }

      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next && next.startsWith('/') ? next : '/admin');
    } catch (err) {
      setError(err?.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 text-white shadow-2xl">
        <h1 className="text-2xl font-bold">PinkBox</h1>
        <p className="mb-6 mt-1 text-sm text-gray-400">Website Admin Login</p>

        {error && (
          <div role="alert" aria-live="polite" className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm" htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none focus:border-pink-400"
        />

        <label className="mb-1 block text-sm" htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none focus:border-pink-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
