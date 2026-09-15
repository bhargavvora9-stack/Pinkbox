'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Save } from 'lucide-react';

const input = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10';
const fields = [
  ['brand','Brand','text'],
  ['price','Selling price','number'],
  ['compare_at_price','Compare-at price','number'],
  ['cost_price','Cost price','number'],
  ['gst_percent','GST %','number'],
  ['low_stock_threshold','Low stock alert','number'],
  ['stock_quantity','Stock','number'],
  ['track_inventory','Track inventory','boolean'],
  ['allow_backorder','Allow backorder','boolean'],
  ['featured','Featured','boolean'],
  ['is_active','Active / Draft','boolean'],
  ['cod_override','COD override','nullable_boolean'],
  ['online_payment_override','Online payment override','nullable_boolean'],
  ['shipping_charge_override','Shipping override','nullable_number'],
];

const money = n => `₹${Number(n || 0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

export default function WebsiteProductsBulkEdit(){
  const [rows,setRows] = useState([]);
  const [selected,setSelected] = useState(new Set());
  const [search,setSearch] = useState('');
  const [field,setField] = useState('price');
  const [value,setValue] = useState('');
  const [stockMode,setStockMode] = useState('set');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try{
      const r = await fetch('/api/website/products',{cache:'no-store'});
      const j = await r.json();
      if(!r.ok) throw new Error(j.error || 'Unable to load products.');
      setRows(j.data || []);
      setSelected(new Set());
    }catch(e){ setError(e.message || 'Unable to load products.'); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{load();},[]);

  const filtered = useMemo(()=>rows.filter(r=>`${r.title||''} ${r.sku||''} ${r.brand||''}`.toLowerCase().includes(search.toLowerCase())),[rows,search]);
  const allVisibleSelected = filtered.length>0 && filtered.every(r=>selected.has(r.id));
  const meta = fields.find(x=>x[0]===field);

  const toggle = id => setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleAll = () => setSelected(prev=>{const n=new Set(prev);if(allVisibleSelected) filtered.forEach(r=>n.delete(r.id));else filtered.forEach(r=>n.add(r.id));return n;});

  const parsedValue = () => {
    if(meta?.[2] === 'boolean') return value === 'true';
    if(meta?.[2] === 'nullable_boolean') return value === 'null' ? null : value === 'true';
    if(meta?.[2] === 'number' || meta?.[2] === 'nullable_number') return Number(value);
    return String(value).trim();
  };

  const apply = async () => {
    setError(''); setNotice('');
    if(!selected.size) return setError('Select at least one product.');
    if(!value && meta?.[2] !== 'boolean' && meta?.[2] !== 'nullable_boolean') return setError('Enter a value.');
    const parsed = parsedValue();
    if((meta?.[2] === 'number' || meta?.[2] === 'nullable_number') && !Number.isFinite(parsed)) return setError('Enter a valid number.');
    const names = [...selected].map(id=>rows.find(r=>r.id===id)?.title).filter(Boolean);
    const detail = names.length <= 3 ? ` (${names.join(', ')})` : ` (${names.slice(0,3).join(', ')} + ${names.length-3} more)`;
    const confirmed = window.confirm(`Apply ${meta?.[1] || field} = ${value === 'null' ? 'Use store/default (null)' : value} to ${selected.size} selected product(s)${detail}?`);
    if(!confirmed) return;
    setSaving(true);
    try{
      const r = await fetch('/api/website/products/bulk-update',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_ids:[...selected],field,value:parsed,stock_mode:stockMode})});
      const j = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error || 'Bulk update failed.');
      setNotice(`Updated ${j.count || selected.size} product(s). ${meta?.[1]} applied successfully.`);
      await load();
      setValue('');
    }catch(e){ setError(e.message || 'Bulk update failed.'); }
    finally{ setSaving(false); }
  };

  return <div className="space-y-5 text-gray-900">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><h1 className="text-2xl font-semibold">Bulk Edit / Bulk Update</h1><p className="mt-1 text-sm text-gray-500">Select multiple products and change one controlled field at a time. Maximum 200 products per operation.</p></div>
      <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><RefreshCw size={17}/>Refresh</button>
    </div>

    {(error||notice)&&<div className={`rounded-xl border px-4 py-3 text-sm ${error?'border-red-200 bg-red-50 text-red-700':'border-green-200 bg-green-50 text-green-700'}`}>{error?<span className="flex gap-2"><AlertCircle size={18}/>{error}</span>:<span className="flex gap-2"><CheckCircle2 size={18}/>{notice}</span>}</div>}

    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
        <label><span className="mb-1.5 block text-sm font-semibold">Field to change</span><select className={input} value={field} onChange={e=>{setField(e.target.value);setValue('');setStockMode('set')}}>{fields.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
        <label><span className="mb-1.5 block text-sm font-semibold">New value</span>{meta?.[2]==='boolean'||meta?.[2]==='nullable_boolean'?<select className={input} value={value} onChange={e=>setValue(e.target.value)}><option value="">Select…</option>{meta?.[2]==='nullable_boolean'&&<option value="null">Use store default / clear override</option>}<option value="true">Yes / True</option><option value="false">No / False</option></select>:<input className={input} type={meta?.[2]==='number'||meta?.[2]==='nullable_number'?'number':'text'} min={meta?.[2]==='number'||meta?.[2]==='nullable_number'?'0':undefined} value={value} onChange={e=>setValue(e.target.value)} placeholder={field==='brand'?'e.g. PinkBox':'Enter value'}/>}</label>
        {field==='stock_quantity'?<label><span className="mb-1.5 block text-sm font-semibold">Stock action</span><select className={input} value={stockMode} onChange={e=>setStockMode(e.target.value)}><option value="set">Set stock to value</option><option value="increase">Increase stock by value</option><option value="decrease">Decrease stock by value</option></select></label>:<div className="hidden md:block"/>}
        <button type="button" disabled={!selected.size||saving} onClick={apply} className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={17}/>{saving?'Updating…':`Apply to ${selected.size}`}</button>
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-5 text-gray-600">Stock changes are recorded in the inventory transaction log. Other fields are company-scoped and written atomically. A confirmation appears before the update is sent.</div>
    </section>

    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Select products</h2><p className="text-xs text-gray-500">Selected {selected.size} of {rows.length}. The current API list is capped at 200 rows.</p></div><input className={`${input} lg:w-96`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, SKU or brand…"/></div>
      <div className="overflow-auto"><table className="min-w-[900px] w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/></th><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">GST</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{loading?<tr><td colSpan="7" className="p-12 text-center text-gray-500">Loading…</td></tr>:filtered.length?filtered.map(r=><tr key={r.id} className={selected.has(r.id)?'bg-pink-50/40':''}><td className="px-4 py-3"><input type="checkbox" checked={selected.has(r.id)} onChange={()=>toggle(r.id)}/></td><td className="px-4 py-3 font-semibold">{r.title}<div className="text-xs text-gray-500">{r.brand||'No brand'}</div></td><td className="px-4 py-3">{r.sku||'—'}</td><td className="px-4 py-3">{money(r.price)}</td><td className="px-4 py-3">{r.stock_quantity??0}</td><td className="px-4 py-3">{r.gst_percent??0}%</td><td className="px-4 py-3">{r.is_active?'Active':'Draft'}</td></tr>):<tr><td colSpan="7" className="p-12 text-center text-gray-500">No products found.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
