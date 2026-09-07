'use client';
import {createClient} from '@/lib/supabase-browser';
export default function LogoutButton(){const logout=async()=>{await createClient().auth.signOut();window.location.href='/login'};return <button onClick={logout} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white">Sign out</button>}
