'use client';
import {useState} from 'react';
import Link from 'next/link';

const safeNext = () => {
  try {
    const value = new URLSearchParams(window.location.search).get('next') || '/account';
    return value === '/admin' || value.startsWith('/admin/') ? value : '/account';
  } catch {
    return '/account';
  }
};

export default function Login(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');

  async function submit(e){
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({email: email.trim(), password, next: safeNext()}),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result?.error || 'Unable to sign in. Please try again.');
        setBusy(false);
        return;
      }

      window.location.href = safeNext();
    } catch {
      setError('Unable to sign in right now. Please try again.');
      setBusy(false);
    }
  }

  return <main className="min-h-screen grid place-items-center bg-[#fff7fa] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"><Link href="/" className="text-sm font-semibold text-[#d9295f]">← PinkBox</Link><h1 className="mt-8 text-3xl font-bold">Welcome back</h1><p className="mt-2 text-gray-500">Sign in to your PinkBox account.</p><input className="mt-8 w-full rounded-xl border p-3" required autoComplete="email" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="mt-3 w-full rounded-xl border p-3" required autoComplete="current-password" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="mt-3 text-sm text-red-600">{error}</p>}<button className="mt-5 w-full rounded-xl bg-[#d9295f] p-3 font-semibold text-white" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><p className="mt-5 text-sm text-gray-600">New customer? <Link className="font-semibold text-[#d9295f]" href="/account/signup">Create account</Link></p></form></main>
}