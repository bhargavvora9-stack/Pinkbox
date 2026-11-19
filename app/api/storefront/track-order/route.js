import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const canonicalPhone = (value) => {
  const digits = digitsOnly(value);
  return digits.length >= 10 ? digits.slice(-10) : '';
};

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Enter your order number and mobile number.' }, { status: 400 });
    }

    const orderNumber = String(body.order_number || '').trim().toUpperCase();
    const phone = canonicalPhone(body.phone);
    if (!/^[A-Z0-9-]{3,50}$/.test(orderNumber) || !phone) {
      return Response.json({ error: 'Enter a valid order number and the 10-digit mobile number used at checkout.' }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (settingsError || !settings?.company_id) {
      return Response.json({ error: 'Order tracking is temporarily unavailable. Please try again.' }, { status: 503 });
    }

    const { data: order, error } = await db
      .from('website_orders')
      .select('id,order_number,tracking_token,shipping_address')
      .eq('company_id', settings.company_id)
      .ilike('order_number', orderNumber)
      .maybeSingle();

    if (error) {
      console.error('Order tracking lookup failed:', error.message);
      return Response.json({ error: 'Order tracking is temporarily unavailable. Please try again.' }, { status: 503 });
    }

    const storedPhone = canonicalPhone(order?.shipping_address?.phone);
    if (!order || !order.tracking_token || !storedPhone || storedPhone !== phone) {
      // Use the same response for an unknown order and a phone mismatch.
      return Response.json({ error: 'We could not find an order with those details. Check the order number and mobile number used at checkout.' }, { status: 404 });
    }

    return Response.json(
      { tracking_url: `/orders/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.tracking_token)}` },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate' } }
    );
  } catch (error) {
    console.error('Order tracking failed:', error);
    return Response.json({ error: 'Order tracking is temporarily unavailable. Please try again.' }, { status: 500 });
  }
}
