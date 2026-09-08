import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

async function getSettings(db) {
  const { data } = await db.from('website_settings').select('*').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  return data;
}

// Looks up Razorpay keys saved by the admin in /admin/payments (website_payment_methods,
// provider = 'razorpay'). Falls back to Vercel env vars if no row is configured yet, so
// either setup path works.
async function getRazorpayCreds(db, companyId) {
  const { data } = await db
    .from('website_payment_methods')
    .select('config')
    .eq('company_id', companyId)
    .eq('provider', 'razorpay')
    .eq('is_active', true)
    .maybeSingle();
  const cfg = data?.config || {};
  return {
    keyId: cfg.key_id || cfg.razorpay_key_id || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    keySecret: cfg.key_secret || cfg.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || '',
  };
}

export async function POST(request) {
  try {
    const db = createAdminClient();
    const settings = await getSettings(db);
    if (!settings) return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });
    if (!settings.online_payment_enabled) return Response.json({ error: 'Online payment is not enabled.' }, { status: 400 });

    const b = await request.json().catch(() => null);
    if (!b || !b.action) return Response.json({ error: 'Invalid request.' }, { status: 400 });
    const c = settings.company_id;

    if (b.action === 'create') {
      if (!b.order_id) return Response.json({ error: 'order_id is required.' }, { status: 400 });

      const { data: order, error } = await db
        .from('website_orders')
        .select('id, order_number, total_amount, payment_method, payment_status, razorpay_order_id')
        .eq('id', b.order_id)
        .eq('company_id', c)
        .maybeSingle();
      if (error || !order) return Response.json({ error: 'Order not found.' }, { status: 404 });
      if (order.payment_method !== 'ONLINE') return Response.json({ error: 'This order is not set up for online payment.' }, { status: 400 });
      if (order.payment_status === 'paid') return Response.json({ error: 'This order is already paid.' }, { status: 400 });

      const amountPaise = Math.round(Number(order.total_amount) * 100);
      if (!amountPaise || amountPaise < 100) return Response.json({ error: 'Order amount is invalid.' }, { status: 400 });

      const { keyId, keySecret } = await getRazorpayCreds(db, c);
      if (!keyId || !keySecret) return Response.json({ error: 'Online payment is not configured yet. Please choose Cash on Delivery.' }, { status: 503 });

      // Reuse existing Razorpay order if one was already created for this order.
      if (order.razorpay_order_id) {
        return Response.json({
          razorpay_order_id: order.razorpay_order_id,
          amount: amountPaise,
          currency: 'INR',
          key_id: keyId,
          order_number: order.order_number,
        });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: order.order_number,
          notes: { website_order_id: order.id, order_number: order.order_number },
        }),
      });
      const rzData = await rzRes.json();
      if (!rzRes.ok) {
        console.error('Razorpay order create failed:', rzData);
        return Response.json({ error: rzData?.error?.description || 'Unable to start payment right now.' }, { status: 502 });
      }

      await db.from('website_orders').update({ razorpay_order_id: rzData.id, updated_at: new Date().toISOString() }).eq('id', order.id).eq('company_id', c);

      return Response.json({
        razorpay_order_id: rzData.id,
        amount: amountPaise,
        currency: 'INR',
        key_id: keyId,
        order_number: order.order_number,
      });
    }

    if (b.action === 'verify') {
      const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
      if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return Response.json({ error: 'Missing payment verification details.' }, { status: 400 });
      }
      const { keySecret } = await getRazorpayCreds(db, c);
      if (!keySecret) return Response.json({ error: 'Online payment is not configured.' }, { status: 503 });

      const { data: order, error } = await db
        .from('website_orders')
        .select('id, company_id, razorpay_order_id, payment_status')
        .eq('id', order_id)
        .eq('company_id', c)
        .maybeSingle();
      if (error || !order) return Response.json({ error: 'Order not found.' }, { status: 404 });
      if (order.razorpay_order_id !== razorpay_order_id) return Response.json({ error: 'Order mismatch.' }, { status: 400 });

      const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (expected !== razorpay_signature) {
        await db.from('website_orders').update({ payment_status: 'failed', razorpay_payment_id, updated_at: new Date().toISOString() }).eq('id', order.id).eq('company_id', c);
        return Response.json({ error: 'Payment verification failed.' }, { status: 400 });
      }

      if (order.payment_status !== 'paid') {
        await db
          .from('website_orders')
          .update({ payment_status: 'paid', order_status: 'confirmed', razorpay_payment_id, razorpay_signature, updated_at: new Date().toISOString() })
          .eq('id', order.id)
          .eq('company_id', c);
        await db.from('website_order_status_history').insert({
          company_id: c,
          order_id: order.id,
          status: 'confirmed',
          note: 'Payment received via Razorpay',
          created_at: new Date().toISOString(),
        });
      }

      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('Razorpay payment route failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Payment request failed.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
