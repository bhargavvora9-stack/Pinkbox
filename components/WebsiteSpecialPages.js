'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {RefreshCw,Save,PackageCheck,AlertTriangle,ShoppingBag,Users,IndianRupee,Boxes,Search,MessageCircle} from 'lucide-react';
const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
function Card({icon:Icon,label,value}){return <div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-3 text-gray-500"><Icon size={18}/><span className="text-sm">{label}</span></div><div className="mt-3 text-2xl font-semibold text-gray-900">{value}</div></div>}
export function WebsiteDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/website/dashboard', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load dashboard.');
      setData(result);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = [
    ['leads', 'Leads'],
    ['subscribers', 'Subscribers'],
    ['blog_posts', 'Blog posts'],
    ['banners', 'Banners'],
    ['coupons', 'Coupons'],
  ];
  const latestLeads = Array.isArray(data?.latestLeads) ? data.latestLeads : [];

  return (
    <div className="space-y-8 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Pink Box website overview.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh dashboard"
          className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([key, label]) => (
          <div key={key} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-gray-900">
              {loading ? '…' : Number(data?.counts?.[key] || 0).toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold">Latest enquiries</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>Loading enquiries…</td></tr>
                ) : latestLeads.length === 0 ? (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>No enquiries yet.</td></tr>
                ) : latestLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{lead.name || lead.company_name || '—'}</td>
                    <td className="px-4 py-3">{lead.phone || '—'}</td>
                    <td className="px-4 py-3">{lead.lead_type || lead.organisation_type || 'Website enquiry'}</td>
                    <td className="px-4 py-3 capitalize">{String(lead.status || 'new').replaceAll('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
export function WebsiteSettings(){const[s,setS]=useState(null),[saving,setSaving]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('');const load=async()=>{const r=await fetch('/api/website/settings',{cache:'no-store'}),j=await r.json();if(r.ok)setS(j.data);else setErr(j.error)};useEffect(()=>{load()},[]);const set=(k,v)=>setS(x=>({...x,[k]:v}));const save=async e=>{e.preventDefault();setSaving(true);setMsg('');setErr('');try{const r=await fetch('/api/website/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}),j=await r.json();if(!r.ok)throw Error(j.error);setS(j.data);setMsg('Website settings saved.')}catch(e){setErr(e.message)}finally{setSaving(false)}};if(!s)return <div className="p-12 text-center text-gray-500">Loading settings…</div>;return <form onSubmit={save} className="space-y-5"><div><h1 className="text-2xl font-semibold">Website Settings</h1><p className="mt-1 text-sm text-gray-500">PinkBox storefront identity, contact, commerce and SEO defaults.</p></div>{(msg||err)&&<div className={`rounded-xl p-4 text-sm ${err?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{err||msg}</div>}<div className="grid gap-5 lg:grid-cols-2">{[['website_name','Website Name'],['slug','Slug'],['logo_url','Logo URL'],['favicon_url','Favicon URL'],['whatsapp_number','WhatsApp Number'],['phone','Phone'],['email','Email'],['gstin','GSTIN'],['currency','Currency'],['timezone','Timezone'],['address','Business Address'],['meta_title','Meta Title'],['meta_description','Meta Description'],['free_shipping_threshold','Free Shipping Threshold'],['default_shipping_charge','Default Shipping Charge'],['ga4_measurement_id','Google Analytics 4 ID (G-XXXXXXX)'],['meta_pixel_id','Meta (Facebook) Pixel ID']].map(([k,l])=><label key={k} className={k==='address'||k==='meta_description'?'lg:col-span-2':''}><span className="mb-1.5 block text-sm font-medium">{l}</span>{k==='address'||k==='meta_description'?<textarea rows={3} value={s[k]??''} onChange={e=>set(k,e.target.value)} className="w-full rounded-xl border px-3 py-2.5"/>:<input type={k.includes('threshold')||k.includes('charge')?'number':'text'} value={s[k]??''} onChange={e=>set(k,e.target.value)} className="w-full rounded-xl border px-3 py-2.5"/>}</label>)}</div><div className="flex flex-wrap gap-5 rounded-2xl border bg-white p-5">{[['cod_enabled','Cash on Delivery'],['online_payment_enabled','Online Payment'],['shipping_enabled','Shipping']].map(([k,l])=><label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s[k]} onChange={e=>set(k,e.target.checked)}/>{l}</label>)}</div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white"><Save size={17}/>{saving?'Saving…':'Save Settings'}</button></form>}
export function WebsiteOrders(){const[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[err,setErr]=useState('');const load=async()=>{setLoading(true);const r=await fetch('/api/website/orders',{cache:'no-store'}),j=await r.json();if(r.ok)setRows(j.data||[]);else setErr(j.error);setLoading(false)};useEffect(()=>{load()},[]);const statuses=['new','confirmed','processing','packed','shipped','delivered','cancelled','returned','refunded'];const change=async(o,status)=>{const r=await fetch('/api/website/orders',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:o.id,order_status:status,status_note:`Status changed to ${status}`})});const j=await r.json();if(!r.ok)setErr(j.error);else load()};return <div className="space-y-5"><div className="flex justify-between"><div><h1 className="text-2xl font-semibold">Orders</h1><p className="text-sm text-gray-500">Manage the complete order lifecycle.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={17}/></button></div>{err&&<div className="rounded-xl bg-red-50 p-4 text-red-700">{err}</div>}<div className="overflow-hidden rounded-2xl border bg-white"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr></thead><tbody className="divide-y">{loading?<tr><td colSpan="6" className="p-12 text-center">Loading…</td></tr>:rows.length===0?<tr><td colSpan="6" className="p-12 text-center text-gray-500">No orders yet.</td></tr>:rows.map(o=><tr key={o.id}><td className="px-4 py-3 font-medium">{o.order_number}</td><td className="px-4 py-3">{o.customer_name||'—'}<div className="text-xs text-gray-500">{o.phone||o.email||''}</div></td><td className="px-4 py-3">{money(o.total_amount)}</td><td className="px-4 py-3">{o.payment_method} / {o.payment_status}</td><td className="px-4 py-3"><select value={o.order_status} onChange={e=>change(o,e.target.value)} className="rounded-lg border px-2 py-1.5 text-xs">{statuses.map(x=><option key={x}>{x}</option>)}</select></td><td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div></div></div>}
export function WebsiteInventory(){
 const[d,setD]=useState(null),[selected,setSelected]=useState(''),[change,setChange]=useState(''),[reason,setReason]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[q,setQ]=useState(''),[filter,setFilter]=useState('all'),[quickQty,setQuickQty]=useState('1'),[busyStockKey,setBusyStockKey]=useState('');
 const load=async()=>{try{setErr('');const r=await fetch('/api/website/inventory',{cache:'no-store'}),j=await r.json();if(!r.ok)throw Error(j.error||'Unable to load inventory');setD(j)}catch(e){setErr(e.message)}};
 useEffect(()=>{load()},[]);
 const adjustQuick=async(p,direction)=>{
  const amount=Number(quickQty);
  if(!Number.isSafeInteger(amount)||amount<1){setErr('Enter a whole number greater than zero for the quick adjustment.');return}
  const before=Number(p.stock_quantity||0);
  if(direction<0&&before<amount){setErr('Stock cannot go below zero. Current stock is '+before+'.');return}
  const delta=direction*amount;
  setBusyStockKey(p.stockKey);setErr('');setMsg('');
  try{
   const payload={...(p.stockKey.startsWith('variant:')?{variant_id:p.stockKey.slice(8)}:{product_id:p.stockKey.slice(8)}),change_quantity:delta,reason:direction>0?'Quick stock increase (+'+amount+')':'Quick stock decrease (-'+amount+')'};
   const r=await fetch('/api/website/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();
   if(!r.ok)throw Error(j.error||'Stock adjustment failed');
   const after=Number(j.data?.quantity_after??(before+delta));
   setMsg(p.title+': '+before+' → '+after+' ('+(delta>0?'+':'')+delta+')');
   await load();
  }catch(e){setErr(e.message||'Stock adjustment failed')}finally{setBusyStockKey('')}
 };
 const adjust=async e=>{
  e.preventDefault();
  const amount=Number(change);
  if(!Number.isSafeInteger(amount)||amount===0){setErr('Enter a whole-number stock change, e.g. +10 or -5.');return}
  setBusy(true);setMsg('');setErr('');
  try{
   const payload={...(selected.startsWith('variant:')?{variant_id:selected.slice(8)}:{product_id:selected.slice(8)}),change_quantity:amount,reason};
   const r=await fetch('/api/website/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();
   if(!r.ok)throw Error(j.error||'Stock adjustment failed');
   setMsg('Stock adjusted successfully.');setSelected('');setChange('');setReason('');await load();
  }catch(e){setErr(e.message)}finally{setBusy(false)}
 };
 if(!d)return <div className="p-12 text-center text-gray-500">{err||'Loading inventory…'}</div>;
 const products=d.products||[];
 const variants=d.variants||[];
 const productMap=new Map(products.map(p=>[p.id,p]));
 const variantProductIds=new Set(variants.map(v=>v.product_id));
 const stockItems=[...products.filter(p=>p.track_inventory!==false&&!variantProductIds.has(p.id)).map(p=>({...p,stockKey:'product:'+p.id})),...variants.map(v=>({...v,title:(productMap.get(v.product_id)?.title||'Product')+' · '+v.title,stockKey:'variant:'+v.id}))];
 const lowCount=stockItems.filter(p=>Number(p.stock_quantity)>0&&Number(p.stock_quantity)<=Number(p.low_stock_threshold)).length;
 const outCount=stockItems.filter(p=>Number(p.stock_quantity)<=0).length;
 const visible=stockItems.filter(p=>{const matches=JSON.stringify(p).toLowerCase().includes(q.toLowerCase());const stock=Number(p.stock_quantity||0);return matches&&(filter==='all'||(filter==='low'&&stock>0&&stock<=Number(p.low_stock_threshold||0))||(filter==='out'&&stock<=0))});
 const productName=id=>productMap.get(id)?.title||'Unknown product';
 const inventoryName=t=>t.variant_id?(productName(t.product_id)+' · '+(variants.find(v=>v.id===t.variant_id)?.title||'Variant')):productName(t.product_id);
 const quickAmount=Number(quickQty);
 const quickValid=Number.isSafeInteger(quickAmount)&&quickAmount>0;
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Inventory & Stock</h1><p className="text-sm text-gray-500">See current quantity and increase or decrease stock directly from each item.</p></div><button onClick={load} disabled={busy||!!busyStockKey} className="rounded-xl border bg-white p-2.5" aria-label="Refresh inventory"><RefreshCw size={17}/></button></div>
  {(msg||err)&&<div className={err?'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700':'rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700'}>{err||msg}</div>}
  <div className="grid gap-4 sm:grid-cols-3">
   <button onClick={()=>setFilter('all')} className={filter==='all'?'rounded-2xl border bg-white p-5 text-left ring-2 ring-gray-900':'rounded-2xl border bg-white p-5 text-left'}><div className="text-sm text-gray-500">Tracked SKUs</div><div className="mt-2 text-2xl font-semibold">{stockItems.length}</div></button>
   <button onClick={()=>setFilter('low')} className={filter==='low'?'rounded-2xl border bg-white p-5 text-left ring-2 ring-gray-900':'rounded-2xl border bg-white p-5 text-left'}><div className="text-sm text-gray-500">Low stock</div><div className="mt-2 text-2xl font-semibold text-amber-600">{lowCount}</div></button>
   <button onClick={()=>setFilter('out')} className={filter==='out'?'rounded-2xl border bg-white p-5 text-left ring-2 ring-gray-900':'rounded-2xl border bg-white p-5 text-left'}><div className="text-sm text-gray-500">Out of stock</div><div className="mt-2 text-2xl font-semibold text-red-600">{outCount}</div></button>
  </div>
  <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
   <div className="rounded-2xl border bg-white">
    <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
     <div><div className="font-semibold">Stock Overview</div><p className="mt-1 text-xs text-gray-500">Use − to reduce stock and + to add stock.</p></div>
     <div className="flex flex-wrap items-center gap-2"><label htmlFor="quick-stock-quantity" className="text-xs font-medium text-gray-600">Each click changes</label><input id="quick-stock-quantity" type="number" min="1" step="1" value={quickQty} onChange={e=>setQuickQty(e.target.value)} className="w-20 rounded-lg border px-2.5 py-2 text-sm" aria-label="Quantity per plus or minus click"/><span className="text-xs text-gray-500">units</span><div className="relative sm:ml-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search product or SKU" className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm sm:w-48"/></div></div>
    </div>
    <div className="divide-y">
     {visible.length?visible.map(p=>{
      const stock=Number(p.stock_quantity||0),isBusy=busyStockKey===p.stockKey;
      return <div key={p.stockKey} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
       <div className="min-w-0"><div className="font-medium text-gray-900">{p.title}</div><div className="text-xs text-gray-500">{p.sku||'No SKU'} · Low-stock alert at {p.low_stock_threshold||0}</div></div>
       <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="min-w-20 text-right"><div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Available</div><div className={stock<=0?'text-xl font-bold text-red-600':stock<=Number(p.low_stock_threshold)?'text-xl font-bold text-amber-600':'text-xl font-bold text-gray-900'}>{stock}</div></div>
        <div className="flex items-center gap-2">
         <button type="button" onClick={()=>adjustQuick(p,-1)} disabled={!quickValid||isBusy||busy||stock<quickAmount} aria-label={'Decrease stock for '+p.title} title="Decrease stock" className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-lg font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35">−</button>
         <button type="button" onClick={()=>adjustQuick(p,1)} disabled={!quickValid||isBusy||busy} aria-label={'Increase stock for '+p.title} title="Increase stock" className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-lg font-bold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-35">+</button>
         {isBusy&&<RefreshCw size={16} className="animate-spin text-gray-400"/>}
        </div>
       </div>
      </div>;
     }):<div className="p-10 text-center text-sm text-gray-500">No matching products.</div>}
    </div>
   </div>
   <form onSubmit={adjust} className="h-fit rounded-2xl border bg-white p-5">
    <div className="mb-2 flex items-center gap-2 font-semibold"><Boxes size={18}/>Stock Adjustment</div><p className="mb-4 text-xs text-gray-500">For a custom quantity, choose an item and enter + or − units.</p>
    <select required value={selected} onChange={e=>setSelected(e.target.value)} className="mb-3 w-full rounded-xl border px-3 py-2.5"><option value="">Select product or variant</option>{stockItems.map(p=><option key={p.stockKey} value={p.stockKey}>{p.title} ({p.sku})</option>)}</select>
    <input required type="number" step="1" value={change} onChange={e=>setChange(e.target.value)} placeholder="+10 or -5" className="mb-3 w-full rounded-xl border px-3 py-2.5"/>
    <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (e.g. received stock, damaged, correction)" rows="3" className="mb-3 w-full rounded-xl border px-3 py-2.5"/>
    <button disabled={busy} className="w-full rounded-xl bg-gray-900 py-2.5 font-semibold text-white disabled:opacity-50">{busy?'Updating…':'Adjust Stock'}</button>
   </form>
  </div>
  <div className="rounded-2xl border bg-white"><div className="border-b px-5 py-4 font-semibold">Recent Stock Transactions</div><div className="divide-y">{d.transactions.length?d.transactions.map(t=><div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><div><div className="font-medium">{inventoryName(t)}</div><div className="text-xs text-gray-500">{t.reason||'Adjustment'} · {new Date(t.created_at).toLocaleString('en-IN')}</div></div><div className="text-right"><div className={Number(t.change_quantity)>0?'font-semibold text-green-600':'font-semibold text-red-600'}>{Number(t.change_quantity)>0?'+':''}{t.change_quantity}</div><div className="text-xs text-gray-500">after {t.quantity_after}</div></div></div>):<div className="p-8 text-center text-sm text-gray-500">No transactions.</div>}</div></div>
 </div>
}
export function WebsiteCustomers(){const[r,setR]=useState([]),[q,setQ]=useState('');useEffect(()=>{fetch('/api/website/customers',{cache:'no-store'}).then(x=>x.json()).then(j=>setR(j.data||[]))},[]);const a=(r||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">Customers</h1><p className="text-sm text-gray-500">Live customer master from BK CRM. Website orders link back to this master.</p></div><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customers..." className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-3"/></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Firm</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">GSTIN</th></tr></thead><tbody className="divide-y">{a.map(x=><tr key={x.id}><td className="px-4 py-3 font-medium">{[x.client_name,x.surname].filter(Boolean).join(' ')||'—'}</td><td className="px-4 py-3">{x.firm_name||'—'}</td><td className="px-4 py-3">{x.phone1||x.phone2||'—'}</td><td className="px-4 py-3">{x.email||'—'}</td><td className="px-4 py-3">{[x.city,x.state,x.pincode].filter(Boolean).join(', ')||'—'}</td><td className="px-4 py-3">{x.gstin||'—'}</td></tr>)}</tbody></table></div></div>}
