'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase-browser';
import Link from 'next/link';

export default function Signup(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');

  async function submit(e){
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const {data,error}=await createClient().auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim(),display_name:name.trim()}}});
    if(error)setError(error.message);
    else if(data.session)window.location.href='/account';
    else setMessage('Account created. Please verify your email, then sign in.');
    setBusy(false);
  }

  return <main className="min-h-screen grid place-items-center bg-[#fff7fa] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"><Link href="/" className="text-sm font-semibold text-[#d9295f]">← PinkBox</Link><h1 className="mt-8 text-3xl font-bold">Create account</h1><input className="mt-8 w-full rounded-xl border p-3" required autoComplete="name" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/><input className="mt-3 w-full rounded-xl border p-3" required autoComplete="email" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="mt-3 w-full rounded-xl border p-3" required minLength={8} autoComplete="new-password" type="password" placeholder="Password (8+ characters)" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="mt-3 text-sm text-red-600">{error}</p>}{message&&<p className="mt-3 text-sm text-green-700">{message}</p>}<button className="mt-5 w-full rounded-xl bg-[#d9295f] p-3 font-semibold text-white" disabled={busy}>{busy?'Creating…':'Create account'}</button><p className="mt-5 text-sm text-gray-600">Already registered? <Link className="font-semibold text-[#d9295f]" href="/login?next=/account">Sign in</Link></p></form></main>
}