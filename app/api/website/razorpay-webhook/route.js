import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';
import { runWebsiteAutomations } from '@/lib/website-automation';

// Configure this exact URL in the Razorpay Dashboard → Settings → Webhooks:
//   https://<your-domain>/api/website/razorpay-webhook
// Events to enable: payment.captured, payment.failed
// Use the same secret you set as RAZORPAY_WEBHOOK_SECRET in Vercel.

export async function POST(request) {
  try {
    const db = createAdminClient();
    const { data: settings } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (!settings?.company_id) return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });

    const { data: pm } = await db
      .from('website_payment_methods')
      .select('config')
      .eq('company_id', settings.company_id)
      .eq('provider', 'razorpay')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Vercel's dedicated webhook secret is canonical; DB config is only a legacy fallback.
    const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || pm?.config?.webhook_secret || '').trim();
    if (!secret) return Response.json({ error: 'Webhook not configured.' }, { status: 503 });

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(String(expected || ''), 'utf8');
    const b = Buffer.from(String(signature || ''), 'utf8');
    if (!signature || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return Response.json({ error: 'Invalid signature.' }, { status: 400 });

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || null;
    const razorpayPaymentId = paymentEntity?.id || null;

    if ((event === 'payment.captured' || event === 'order.paid') && razorpayOrderId) {
      const { data: order, error: orderLookupError } = await db
        .from('website_orders')
        .select('id, company_id, payment_status, total_amount, razorpay_order_id')
        .eq('company_id', settings.company_id)
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle();

      if (orderLookupError) {
        console.error('Webhook order lookup failed:', orderLookupError.message);
        return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
      }

      if (order && order.payment_status !== 'paid') {
        const expectedAmountPaise = Math.round(Number(order.total_amount) * 100);
        const paymentMatches =
          Boolean(paymentEntity?.id) &&
          paymentEntity?.order_id === order.razorpay_order_id &&
          paymentEntity?.status === 'captured' &&
          paymentEntity?.currency === 'INR' &&
          Number.isSafeInteger(expectedAmountPaise) &&
          expectedAmountPaise >= 100 &&
          Number(paymentEntity?.amount) === expectedAmountPaise;

        const paidOrderMatches = event !== 'order.paid' || (
          orderEntity?.id === order.razorpay_order_id &&
          orderEntity?.status === 'paid' &&
          orderEntity?.currency === 'INR' &&
          Number(orderEntity?.amount) === expectedAmountPaise &&
          Number(orderEntity?.amount_paid) === expectedAmountPaise &&
          Number(orderEntity?.amount_due) === 0
        );

        if (!paymentMatches || !paidOrderMatches) {
          console.error('Razorpay captured webhook does not match the PinkBox order:', {
            orderId: order.id,
            razorpayOrderId,
            event,
            paymentStatus: paymentEntity?.status,
            paymentCurrency: paymentEntity?.currency,
            paymentAmount: paymentEntity?.amount,
          });
          return Response.json({ error: 'Captured payment does not match this order.' }, { status: 400 });
        }

        const { data: finalized, error: finalizeError } = await db.rpc('finalize_website_online_payment', {
          p_order_id: order.id,
          p_razorpay_payment_id: paymentEntity.id,
          p_razorpay_signature: null,
        });

        if (finalizeError) {
          console.error('Webhook payment finalization failed:', finalizeError.message);
          return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
        }

        // The finalizer locks the order and is idempotent. Only the first
        // successful transition should trigger confirmation automations.
        if (!finalized?.already_paid) {
          try {
            const { data: confirmedOrder } = await db
              .from('website_orders')
              .select('*')
              .eq('company_id', order.company_id)
              .eq('id', order.id)
              .maybeSingle();

            await runWebsiteAutomations({
              companyId: order.company_id,
              trigger: 'confirmed',
              order: confirmedOrder || {
                id: order.id,
                order_status: 'confirmed',
                payment_status: 'paid',
              },
            });
          } catch (automationError) {
            console.error('Webhook confirmation automation failed:', automationError);
          }
        }
      }
    }

    if (event === 'payment.failed') {
      // This is an individual payment-attempt failure, not a terminal order
      // state. Razorpay may send payment.captured later after a customer retry.
      // Keep the order pending; the checkout dismissal handler or admin can
      // explicitly cancel it once the customer has abandoned the payment flow.
      console.info('Razorpay payment attempt failed; order remains pending for retry.');
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Razorpay webhook failed:', error);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
