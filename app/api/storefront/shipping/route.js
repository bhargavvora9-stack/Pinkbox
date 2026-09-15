import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    if (settingsError) return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
    if (!settings?.company_id) return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
    const subtotal = Number(body.subtotal || 0);
    const discount = Number(body.discount || 0);
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(discount) || discount < 0) {
      return Response.json({ error: 'Invalid cart totals.' }, { status: 400 });
    }

    const items = Array.isArray(body.items)
      ? body.items.map((x) => ({ product_id: x.product_id || x.id, quantity: Number(x.quantity || 1) }))
      : [];

    const { data, error } = await db.rpc('calculate_website_shipping', {
      p_company_id: settings.company_id,
      p_subtotal: subtotal,
      p_discount: discount,
      p_state: String(body.state || '').trim(),
      p_pincode: String(body.pincode || '').trim(),
      p_items: items,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ shipping: Number(data || 0) });
  } catch (error) {
    console.error('Shipping quote failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to calculate shipping.' }, { status: 500 });
  }
}
