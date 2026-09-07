'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message || 'Invalid email or password.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, role, active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.active === false ||
        !profile.company_id ||
        !['super_admin', 'admin'].includes(profile.role)
      ) {
        await supabase.auth.signOut();
        setError('You do not have Website Admin access.');
        return;
      }

      const next = new URLSearchParams(window.location.search).get('next');
      window.location.replace(next && next.startsWith('/') ? next : '/website');
    } catch (err) {
      setError(err?.message || 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 text-white shadow-2xl">
        <h1 className="text-2xl font-bold">PinkBox</h1>
        <p className="mb-6 mt-1 text-sm text-gray-400">Website Admin Login</p>
        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        <label className="mb-1 block text-sm">Email</label>
        <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none" />
        <label className="mb-1 block text-sm">Password</label>
        <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none" />
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-gray-900 disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
