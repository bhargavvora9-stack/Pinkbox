'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, ShieldCheck, Minus, Plus, MessageCircle, Loader2 } from 'lucide-react';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Home() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [sessionId, setSessionId] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', pincode: '', city: '', state: '', note: '', coupon_code: '', payment_method: 'cod'
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('24care_session_id');
    if (!id) {
      id = '24care-' + crypto.randomUUID();
      localStorage.setItem('24care_session_id', id);
    }
    setSessionId(id);

    fetch('/api/storefront', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setData(j);
        if (j.products?.length) setSelected(j.products[0]);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const total = useMemo(() => Number(selected?.price || 0) * qty, [selected, qty]);

  const saveCart = async () => {
    if (!sessionId || !selected) return;
    try {
      await fetch('/api/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abandoned_cart',
          session_id: sessionId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          items: [{ product_id: selected.id, quantity: qty }],
          subtotal: total
        })
      });
    } catch {
      // Best-effort abandoned cart save.
    }
  };

  const order = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setErr('');
    setMsg('');

    try {
      const r = await fetch('/api/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          payment_method: 'cod',
          session_id: sessionId,
          items: [{ product_id: selected.id, quantity: qty }]
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Order failed');

      setMsg(`Order ${j.order_number} placed successfully. Total ${money(j.total_amount)}.`);
      const wa = data?.settings?.whatsapp_number;
      if (wa) {
        const text = encodeURIComponent(
          `Hi 24Care! Order ${j.order_number}\nProduct: ${selected.title}\nQuantity: ${qty}\nTotal: Rs. ${j.total_amount}\nName: ${form.name}\nPhone: ${form.phone}\nAddress: ${form.address}`
        );
        window.open(`https://wa.me/${String(wa).replace(/\D/g, '')}?text=${text}`, '_blank');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (err && !data) {
    return <main className="min-h-screen bg-[#fbf3ef] p-10 text-center text-red-700">{err}</main>;
  }

  if (!data) {
    return <main className="min-h-screen bg-[#fbf3ef] grid place-items-center"><Loader2 className="animate-spin" /></main>;
  }

  const products = data.products || [];

  return (
    <main className="min-h-screen bg-[#fbf3ef] text-[#2b1620]" style={{ fontFamily: 'system-ui,sans-serif' }}>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#fbf3ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="text-2xl font-bold text-[#0e4f4b]">24<span className="text-[#d9295f]">Care</span></div>
          <a href="#products" className="text-sm font-semibold">Products</a>
          <a href="#order" className="rounded-full bg-[#d9295f] px-5 py-2.5 text-sm font-semibold text-white">Order Now</a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0e4f4b]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0e4f4b]"><ShieldCheck size={14} /> Made in India</span>
          <h1 className="mt-6 text-5xl font-semibold leading-tight md:text-6xl">Protected,<br /><em className="text-[#d9295f]">day and night.</em></h1>
          <p className="mt-6 max-w-xl text-lg text-[#5b4650]">Shop 24Care from a live database-managed catalogue. Products, prices and stock are controlled from Website Admin.</p>
          <a href="#products" className="mt-8 inline-flex rounded-full bg-[#d9295f] px-6 py-3.5 font-semibold text-white">Shop Products</a>
        </div>
        <div className="grid place-items-center rounded-[2rem] bg-[#0e4f4b] p-10 text-white">
          <ShoppingBag size={56} />
          <div className="mt-5 text-center"><div className="text-4xl font-semibold">{products.length}</div><div className="mt-1 text-sm opacity-70">Active products</div></div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-widest text-[#d9295f]">Catalogue</p>
        <h2 className="mt-2 text-3xl font-semibold">Choose your pack</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {products.map((p) => (
            <button key={p.id} onClick={() => { setSelected(p); setQty(1); document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' }); }} className={`rounded-3xl border bg-white p-7 text-left transition ${selected?.id === p.id ? 'border-[#d9295f] ring-2 ring-[#d9295f]/10' : 'border-black/5'}`}>
              <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-wider text-gray-400">{p.sku}</div><h3 className="mt-2 text-2xl font-semibold">{p.title}</h3></div>{p.featured && <span className="rounded-full bg-[#c99a3c] px-3 py-1 text-xs font-bold text-white">Featured</span>}</div>
              <p className="mt-3 text-sm text-gray-500">{p.short_description || p.description || '24Care quality hygiene product.'}</p>
              <div className="mt-6 flex items-center justify-between"><span className="text-3xl font-semibold text-[#0e4f4b]">{money(p.price)}</span><span className="text-sm text-gray-500">Stock: {p.stock_quantity ?? 0}</span></div>
            </button>
          ))}
        </div>
      </section>

      <section id="order" className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-3xl font-semibold">Place your order</h2>
          {selected ? <>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#fbf3ef] p-4">
              <div><div className="font-semibold">{selected.title}</div><div className="text-sm text-gray-500">{money(selected.price)} each</div></div>
              <div className="flex items-center gap-3"><button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="rounded-full border p-2"><Minus size={15} /></button><span className="w-6 text-center">{qty}</span><button type="button" disabled={qty >= Number(selected.stock_quantity || 0)} onClick={() => setQty(qty + 1)} className="rounded-full border p-2 disabled:opacity-40"><Plus size={15} /></button></div>
            </div>
            <form onSubmit={order} onBlur={saveCart} className="mt-6 grid gap-4 sm:grid-cols-2">
              <input required placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border px-4 py-3" />
              <input required placeholder="Phone / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border px-4 py-3" />
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border px-4 py-3" />
              <input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="rounded-xl border px-4 py-3" />
              <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border px-4 py-3" />
              <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl border px-4 py-3" />
              <textarea required placeholder="Delivery Address" rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2 rounded-xl border px-4 py-3" />
              <textarea placeholder="Order note" rows="2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="sm:col-span-2 rounded-xl border px-4 py-3" />
              <input placeholder="Coupon Code (optional)" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} className="rounded-xl border px-4 py-3" />
              <select value="cod" disabled className="rounded-xl border px-4 py-3 bg-gray-50"><option value="cod">Cash on Delivery</option></select>
              <div className="flex items-center justify-between sm:col-span-2"><div><div className="text-sm text-gray-500">Product Total</div><div className="text-3xl font-semibold text-[#0e4f4b]">{money(total)}</div><div className="text-xs text-gray-400">Final total includes shipping/coupon calculation.</div></div><button disabled={busy || Number(selected.stock_quantity || 0) < 1} className="inline-flex items-center gap-2 rounded-full bg-[#d9295f] px-6 py-3.5 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : <MessageCircle size={17} />}Place Order</button></div>
            </form>
          </> : <p className="mt-5 text-gray-500">No products are currently available.</p>}
          {(msg || err) && <div className={`mt-5 rounded-xl p-4 text-sm ${err ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{err || msg}</div>}
        </div>
      </section>

      <footer className="border-t border-black/5 py-10 text-center text-sm text-gray-500">{data.settings.website_name || '24Care'}</footer>
    </main>
  );
}
