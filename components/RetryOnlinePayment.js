'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      if (window.Razorpay) resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RetryOnlinePayment({ orderId, orderNumber, totalAmount, trackingToken }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function retryPayment() {
    if (busy) return;
    setBusy(true);
    setMessage('');

    try {
      if (!trackingToken) throw new Error('Order access could not be verified. Open the original order link.');

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Secure payment window could not be loaded. Please try again.');

      const createResponse = await fetch('/api/storefront/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', order_id: orderId, tracking_token: trackingToken }),
      });
      const paymentOrder = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) throw new Error(paymentOrder?.error || 'Unable to start payment.');

      await new Promise((resolve, reject) => {
        let settled = false;
        const settle = (callback, value) => {
          if (settled) return;
          settled = true;
          callback(value);
        };

        const checkout = new window.Razorpay({
          key: paymentOrder.key_id,
          order_id: paymentOrder.razorpay_order_id,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          name: 'PinkBox',
          description: `Order ${paymentOrder.order_number || orderNumber || ''}`,
          handler: async (payment) => {
            try {
              const verifyResponse = await fetch('/api/storefront/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'verify',
                  order_id: orderId,
                  tracking_token: trackingToken,
                  razorpay_order_id: payment.razorpay_order_id,
                  razorpay_payment_id: payment.razorpay_payment_id,
                  razorpay_signature: payment.razorpay_signature,
                }),
              });
              const verified = await verifyResponse.json().catch(() => ({}));
              if (!verifyResponse.ok || !verified.ok) {
                throw new Error(verified?.error || 'Payment verification is not complete yet.');
              }
              settle(resolve);
            } catch (error) {
              settle(reject, error);
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                const response = await fetch('/api/storefront/payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'cancel', order_id: orderId, tracking_token: trackingToken }),
                });
                const result = await response.json().catch(() => ({}));

                if (response.ok && result?.cancelled) {
                  settle(reject, new Error('No payment attempt was made. This unpaid order was cancelled.'));
                  router.refresh();
                  return;
                }

                settle(reject, new Error('Payment was not completed. Your order is still pending; you can retry payment here.'));
                router.refresh();
              } catch {
                settle(reject, new Error('Payment status could not be confirmed. Your order remains pending for safety; retry or refresh the order status.'));
                router.refresh();
              }
            },
          },
          theme: { color: '#d8899d' },
        });

        checkout.on?.('payment.failed', (event) => {
          const description = event?.error?.description;
          setMessage(description ? `Payment attempt failed: ${description}. You can retry this order.` : 'Payment attempt failed. You can retry this order.');
        });

        checkout.open();
      });

      setMessage('Payment verified successfully. Refreshing your order status…');
      router.refresh();
      window.location.assign(`/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(trackingToken)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#f2cbd5] bg-[#fff4f7] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-[#6a4b4e]">Complete your online payment</h2>
          <p className="mt-1 text-sm text-[#846f70]">
            Your order is saved. Retry payment here without creating another order.
          </p>
          <p className="mt-2 text-sm font-semibold text-[#6a4b4e]">
            Amount due: ₹{Number(totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <button
          type="button"
          onClick={retryPayment}
          disabled={busy}
          className="rounded-xl bg-[#d9295f] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Opening secure payment…' : 'Retry Payment'}
        </button>
      </div>
      {message && <p role="status" aria-live="polite" className="mt-3 text-sm text-[#7d4f5a]">{message}</p>}
    </section>
  );
}
