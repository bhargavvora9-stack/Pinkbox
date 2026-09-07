'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    location.href = '/admin';
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 text-white shadow-2xl">
        <h1 className="text-2xl font-bold">PinkBox</h1>
        <p className="mb-6 mt-1 text-sm text-gray-400">Website Admin Login</p>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <label className="mb-1 block text-sm">Email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none" />

        <label className="mb-1 block text-sm">Password</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none" />

        <button disabled={loading} className="w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-gray-900">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
