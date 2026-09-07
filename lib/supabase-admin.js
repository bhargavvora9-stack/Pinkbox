import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY. Never import this from a client component — the service role
// key bypasses Row Level Security entirely. It must be set as SUPABASE_SERVICE_ROLE_KEY
// (no NEXT_PUBLIC_ prefix) so Next.js never ships it to the browser bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
