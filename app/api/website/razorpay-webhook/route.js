import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

// Configure this exact URL in the Razorpay Dashboard → Settings → Webhooks:
//   https://<your-domain>/api/website/razorpay-webhook
// Events to enable: payment.captured, payment.failed
// Use the same secret you set as RAZORPAY_WEBHOOK_SECRET in Vercel.

export async function POST(request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return Response.json({ error: 'Webhook not configured.' }, { status: 503 });

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!signature || expected !== signature) return Response.json({ error: 'Invalid signature.' }, { status: 400 });

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const db = createAdminClient();

    if ((event === 'payment.captured' || event === 'order.paid') && paymentEntity?.order_id) {
      const { data: order } = await db.from('website_orders').select('id, company_id, payment_status').eq('razorpay_order_id', paymentEntity.order_id).maybeSingle();
      if (order && order.payment_status !== 'paid') {
        await db
          .from('website_orders')
          .update({ payment_status: 'paid', order_status: 'confirmed', razorpay_payment_id: paymentEntity.id, updated_at: new Date().toISOString() })
          .eq('id', order.id);
        await db.from('website_order_status_history').insert({
          company_id: order.company_id,
          order_id: order.id,
          status: 'confirmed',
          note: 'Payment confirmed via Razorpay webhook',
          created_at: new Date().toISOString(),
        });
      }
    }

    if (event === 'payment.failed' && paymentEntity?.order_id) {
      const { data: order } = await db.from('website_orders').select('id, payment_status').eq('razorpay_order_id', paymentEntity.order_id).maybeSingle();
      if (order && order.payment_status === 'pending') {
        await db.from('website_orders').update({ payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Razorpay webhook failed:', error);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
