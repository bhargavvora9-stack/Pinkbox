import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

// Configure this exact URL in the Razorpay Dashboard → Settings → Webhooks:
//   https://<your-domain>/api/website/razorpay-webhook
// Events to enable: payment.captured, payment.failed
// Use the same secret you set as RAZORPAY_WEBHOOK_SECRET in Vercel.

export async function POST(request) {
  try {
    const db = createAdminClient();
    // Single-tenant store: there is one active Razorpay row, configured from /admin/payments.
    const { data: pm } = await db.from('website_payment_methods').select('config').eq('provider', 'razorpay').eq('is_active', true).maybeSingle();
    const secret = pm?.config?.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET;
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

    if ((event === 'payment.captured' || event === 'order.paid') && paymentEntity?.order_id) {
      const { data: order } = await db
        .from('website_orders')
        .select('id, payment_status')
        .eq('razorpay_order_id', paymentEntity.order_id)
        .maybeSingle();
      if (order && order.payment_status !== 'paid') {
        const { error } = await db.rpc('finalize_website_online_payment', {
          p_order_id: order.id,
          p_razorpay_payment_id: paymentEntity.id || null,
          p_razorpay_signature: null,
        });
        if (error) {
          console.error('Webhook payment finalization failed:', error.message);
          return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
        }
      }
    }

    if (event === 'payment.failed' && paymentEntity?.order_id) {
      const { data: order } = await db
        .from('website_orders')
        .select('id, payment_status, order_status')
        .eq('razorpay_order_id', paymentEntity.order_id)
        .maybeSingle();
      if (order && order.payment_status !== 'paid' && order.order_status === 'pending') {
        const { error } = await db.rpc('cancel_website_online_order', {
          p_order_id: order.id,
          p_reason: 'Razorpay payment failed',
        });
        if (error) {
          console.error('Webhook payment cancellation failed:', error.message);
          return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Razorpay webhook failed:', error);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
