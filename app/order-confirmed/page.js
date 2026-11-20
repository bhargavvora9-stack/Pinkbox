import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, CreditCard, Package, Truck, MessageCircle } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase-admin';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const label = (value) => String(value || 'pending')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Status({ icon: Icon, title, value }) {
  return (
    <div className="rounded-xl bg-secondary/40 p-4 text-center">
      <Icon className="mx-auto h-6 w-6 text-primary" />
      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: 'Thank You — Order Placed | Pink Box',
    description: 'Your Pink Box order has been placed. View your order and payment status.',
    robots: { index: false, follow: false },
    openGraph: {
      title: 'Thank You — Order Placed | Pink Box',
      description: 'Your Pink Box order has been placed.',
      type: 'website',
    },
    twitter: { card: 'summary', title: 'Thank You — Order Placed | Pink Box' },
  };
}

export default async function OrderConfirmedPage({ searchParams }) {
  const query = await searchParams;
  const orderId = typeof query?.id === 'string' ? query.id.trim() : '';
  const token = typeof query?.token === 'string' ? query.token.trim() : '';

  // Require the same unguessable token used by secure order tracking.
  if (!orderId || !token) notFound();

  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id,website_name,whatsapp_number')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();
  if (!settings) notFound();

  const { data: order, error: orderError } = await db
    .from('website_orders')
    .select('id,order_number,total_amount,order_status,payment_status,payment_method,created_at,tracking_token')
    .eq('company_id', settings.company_id)
    .eq('id', orderId)
    .eq('tracking_token', token)
    .maybeSingle();

  if (orderError || !order) notFound();

  const { data: items, error: itemsError } = await db
    .from('website_order_items')
    .select('id,product_name,quantity,line_total')
    .eq('company_id', settings.company_id)
    .eq('order_id', order.id)
    .order('id');
  if (itemsError) throw new Error('Unable to load the order items.');

  const orderStatus = label(order.order_status);
  const paymentStatus = label(order.payment_status);
  const normalizedOrderStatus = String(order.order_status || '').toLowerCase();
  const deliveryStatus = ['shipped', 'delivered', 'cancelled', 'returned'].includes(normalizedOrderStatus)
    ? label(normalizedOrderStatus)
    : 'Preparing';

  const phone = String(settings.whatsapp_number || '').replace(/\D/g, '');
  const message = [
    'Hi Pink Box, I just placed an order.',
    'Order ID: #' + order.order_number,
    items?.length
      ? 'Products: ' + items.map((item) => item.product_name + ' x' + item.quantity).join(', ')
      : null,
    'Payment status: ' + paymentStatus,
  ].filter(Boolean).join('\n');
  const whatsappHref = phone
    ? 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader settings={settings} />
      <main className="mx-auto max-w-2xl px-4 py-14 md:py-16">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 font-display text-4xl font-bold text-foreground">
            Thank you for your order!
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your order has been placed successfully. You can check the latest order and delivery status below.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Order ID</p>
          <p className="text-2xl font-bold text-foreground">#{order.order_number}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed {new Date(order.created_at).toLocaleString('en-IN')}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Status icon={Package} title="Order" value={orderStatus} />
            <Status icon={CreditCard} title="Payment" value={paymentStatus} />
            <Status icon={Truck} title="Delivery" value={deliveryStatus} />
          </div>

          {items?.length > 0 && (
            <ul className="mt-6 divide-y divide-border border-t border-border">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="text-foreground">{item.product_name}</span>
                  <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-right font-semibold text-foreground">
            Total: {money(order.total_amount)}
          </p>

          <div className="mt-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Keep this order link safe. It gives access to your order status and invoice.
          </div>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send order on WhatsApp
            </a>
          )}
          <Link
            href={'/orders/' + order.id + '?token=' + encodeURIComponent(token)}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            Track order
          </Link>
          <Link
            href="/shop"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            Continue shopping
          </Link>
        </div>
      </main>
      <ZipReferenceFooter settings={settings} />
    </div>
  );
}