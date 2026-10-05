'use client';

import { useState } from 'react';

const initial = { name: '', company_name: '', phone: '', email: '', organisation_type: '', quantity: '', message: '' };

export default function BulkEnquiryForm() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/storefront/bulk-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit enquiry.');
      setStatus(data.message);
      setForm(initial);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {[
        ['name', 'Your name', true],
        ['company_name', 'Company / organisation', false],
        ['phone', 'Phone / WhatsApp', true],
        ['email', 'Email', false],
        ['organisation_type', 'Retailer / School / NGO / Other', false],
        ['quantity', 'Approx. monthly quantity', false],
      ].map(([name, placeholder, required]) => (
        <input
          key={name}
          name={name}
          value={form[name]}
          onChange={update}
          placeholder={placeholder}
          required={required}
          type={name === 'email' ? 'email' : 'text'}
          className="rounded-2xl border border-[#eadfd9] bg-white px-4 py-3 text-sm outline-none focus:border-[#d9295f]"
        />
      ))}
      <textarea
        name="message"
        value={form.message}
        onChange={update}
        placeholder="Tell us what products / pack sizes you need"
        rows="4"
        className="sm:col-span-2 rounded-2xl border border-[#eadfd9] bg-white px-4 py-3 text-sm outline-none focus:border-[#d9295f]"
      />
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button disabled={busy} className="rounded-full bg-[#d9295f] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
          {busy ? 'Submitting…' : 'Send bulk enquiry'}
        </button>
        {status && <span className="text-sm font-semibold text-[#7c6265]">{status}</span>}
      </div>
    </form>
  );
}
