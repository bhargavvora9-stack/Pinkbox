import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';
import { runWebsiteAutomations } from '@/lib/website-automation';

async function getSettings(db) {
  const { data } = await db.from('website_settings').select('*').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  return data;
}

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

function safeSignatureEqual(expected, received) {
  const a = Buffer.from(String(expected || ''), 'utf8');
  const b = Buffer.from(String(received || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
        .select('id, order_number, total_amount, payment_method, payment_status, razorpay_order_id, order_status')
        .eq('id', b.order_id)
        .eq('company_id', c)
        .maybeSingle();
      if (error || !order) return Response.json({ error: 'Order not found.' }, { status: 404 });
      if (order.payment_method !== 'ONLINE') return Response.json({ error: 'This order is not set up for online payment.' }, { status: 400 });
      if (['cancelled', 'delivered', 'refunded'].includes(String(order.order_status || '').toLowerCase())) {
        return Response.json({ error: 'This order cannot accept a new payment.' }, { status: 409 });
      }
      if (order.payment_status === 'paid') return Response.json({ error: 'This order is already paid.' }, { status: 400 });

      const amountPaise = Math.round(Number(order.total_amount) * 100);
      if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
        await db.rpc('cancel_website_online_order', { p_order_id: order.id, p_reason: 'Invalid online payment amount' });
        return Response.json({ error: 'Order amount is invalid.' }, { status: 400 });
      }

      const { keyId, keySecret } = await getRazorpayCreds(db, c);
      if (!keyId || !keySecret) return Response.json({ error: 'Online payment is not configured yet. Please choose Cash on Delivery.' }, { status: 503 });

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
        await db.rpc('cancel_website_online_order', { p_order_id: order.id, p_reason: 'Razorpay order creation failed' });
        return Response.json({ error: rzData?.error?.description || 'Unable to start payment right now.' }, { status: 502 });
      }

      const { error: orderUpdateError } = await db
        .from('website_orders')
        .update({ razorpay_order_id: rzData.id, updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('company_id', c);
      if (orderUpdateError) {
        console.error('Failed to persist Razorpay order id:', orderUpdateError.message);
        await db.rpc('cancel_website_online_order', { p_order_id: order.id, p_reason: 'Unable to persist Razorpay order reference' });
        return Response.json({ error: 'Unable to prepare payment. Please try again.' }, { status: 500 });
      }

      return Response.json({
        razorpay_order_id: rzData.id,
        amount: amountPaise,
        currency: 'INR',
        key_id: keyId,
        order_number: order.order_number,
      });
    }

    if (b.action === 'cancel') {
      if (!b.order_id) return Response.json({ error: 'order_id is required.' }, { status: 400 });
      const { data: order, error } = await db
        .from('website_orders')
        .select('id, company_id, payment_method, payment_status, order_status')
        .eq('id', b.order_id)
        .eq('company_id', c)
        .maybeSingle();
      if (error || !order) return Response.json({ error: 'Order not found.' }, { status: 404 });
      if (order.payment_method !== 'ONLINE') return Response.json({ error: 'This order does not use online payment.' }, { status: 400 });
      if (order.payment_status === 'paid') return Response.json({ error: 'This payment is already completed.' }, { status: 409 });
      const { data: cancelled, error: cancelError } = await db.rpc('cancel_website_online_order', {
        p_order_id: order.id,
        p_reason: 'Customer closed the Razorpay payment window',
      });
      if (cancelError) return Response.json({ error: cancelError.message.replace(/^.*ERROR:\s*/, '') || 'Unable to cancel unpaid order.' }, { status: 409 });
      return Response.json({ ok: true, cancelled: Boolean(cancelled?.cancelled || cancelled?.already_cancelled) });
    }

    if (b.action === 'verify') {
      const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
      if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return Response.json({ error: 'Missing payment verification details.' }, { status: 400 });
      }
      const { keyId, keySecret } = await getRazorpayCreds(db, c);
      if (!keyId || !keySecret) return Response.json({ error: 'Online payment is not configured.' }, { status: 503 });

      const { data: order, error } = await db
        .from('website_orders')
        .select('id, company_id, total_amount, razorpay_order_id, payment_method, payment_status, order_status')
        .eq('id', order_id)
        .eq('company_id', c)
        .maybeSingle();
      if (error || !order) return Response.json({ error: 'Order not found.' }, { status: 404 });
      if (order.payment_method !== 'ONLINE') return Response.json({ error: 'This order does not use online payment.' }, { status: 400 });
      if (order.razorpay_order_id !== razorpay_order_id) return Response.json({ error: 'Order mismatch.' }, { status: 400 });
      if (order.payment_status === 'paid') return Response.json({ ok: true, already_paid: true });
      if (['cancelled', 'refunded'].includes(String(order.order_status || '').toLowerCase())) {
        return Response.json({ error: 'This order cannot be paid.' }, { status: 409 });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      });
      const paymentEntity = await paymentRes.json().catch(() => null);
      if (!paymentRes.ok) {
        console.error('Razorpay payment fetch failed:', paymentEntity);
        return Response.json({ error: 'Unable to verify payment status with Razorpay. Please try again.' }, { status: 502 });
      }
      const expectedAmountPaise = Math.round(Number(order.total_amount) * 100);
      if (
        paymentEntity?.order_id !== razorpay_order_id ||
        paymentEntity?.currency !== 'INR' ||
        Number(paymentEntity?.amount) !== expectedAmountPaise ||
        paymentEntity?.status !== 'captured'
      ) {
        return Response.json({ error: 'Payment is not confirmed as captured yet. Please wait a moment and try again.' }, { status: 409 });
      }

      const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (!safeSignatureEqual(expected, razorpay_signature)) {
        console.error('Razorpay signature mismatch for order:', order.id);
        return Response.json({ error: 'Payment verification failed. The order was not marked paid.' }, { status: 400 });
      }

      const { data: finalized, error: paidUpdateError } = await db.rpc('finalize_website_online_payment', {
        p_order_id: order.id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_razorpay_signature: razorpay_signature,
      });
      if (paidUpdateError) {
        console.error('Payment finalization failed:', paidUpdateError.message);
        return Response.json({ error: paidUpdateError.message.replace(/^.*ERROR:\s*/, '') || 'Payment was verified but order update failed. Please contact support.' }, { status: 500 });
      }

      try {
        const { data: confirmedOrder } = await db.from('website_orders').select('*').eq('company_id', c).eq('id', order.id).maybeSingle();
        if (!finalized?.already_paid) {
          await runWebsiteAutomations({ companyId: c, trigger: 'confirmed', order: confirmedOrder || { id: order.id, order_status: 'confirmed', customer_email: null, order_number: null } });
        }
      } catch (automationError) {
        console.error('Payment confirmation automation failed:', automationError);
      }

      return Response.json({ ok: true, already_paid: Boolean(finalized?.already_paid) });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('Razorpay payment route failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Payment request failed.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
