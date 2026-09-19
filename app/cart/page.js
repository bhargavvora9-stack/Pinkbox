'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const readCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
const getSessionId = () => {
  try {
    const current = sessionStorage.getItem('pinkbox_session_id');
    if (current) return current;
    const id = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `pb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('pinkbox_session_id', id);
    return id;
  } catch { return undefined; }
};

const blankForm = { name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', note: '', coupon_code: '' };

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState('COD');
  const [quote, setQuote] = useState({ subtotal: 0, discount: 0, shipping: 0, total: 0, coupon: null });
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [form, setForm] = useState(blankForm);

  useEffect(() => {
    setItems(readCart());
    getSessionId();
    try {
      const savedForm = JSON.parse(sessionStorage.getItem('pinkbox_checkout_form') || 'null');
      if (savedForm && typeof savedForm === 'object') setForm({ ...blankForm, ...savedForm });
      const savedPayment = sessionStorage.getItem('pinkbox_payment_method');
      if (savedPayment === 'COD' || savedPayment === 'ONLINE') setPayment(savedPayment);
    } catch {}
    setHydrated(true);
    fetch('/api/storefront', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw Error(j.error || 'Store unavailable');
        setStore(j.settings || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('pinkbox_cart', JSON.stringify(items));
    window.dispatchEvent(new Event('pinkbox-cart-updated'));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem('pinkbox_checkout_form', JSON.stringify(form));
      sessionStorage.setItem('pinkbox_payment_method', payment);
    } catch {}
  }, [form, payment, hydrated]);

  const localSubtotal = useMemo(
    () => items.reduce((s, x) => s + Number(x.price || 0) * Number(x.quantity || 0), 0),
    [items]
  );

  const codAllowed = useMemo(() => {
    const base = Boolean(store?.cod_enabled);
    return items.every((x) => x.cod_override === true || x.cod_override === false ? x.cod_override : base);
  }, [items, store]);

  const onlineEnabled = useMemo(() => {
    const base = Boolean(store?.online_payment_enabled);
    return items.every((x) => x.online_payment_override === true || x.online_payment_override === false ? x.online_payment_override : base);
  }, [items, store]);

  useEffect(() => {
    if (!codAllowed && payment === 'COD' && onlineEnabled) setPayment('ONLINE');
    if (!onlineEnabled && payment === 'ONLINE' && codAllowed) setPayment('COD');
  }, [codAllowed, onlineEnabled, payment]);

  useEffect(() => {
    let cancelled = false;
    if (!items.length) {
      setQuote({ subtotal: 0, discount: 0, shipping: 0, total: 0, coupon: null });
      return undefined;
    }
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const r = await fetch('/api/storefront/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtotal: localSubtotal,
            state: form.state,
            pincode: form.pincode,
            coupon_code: form.coupon_code,
            items,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw Error(j.error || 'Unable to calculate checkout.');
        if (!cancelled) {
          setQuote({
            subtotal: Number(j.subtotal || 0),
            discount: Number(j.discount || 0),
            shipping: Number(j.shipping || 0),
            total: Number(j.total || 0),
            coupon: j.coupon || null,
          });
          setError(j.coupon && !j.coupon.valid ? j.coupon.message : '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [items, localSubtotal, form.state, form.pincode, form.coupon_code]);

  useEffect(() => {
    if (!items.length || (!form.phone.trim() && !form.email.trim())) return undefined;
    const timer = setTimeout(() => {
      fetch('/api/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abandoned_cart',
          session_id: getSessionId(),
          name: form.name,
          phone: form.phone,
          email: form.email,
          items,
          subtotal: quote.total || localSubtotal,
        }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [items, form.name, form.phone, form.email, quote.total, localSubtotal]);

  const total = Number(quote.total || localSubtotal);

  const updateQty = (id, q) =>
    setItems((a) => a.map((x) => x.id === id ? { ...x, quantity: Math.max(1, Number(q) || 1) } : x));

  const onField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return Boolean(window.Razorpay);
  }

  async function cancelOnlineOrder(orderId) {
    try {
      await fetch('/api/storefront/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', order_id: orderId }),
      });
    } catch {}
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!items.length) throw Error('Your cart is empty.');
      if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
        throw Error('Name, phone and address are required.');
      }
      if (form.coupon_code && quote.coupon && !quote.coupon.valid) {
        throw Error(quote.coupon.message || 'Please remove or correct the coupon code.');
      }
      if (!['COD', 'ONLINE'].includes(payment)) throw Error('Please select a payment method.');

      const orderRes = await fetch('/api/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, payment_method: payment, items, session_id: getSessionId() }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok || !order?.order_id) throw Error(order?.error || 'Unable to place the order.');

      const trackingUrl = `/orders/${order.order_id}${order.tracking_token ? `?token=${encodeURIComponent(order.tracking_token)}` : ''}`;

      if (payment !== 'ONLINE') {
        localStorage.removeItem('pinkbox_cart');
        sessionStorage.removeItem('pinkbox_checkout_form');
        sessionStorage.removeItem('pinkbox_payment_method');
        setItems([]);
        window.location.href = trackingUrl;
        return;
      }

      try {
        if (!(await loadRazorpay())) throw Error('Online payment could not be loaded.');
      } catch (loadError) {
        await cancelOnlineOrder(order.order_id);
        throw Error(`${loadError.message} Please choose Cash on Delivery.`);
      }

      const pr = await fetch('/api/storefront/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', order_id: order.order_id }),
      });
      const pd = await pr.json();
      if (!pr.ok) throw Error(pd?.error || 'Unable to start online payment.');

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: pd.key_id,
          order_id: pd.razorpay_order_id,
          amount: pd.amount,
          currency: pd.currency,
          name: store?.website_name || 'PinkBox',
          description: `Order ${pd.order_number || ''}`,
          prefill: { name: form.name, email: form.email, contact: form.phone },
          handler: async (r) => {
            try {
              const vr = await fetch('/api/storefront/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'verify',
                  order_id: order.order_id,
                  razorpay_order_id: r.razorpay_order_id,
                  razorpay_payment_id: r.razorpay_payment_id,
                  razorpay_signature: r.razorpay_signature,
                }),
              });
              const v = await vr.json();
              if (!vr.ok || !v.ok) throw Error(v?.error || 'Payment verification failed.');
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: async () => {
              await cancelOnlineOrder(order.order_id);
              reject(Error('Payment window closed. The unpaid order was cancelled.'));
            },
          },
          theme: { color: '#d8899d' },
        });
        checkout.open();
      });

      localStorage.removeItem('pinkbox_cart');
      sessionStorage.removeItem('pinkbox_checkout_form');
      sessionStorage.removeItem('pinkbox_payment_method');
      setItems([]);
      window.location.href = trackingUrl;
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] p-8 text-[#6a4b4e]">Loading your cart…</main>;

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-[#c36f83]">← PinkBox</Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#846f70] sm:inline">Secure checkout</span>
            <Link href="/account" className="text-sm font-semibold">Account</Link>
          </div>
        </div>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#c36f83]">Your selection</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Shopping cart</h1>
          <p className="mt-2 text-[#846f70]">Review your items, save your delivery details, and complete your PinkBox order.</p>
        </header>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {!items.length ? (
          <section className="mt-8 rounded-3xl border border-[#eadfd9] bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold">Your cart is empty</h2>
            <p className="mt-2 text-[#846f70]">Add something beautiful for everyday use.</p>
            <Link href="/#new-arrivals" className="mt-5 inline-flex rounded-full bg-[#d8899d] px-5 py-3 font-semibold text-white">Continue shopping</Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
            <section className="space-y-4">
              {items.map((item) => (
                <article key={item.id} className="flex gap-4 rounded-3xl border border-[#eadfd9] bg-white p-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f5eeea]">
                    {item.image_url ? <img src={item.image_url} alt={item.title || ''} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center font-serif text-xl text-[#b18489]">PB</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.slug}`} className="font-semibold hover:text-[#c36f83]">{item.title}</Link>
                    <p className="mt-1 text-sm text-[#846f70]">{money(item.price)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <input aria-label={`Quantity for ${item.title}`} type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.id, e.target.value)} className="w-20 rounded-xl border border-[#eadfd9] bg-[#fffaf7] px-3 py-2" />
                      <button type="button" onClick={() => setItems((a) => a.filter((x) => x.id !== item.id))} className="text-sm font-semibold text-[#b05d70]">Remove</button>
                    </div>
                  </div>
                  <strong className="text-sm">{money(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                </article>
              ))}

              <div className="rounded-3xl border border-[#eadfd9] bg-[#f4e7e1] p-5 text-sm text-[#7d6769]">
                {quoteLoading ? 'Updating delivery total…' : quote.shipping ? `Shipping charge: ${money(quote.shipping)}` : 'Free shipping'}
              </div>
            </section>

            <form onSubmit={submit} className="rounded-3xl border border-[#eadfd9] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Checkout</h2>
                <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-xs font-bold text-[#c36f83]">Guest checkout available</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {['name', 'phone', 'email', 'pincode', 'city', 'state'].map((name) => (
                  <input key={name} name={name} required={['name', 'phone'].includes(name)} value={form[name]} onChange={onField} placeholder={name[0].toUpperCase() + name.slice(1)} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'} className="rounded-xl border border-[#eadfd9] bg-[#fffaf7] p-3" />
                ))}
                <textarea name="address" required value={form.address} onChange={onField} placeholder="Full delivery address" rows="3" className="sm:col-span-2 rounded-xl border border-[#eadfd9] bg-[#fffaf7] p-3" />
                <textarea name="note" value={form.note} onChange={onField} placeholder="Order note (optional)" rows="2" className="sm:col-span-2 rounded-xl border border-[#eadfd9] bg-[#fffaf7] p-3" />
                <div className="sm:col-span-2">
                  <input name="coupon_code" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} placeholder="Coupon code (optional)" className="w-full rounded-xl border border-dashed border-[#d8899d] bg-[#fdeef1] p-3 font-semibold tracking-wide" />
                  {quote.coupon && <p className={`mt-2 text-sm ${quote.coupon.valid ? 'text-green-700' : 'text-red-600'}`}>{quote.coupon.message}</p>}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {codAllowed && <label className="flex gap-3 rounded-2xl border border-[#eadfd9] p-4"><input type="radio" name="payment" checked={payment === 'COD'} onChange={() => setPayment('COD')} /><span><b>Cash on Delivery</b><small className="block text-[#846f70]">Pay when your order arrives.</small></span></label>}
                {onlineEnabled && <label className="flex gap-3 rounded-2xl border border-[#eadfd9] p-4"><input type="radio" name="payment" checked={payment === 'ONLINE'} onChange={() => setPayment('ONLINE')} /><span><b>Online payment</b><small className="block text-[#846f70]">Secure checkout with Razorpay.</small></span></label>}
                {!codAllowed && !onlineEnabled && <p className="text-sm text-red-600">No payment method is available for the items in your cart. Please contact us.</p>}
              </div>

              <div className="mt-6 space-y-3 border-t border-[#eadfd9] pt-5 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><b>{money(quote.subtotal || localSubtotal)}</b></div>
                <div className="flex justify-between"><span>Discount</span><b>{quote.discount ? `- ${money(quote.discount)}` : '—'}</b></div>
                <div className="flex justify-between"><span>Shipping</span><b>{quoteLoading ? '…' : quote.shipping ? money(quote.shipping) : 'FREE'}</b></div>
                <div className="flex justify-between border-t border-[#eadfd9] pt-3 text-lg"><span>Total</span><b>{money(total)}</b></div>
              </div>

              <button disabled={busy || quoteLoading || (!codAllowed && !onlineEnabled)} className="mt-6 w-full rounded-2xl bg-[#d8899d] px-5 py-3 font-bold text-white disabled:opacity-60">
                {busy ? 'Processing…' : quoteLoading ? 'Updating total…' : payment === 'ONLINE' ? 'Place order & pay' : 'Place order'}
              </button>
              <p className="mt-3 text-center text-xs text-[#8b7778]">Your checkout details are saved on this device until the order is completed.</p>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
