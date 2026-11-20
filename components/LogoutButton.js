'use client';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    await createClient().auth.signOut();
    router.replace('/login');
  };

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      Sign out
    </button>
  );
}
