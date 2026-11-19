'use client';
import {createClient} from '@/lib/supabase-browser';
export default function LogoutButton(){const logout=async()=>{await createClient().auth.signOut();window.location.href='/login'};return <button onClick={logout} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary">Sign out</button>}
