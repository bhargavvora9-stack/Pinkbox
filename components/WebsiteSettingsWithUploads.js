'use client';
import {useEffect,useState} from 'react';
import {Save,RefreshCw} from 'lucide-react';
import WebsiteImageUpload from './WebsiteImageUpload';

const input='w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10';

export default function WebsiteSettingsWithUploads(){
 const [s,setS]=useState(null),[saving,setSaving]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('');
 const load=async()=>{try{const r=await fetch('/api/website/settings',{cache:'no-store'}),j=await r.json();if(!r.ok)throw Error(j.error||'Unable to load settings');setS(j.data||{});setErr('')}catch(e){setErr(e.message)}};
 useEffect(()=>{load()},[]);
 const set=(k,v)=>setS(x=>({...x,[k]:v}));
 const save=async e=>{e.preventDefault();setSaving(true);setMsg('');setErr('');try{const r=await fetch('/api/website/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}),j=await r.json();if(!r.ok)throw Error(j.error||'Save failed');setS(j.data||s);setMsg('Website settings saved.')}catch(e){setErr(e.message)}finally{setSaving(false)}};
 if(!s)return <div className="p-12 text-center text-gray-500">Loading settings…</div>;
 return <form onSubmit={save} className="space-y-5 text-gray-900">
  <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Website Settings</h1><p className="mt-1 text-sm text-gray-500">Storefront identity, contact, commerce and SEO defaults.</p></div><button type="button" onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={17}/></button></div>
  {(msg||err)&&<div className={`rounded-xl border p-4 text-sm ${err?'border-red-200 bg-red-50 text-red-700':'border-green-200 bg-green-50 text-green-700'}`}>{err||msg}</div>}
  <div className="grid gap-5 lg:grid-cols-2">
   <label className="block text-sm font-medium"><span className="mb-1.5 block">Website Name</span><input value={s.website_name??''} onChange={e=>set('website_name',e.target.value)} className={input}/></label>
   <label className="block text-sm font-medium"><span className="mb-1.5 block">Slug</span><input value={s.slug??''} onChange={e=>set('slug',e.target.value)} className={input}/></label>
   <WebsiteImageUpload value={s.logo_url||''} onChange={v=>set('logo_url',v)} label="Website Logo" folder="settings-logo"/>
   <WebsiteImageUpload value={s.favicon_url||''} onChange={v=>set('favicon_url',v)} label="Favicon" folder="settings-favicon"/>
   {[["whatsapp_number","WhatsApp Number"],["phone","Phone"],["email","Email"],["gstin","GSTIN"],["currency","Currency"],["timezone","Timezone"],["free_shipping_threshold","Free Shipping Threshold"],["default_shipping_charge","Default Shipping Charge"],["ga4_measurement_id","Google Analytics 4 ID (G-XXXXXXX)"],["meta_pixel_id","Meta (Facebook) Pixel ID"]].map(([k,l])=><label key={k} className="block text-sm font-medium"><span className="mb-1.5 block">{l}</span><input type={k.includes('threshold')||k.includes('charge')?'number':'text'} value={s[k]??''} onChange={e=>set(k,k.includes('threshold')||k.includes('charge')?Number(e.target.value):e.target.value)} className={input}/></label>)}
   <label className="block text-sm font-medium lg:col-span-2"><span className="mb-1.5 block">Business Address</span><textarea rows={3} value={s.address??''} onChange={e=>set('address',e.target.value)} className={input}/></label>
   <label className="block text-sm font-medium lg:col-span-2"><span className="mb-1.5 block">Meta Title</span><input value={s.meta_title??''} onChange={e=>set('meta_title',e.target.value)} className={input}/></label>
   <label className="block text-sm font-medium lg:col-span-2"><span className="mb-1.5 block">Meta Description</span><textarea rows={3} value={s.meta_description??''} onChange={e=>set('meta_description',e.target.value)} className={input}/></label>
  </div>
  <div className="flex flex-wrap gap-5 rounded-2xl border bg-white p-5">{[["cod_enabled","Cash on Delivery"],["online_payment_enabled","Online Payment"],["shipping_enabled","Shipping"]].map(([k,l])=><label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s[k]} onChange={e=>set(k,e.target.checked)}/>{l}</label>)}</div>
  <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:opacity-50"><Save size={17}/>{saving?'Saving…':'Save Settings'}</button>
 </form>
}
