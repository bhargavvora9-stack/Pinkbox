import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase-admin';
import { runWebsiteAutomations } from '@/lib/website-automation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function safeSignatureEqual(expected, received) {
  const signature = String(received || '');
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const a = Buffer.from(String(expected || ''), 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getWebhookSecret(db, companyId) {
  const { data, error } = await db
    .from('website_payment_methods')
    .select('config')
    .eq('company_id', companyId)
    .eq('provider', 'razorpay')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const config = data?.config && typeof data.config === 'object' ? data.config : {};
  if (process.env.VERCEL_ENV !== 'production') {
    return String(process.env.RAZORPAY_PREVIEW_WEBHOOK_SECRET || '').trim();
  }
  return String(
    config.webhook_secret ||
    config.razorpay_webhook_secret ||
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    ''
  ).trim();
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    if (!rawBody) return Response.json({ error: 'Empty webhook payload.' }, { status: 400 });

    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (settingsError || !settings?.company_id) {
      return Response.json({ error: 'PinkBox store is not configured.' }, { status: 503 });
    }

    const webhookSecret = await getWebhookSecret(db, settings.company_id);
    if (!webhookSecret) {
      return Response.json({ error: 'Razorpay webhook secret is not configured.' }, { status: 503 });
    }

    const receivedSignature = request.headers.get('x-razorpay-signature') || '';
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (!safeSignatureEqual(expectedSignature, receivedSignature)) {
      return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid webhook JSON.' }, { status: 400 });
    }

    if (!['payment.failed', 'payment.captured', 'order.paid'].includes(String(event?.event || ''))) {
      return Response.json({ ok: true, ignored: true });
    }

    const payment = event?.payload?.payment?.entity;
    const razorpayOrderId = String(payment?.order_id || '').trim();
    const razorpayPaymentId = String(payment?.id || '').trim();
    if (!razorpayOrderId || !razorpayPaymentId) {
      return Response.json({ error: 'Captured payment details are missing.' }, { status: 400 });
    }
    const isFailedEvent = String(event?.event || '') === 'payment.failed';
    const expectedPaymentStatus = isFailedEvent ? 'failed' : 'captured';
    if (String(payment?.status || '').toLowerCase() !== expectedPaymentStatus) {
      return Response.json({ ok: true, ignored: true });
    }

    const { data: order, error: orderError } = await db
      .from('website_orders')
      .select('id,company_id,order_number,total_amount,payment_method,payment_status,order_status,razorpay_order_id')
      .eq('company_id', settings.company_id)
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();

    if (orderError) {
      console.error('Razorpay webhook order lookup failed:', orderError.message);
      return Response.json({ error: 'Unable to find the linked order.' }, { status: 500 });
    }
    if (!order) return Response.json({ ok: true, ignored: true });
    if (order.payment_method !== 'ONLINE') return Response.json({ ok: true, ignored: true });
    if (order.payment_status === 'paid') return Response.json({ ok: true, already_paid: true });

    const expectedAmountPaise = Math.round(Number(order.total_amount) * 100);
    if (
      payment.currency !== 'INR' ||
      !Number.isSafeInteger(expectedAmountPaise) ||
      Number(payment.amount) !== expectedAmountPaise
    ) {
      console.error('Razorpay webhook amount mismatch for order:', order.id);
      return Response.json({ error: 'Captured payment does not match the order amount.' }, { status: 400 });
    }

    if (isFailedEvent) {
      if (['cancelled', 'returned', 'refunded'].includes(String(order.order_status || '').toLowerCase())) {
        return Response.json({ ok: true, ignored: true });
      }

      // A failed attempt is not an order cancellation. Keep the order pending
      // so the customer can retry payment, but make the payment state truthful.
      // The conditional update prevents a late failure webhook from downgrading
      // an order that has already been paid.
      const { data: failedUpdate, error: failedUpdateError } = await db
        .from('website_orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('company_id', settings.company_id)
        .eq('id', order.id)
        .eq('payment_method', 'ONLINE')
        .eq('order_status', 'pending')
        .neq('payment_status', 'paid')
        .select('id')
        .maybeSingle();

      if (failedUpdateError) {
        console.error('Razorpay failed-payment update failed:', failedUpdateError.message);
        return Response.json({ error: 'Unable to record the failed payment attempt.' }, { status: 500 });
      }

      return Response.json({ ok: true, payment_failed: true, updated: Boolean(failedUpdate) });
    }

    if (['cancelled', 'returned', 'refunded'].includes(String(order.order_status || '').toLowerCase())) {
      console.error('Captured Razorpay payment belongs to a cancelled or returned order:', order.id);
      return Response.json({ ok: true, manual_review_required: true });
    }

    const { data: finalized, error: finalizeError } = await db.rpc('finalize_website_online_payment', {
      p_order_id: order.id,
      p_razorpay_payment_id: razorpayPaymentId,
      p_razorpay_signature: null,
    });

    if (finalizeError) {
      console.error('Razorpay webhook finalization failed:', finalizeError.message);
      return Response.json({ error: 'Unable to finalize the paid order.' }, { status: 500 });
    }

    if (!finalized?.already_paid) {
      try {
        const { data: confirmedOrder } = await db
          .from('website_orders')
          .select('*')
          .eq('company_id', settings.company_id)
          .eq('id', order.id)
          .maybeSingle();
        await runWebsiteAutomations({
          companyId: settings.company_id,
          trigger: 'confirmed',
          order: confirmedOrder || { id: order.id, order_number: order.order_number, order_status: 'confirmed' },
        });
      } catch (automationError) {
        console.error('Razorpay webhook confirmation automation failed:', automationError);
      }
    }

    return Response.json({ ok: true, already_paid: Boolean(finalized?.already_paid) });
  } catch (error) {
    console.error('Razorpay webhook failed:', error);
    return Response.json({ error: 'Unable to process Razorpay webhook.' }, { status: 500 });
  }
}
