'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, MessageCircle, Phone, Plus, RefreshCw, Search, X, Building2, UserRound, CalendarDays, Filter } from 'lucide-react';

const SOURCES = ['Website', 'Phone call', 'WhatsApp', 'Instagram', 'Google', 'Referral', 'Other'];
const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];
const moneyDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const statusStyle = status => ({
  new: 'bg-blue-50 text-blue-700 ring-blue-200',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-200',
  qualified: 'bg-violet-50 text-violet-700 ring-violet-200',
  converted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lost: 'bg-gray-100 text-gray-600 ring-gray-200',
}[status] || 'bg-gray-100 text-gray-600 ring-gray-200');

const api = async (url, options) => {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Request failed.');
  return json;
};

function LeadForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', company_name: '', phone: '', email: '', organisation_type: '', quantity: '', source: 'Phone call', message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const save = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/api/website/bulk-enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      await onSaved();
      onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 sm:p-5">
    <form onSubmit={save} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Add B2B enquiry</h2><p className="mt-1 text-sm text-gray-500">Record a phone call, referral or other business lead.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['name', 'Contact person *', 'text'],
          ['company_name', 'Company / Business', 'text'],
          ['phone', 'Phone number *', 'tel'],
          ['email', 'Email', 'email'],
          ['organisation_type', 'Business type', 'text'],
          ['quantity', 'Estimated quantity / requirement', 'text'],
        ].map(([key, label, type]) => <label key={key}><span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span><input required={key === 'name' || key === 'phone'} type={type} value={form[key]} onChange={e => set(key, e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400"/></label>)}
        <label><span className="mb-1.5 block text-sm font-medium text-gray-700">Lead source</span><select value={form.source} onChange={e => set('source', e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">{SOURCES.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-gray-700">Requirement / Notes</span><textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400" placeholder="Products, quantity, city, next follow-up..."/></label>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button disabled={busy} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save enquiry'}</button></div>
    </form>
  </div>;
}

export default function WebsiteBulkEnquiries() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const result = await api('/api/website/bulk-enquiries', { cache: 'no-store' }); setRows(result.data || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s.value, rows.filter(r => r.status === s.value).length])), [rows]);
  const filtered = useMemo(() => rows.filter(row => {
    const text = [row.name, row.company_name, row.phone, row.email, row.organisation_type, row.message].join(' ').toLowerCase();
    return (filter === 'all' || row.status === filter) && (sourceFilter === 'all' || row.source === sourceFilter) && text.includes(query.toLowerCase());
  }), [rows, query, filter, sourceFilter]);

  const changeStatus = async (row, status) => {
    setSavingId(row.id); setError('');
    try {
      const result = await api('/api/website/bulk-enquiries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, status }) });
      setRows(current => current.map(item => item.id === row.id ? result.data : item));
      setSelected(current => current?.id === row.id ? result.data : current);
    } catch (err) { setError(err.message); }
    finally { setSavingId(''); }
  };

  const exportCsv = () => {
    const fields = ['name', 'company_name', 'phone', 'email', 'organisation_type', 'quantity', 'source', 'status', 'message', 'created_at'];
    const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const csv = [fields.join(','), ...filtered.map(row => fields.map(key => quote(row[key])).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `pinkbox-b2b-enquiries-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  const openWhatsApp = phone => {
    const number = String(phone || '').replace(/\\D/g, '');
    if (number) window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-bold uppercase tracking-[.16em] text-pink-600">Sales pipeline</div><h1 className="mt-1 text-2xl font-semibold text-gray-900">B2B Enquiries</h1><p className="mt-1 text-sm text-gray-500">Track business enquiries from the website, phone calls, WhatsApp and referrals.</p></div>
      <div className="flex gap-2"><button onClick={load} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Refresh"><RefreshCw size={17}/></button><button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium disabled:opacity-40"><Download size={16}/> Export</button><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/> Add enquiry</button></div>
    </div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4"><div className="text-xs text-gray-500">Total enquiries</div><div className="mt-1 text-2xl font-semibold">{rows.length}</div></div>
      {STATUSES.map(s => <div key={s.value} className="rounded-2xl border border-gray-200 bg-white p-4"><div className="text-xs text-gray-500">{s.label}</div><div className="mt-1 text-2xl font-semibold">{counts[s.value] || 0}</div></div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      {['all', ...STATUSES.map(s => s.value)].map(status => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${filter === status ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{status === 'all' ? 'All leads' : status}</button>)}
    </div>
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:flex-row">
      <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, business, phone or email..." className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-pink-400"/></div>
      <div className="flex items-center gap-2"><Filter size={15} className="text-gray-400"/><select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"><option value="all">All sources</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Contact / Business</th><th className="px-4 py-3">Contact details</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Requirement</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"/></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? <tr><td colSpan="7" className="p-12 text-center text-gray-500">Loading enquiries…</td></tr> : filtered.length ? filtered.map(row => <tr key={row.id} className="hover:bg-gray-50/80">
            <td className="px-4 py-3"><div className="font-semibold text-gray-900">{row.name}</div><div className="mt-0.5 text-xs text-gray-500">{row.company_name || row.organisation_type || 'Individual / Business'}</div></td>
            <td className="px-4 py-3"><div className="font-medium text-gray-800">{row.phone}</div><div className="text-xs text-gray-500">{row.email || 'No email'}</div></td>
            <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{row.source || 'Website'}</span></td>
            <td className="max-w-[190px] px-4 py-3"><div className="truncate text-gray-700">{row.quantity || row.message || '—'}</div></td>
            <td className="px-4 py-3 text-xs text-gray-500">{moneyDate(row.created_at)}</td>
            <td className="px-4 py-3"><select disabled={savingId === row.id} value={row.status || 'new'} onChange={e => changeStatus(row, e.target.value)} className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset disabled:opacity-50 ${statusStyle(row.status)}`}>{STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
            <td className="px-4 py-3"><button onClick={() => setSelected(row)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">View</button></td>
          </tr>) : <tr><td colSpan="7" className="p-12 text-center text-gray-500">No enquiries match these filters.</td></tr>}
        </tbody>
      </table></div>
    </div>
    {selected && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-pink-600">B2B lead details</div><h2 className="mt-1 text-xl font-semibold text-gray-900">{selected.name}</h2><p className="text-sm text-gray-500">{selected.company_name || 'Business enquiry'}</p></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">Phone</div><a href={`tel:${selected.phone}`} className="mt-1 block font-semibold text-gray-900">{selected.phone}</a></div>
        <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">Email</div><div className="mt-1 break-all text-sm font-semibold text-gray-900">{selected.email || '—'}</div></div>
        <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">Source</div><div className="mt-1 font-semibold text-gray-900">{selected.source || 'Website'}</div></div>
        <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">Received</div><div className="mt-1 text-sm font-semibold text-gray-900">{moneyDate(selected.created_at)}</div></div>
      </div>
      <div className="mt-4 space-y-2 text-sm"><p><b>Business type:</b> {selected.organisation_type || '—'}</p><p><b>Requirement / quantity:</b> {selected.quantity || '—'}</p><div><b>Notes:</b><p className="mt-1 whitespace-pre-wrap text-gray-600">{selected.message || 'No notes added.'}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-2"><a href={`tel:${selected.phone}`} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><Phone size={15}/> Call</a><button onClick={() => openWhatsApp(selected.phone)} className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white"><MessageCircle size={15}/> WhatsApp</button><button onClick={() => setSelected(null)} className="ml-auto rounded-xl border px-4 py-2 text-sm">Close</button></div>
    </div></div>}
    {showForm && <LeadForm onClose={() => setShowForm(false)} onSaved={load}/>}
  </div>;
}
