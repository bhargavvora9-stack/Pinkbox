import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function authClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll() { return jar.getAll(); }, setAll() {} },
  });
}

export async function GET() {
  try {
    const auth = await authClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    if (settingsError) return Response.json({ error: 'Unable to load store configuration.' }, { status: 500 });
    if (!settings?.company_id) return Response.json({ error: 'Store unavailable' }, { status: 404 });

    const { data: orders, error } = await db
      .from('website_orders')
      .select('id,order_number,total_amount,order_status,payment_status,created_at,shipping_address')
      .eq('company_id', settings.company_id)
      .eq('customer_email', user.email)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return Response.json({ error: 'Unable to load orders.' }, { status: 500 });

    return Response.json(
      { orders: orders || [] },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', Vary: 'Cookie' } }
    );
  } catch (error) {
    console.error('Account orders GET failed:', error);
    return Response.json({ error: 'Unable to load orders.' }, { status: 500 });
  }
}
