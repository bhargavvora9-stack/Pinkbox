'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const readCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payment, setPayment] = useState('COD');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', note: '' });

  useEffect(() => {
    setItems(readCart());
    fetch('/api/storefront', { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Store unavailable'); setStore(j.settings || null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('pinkbox_cart', JSON.stringify(items));
    window.dispatchEvent(new Event('pinkbox-cart-updated'));
  }, [items]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items]);
  const threshold = Number(store?.free_shipping_threshold || 0);
  const shipping = Number(store?.shipping_enabled) === 0 ? 0 : (threshold > 0 && subtotal >= threshold ? 0 : Number(store?.default_shipping_charge || 0));
  const total = subtotal + shipping;
  const onlineEnabled = Boolean(store?.online_payment_enabled);

  function updateQty(id, quantity) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item));
  }
  function remove(id) { setItems((current) => current.filter((item) => item.id !== id)); }
  function onField(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); }

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    return Boolean(window.Razorpay);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      if (!items.length) throw new Error('Your cart is empty.');
      if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) throw new Error('Name, phone and address are required.');
      const response = await fetch('/api/storefront', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, phone: form.phone, email: form.email, address: form.address,
          city: form.city, state: form.state, pincode: form.pincode, note: form.note,
          payment_method: payment, items, subtotal, session_id: sessionStorage.getItem('pinkbox_session_id') || undefined,
        }),
      });
      const order = await response.json();
      if (!response.ok || !order?.order_id) throw new Error(order?.error || 'Unable to place the order.');

      if (payment !== 'ONLINE') {
        localStorage.removeItem('pinkbox_cart');
        setItems([]);
        window.location.href = `/orders/${order.order_id}`;
        return;
      }

      if (!(await loadRazorpay())) throw new Error('Online payment could not be loaded. Please choose Cash on Delivery.');
      const paymentRes = await fetch('/api/storefront/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', order_id: order.order_id }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(paymentData?.error || 'Unable to start online payment.');

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: paymentData.key_id, order_id: paymentData.razorpay_order_id, amount: paymentData.amount, currency: paymentData.currency,
          name: store?.website_name || 'PinkBox', description: `Order ${paymentData.order_number || ''}`,
          prefill: { name: form.name, email: form.email, contact: form.phone },
          handler: async (result) => {
            try {
              const verifyRes = await fetch('/api/storefront/payment', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', order_id: order.order_id, razorpay_order_id: result.razorpay_order_id, razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature }),
              });
              const verify = await verifyRes.json();
              if (!verifyRes.ok || !verify.ok) throw new Error(verify?.error || 'Payment verification failed.');
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('Payment window closed. Your order remains unpaid.')) },
          theme: { color: '#d8899d' },
        });
        checkout.open();
      });

      localStorage.removeItem('pinkbox_cart');
      setItems([]);
      window.location.href = `/orders/${order.order_id}`;
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] p-8 text-[#6a4b4e]">Loading your cart…</main>;

  return <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="font-semibold text-[#c36f83]">← PinkBox</Link><Link href="/account" className="text-sm font-semibold">Account</Link></div>
      <header className="mt-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#c36f83]">Your selection</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Shopping cart</h1><p className="mt-2 text-[#846f70]">Review your items, add delivery details and place your PinkBox order.</p></header>
      {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}
      {!items.length ? <section className="mt-8 rounded-3xl border border-[#eadfd9] bg-white p-10 text-center"><h2 className="text-2xl font-semibold">Your cart is empty</h2><p className="mt-2 text-[#846f70]">Add something beautiful for everyday use.</p><Link href="/#new-arrivals" className="mt-5 inline-flex rounded-full bg-[#d8899d] px-5 py-3 font-semibold text-white">Continue shopping</Link></section> :
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-4">
          {items.map((item) => <article key={item.id} className="flex gap-4 rounded-3xl border border-[#eadfd9] bg-white p-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f5eeea]">{item.image_url ? <img src={item.image_url} alt={item.title || ''} className="h-full w-full object-contain"/> : <div className="grid h-full place-items-center font-serif text-xl text-[#b18489]">PB</div>}</div>
            <div className="min-w-0 flex-1"><Link href={`/products/${item.slug}`} className="font-semibold hover:text-[#c36f83]">{item.title}</Link><p className="mt-1 text-sm text-[#846f70]">{money(item.price)}</p><div className="mt-3 flex items-center gap-3"><input aria-label={`Quantity for ${item.title}`} type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.id, e.target.value)} className="w-20 rounded-xl border border-[#eadfd9] bg-[#fffaf7] px-3 py-2"/><button type="button" onClick={() => remove(item.id)} className="text-sm font-semibold text-[#b05d70]">Remove</button></div></div>
            <strong className="text-sm">{money(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
          </article>)}
          <div className="rounded-3xl border border-[#eadfd9] bg-[#f4e7e1] p-5 text-sm text-[#7d6769]">{threshold > 0 && subtotal < threshold ? `Add ${money(threshold - subtotal)} more for free shipping.` : 'You qualify for free shipping.'}</div>
        </section>
        <form onSubmit={submit} className="rounded-3xl border border-[#eadfd9] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Checkout</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {['name','phone','email','pincode','city','state'].map((name) => <input key={name} name={name} required={['name','phone'].includes(name)} value={form[name]} onChange={onField} placeholder={name[0].toUpperCase()+name.slice(1)} type={name==='email'?'email':name==='phone'?'tel':'text'} className="rounded-xl border border-[#eadfd9] bg-[#fffaf7] p-3 outline-none focus:border-[#d8899d]"/>)}
            <textarea name="address" required value={form.address} onChange={onField} placeholder="Full delivery address" rows="3" className="sm:col-span-2 rounded-xl border border-[#eadfd9] bg-[#fffaf7] p-3 outline-none focus:border-[#d8899d]"/>
            <textarea name="note" value={form.note} onChange={onField} placeholder="Order note (optional)" rows="2" className="sm:col-span-2 rounded-xl border border-[#eadfd9] bg-[#fffaf7] p-3 outline-none focus:border-[#d8899d]"/>
          </div>
          <div className="mt-5 space-y-3"><label className="flex cursor-pointer gap-3 rounded-2xl border border-[#eadfd9] p-4"><input type="radio" name="payment" value="COD" checked={payment==='COD'} onChange={() => setPayment('COD')}/><span><b>Cash on Delivery</b><small className="block text-[#846f70]">Pay when your order arrives.</small></span></label>{onlineEnabled&&<label className="flex cursor-pointer gap-3 rounded-2xl border border-[#eadfd9] p-4"><input type="radio" name="payment" value="ONLINE" checked={payment==='ONLINE'} onChange={() => setPayment('ONLINE')}/><span><b>Online payment</b><small className="block text-[#846f70]">Secure checkout with Razorpay.</small></span></label>}</div>
          <div className="mt-6 space-y-3 border-t border-[#eadfd9] pt-5 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="flex justify-between"><span>Shipping</span><b>{shipping ? money(shipping) : 'FREE'}</b></div><div className="flex justify-between border-t border-[#eadfd9] pt-3 text-lg"><span>Total</span><b>{money(total)}</b></div></div>
          <button disabled={busy} className="mt-6 w-full rounded-2xl bg-[#d8899d] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Processing…' : payment === 'ONLINE' ? 'Place order & pay' : 'Place order'}</button>
        </form>
      </div>}
    </div>
  </main>;
}
