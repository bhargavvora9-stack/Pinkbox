import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (settingsError || !settings?.company_id) {
      return Response.json({ offer: null }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }

    const { data: offers, error } = await db
      .from('website_discounts')
      .select('id,name,code,discount_type,value,minimum_order_amount,starts_at,ends_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return Response.json({ offer: null });

    const now = Date.now();
    const offer = (offers || []).find((item) =>
      Boolean(item.code) &&
      (!item.starts_at || new Date(item.starts_at).getTime() <= now) &&
      (!item.ends_at || new Date(item.ends_at).getTime() >= now)
    ) || null;

    return Response.json({ offer }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Public exit offer failed:', error);
    return Response.json({ offer: null });
  }
}
