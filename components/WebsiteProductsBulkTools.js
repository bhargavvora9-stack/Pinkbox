'use client';

import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';

const columns = ['sku','title','slug','brand','short_description','description','price','compare_at_price','cost_price','gst_percent','hsn_code','barcode','weight','stock_quantity','low_stock_threshold','track_inventory','allow_backorder','featured','is_active','seo_title','seo_description','seo_keywords'];
const required = new Set(['sku','title','price']);
const numeric = new Set(['price','compare_at_price','cost_price','gst_percent','weight','stock_quantity','low_stock_threshold']);
const bools = new Set(['track_inventory','allow_backorder','featured','is_active']);
const input = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10';

const templateRow = {
  sku:'SKU001', title:'Example Product', slug:'example-product', brand:'PinkBox', short_description:'Short description', description:'Full product description',
  price:'249', compare_at_price:'299', cost_price:'120', gst_percent:'12', hsn_code:'', barcode:'', weight:'0.25', stock_quantity:'100', low_stock_threshold:'5',
  track_inventory:'true', allow_backorder:'false', featured:'false', is_active:'true', seo_title:'', seo_description:'', seo_keywords:''
};

function normalizeBool(v){
  if(v === true || v === false) return v;
  const s = String(v ?? '').trim().toLowerCase();
  if(!s) return undefined;
  return ['true','1','yes','y','on'].includes(s);
}

function validateRows(rows){
  const errors=[];
  const seen=new Set();
  const normalized=rows.map((row,index)=>{
    const out={};
    for(const key of columns){
      let value=row?.[key];
      if(value === undefined || value === null) value='';
      if(numeric.has(key)){
        if(String(value).trim()===''){ value = key==='stock_quantity' || key==='low_stock_threshold' ? undefined : undefined; }
        else { const n=Number(String(value).replace(/,/g,'')); if(!Number.isFinite(n)) errors.push(`Row ${index+2}: ${key} must be numeric.`); else value=n; }
      } else if(bools.has(key)) value=normalizeBool(value);
      else value=String(value).trim();
      out[key]=value;
    }
    if(!out.sku) errors.push(`Row ${index+2}: SKU is required.`);
    if(!out.title) errors.push(`Row ${index+2}: Title is required.`);
    if(out.price === undefined || out.price === '') errors.push(`Row ${index+2}: Price is required.`);
    const sku=String(out.sku||'').toLowerCase();
    if(sku){ if(seen.has(sku)) errors.push(`Row ${index+2}: duplicate SKU ${out.sku} in this file.`); else seen.add(sku); }
    return out;
  });
  return {normalized,errors};
}

export default function WebsiteProductsBulkTools(){
  const [rows,setRows]=useState([]),[fileName,setFileName]=useState(''),[errors,setErrors]=useState([]),[status,setStatus]=useState(''),[saving,setSaving]=useState(false);
  const fileRef=useRef(null);
  const preview=useMemo(()=>rows.slice(0,25),[rows]);

  const downloadBlob=(blob,name)=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)};
  const downloadTemplate=()=>{const csv=Papa.unparse([templateRow],{columns});downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'pinkbox-product-import-template.csv');};
  const exportProducts=()=>{window.location.href='/api/website/catalog-import';};

  const handleFile=e=>{
    const file=e.target.files?.[0];
    setStatus('');setErrors([]);setRows([]);setFileName(file?.name||'');
    if(!file) return;
    if(!/\.(csv)$/i.test(file.name)){setErrors(['Please upload a CSV file.']);return;}
    if(file.size>5*1024*1024){setErrors(['Maximum CSV file size is 5 MB.']);return;}
    Papa.parse(file,{header:true,skipEmptyLines:'greedy',transformHeader:h=>String(h||'').trim().toLowerCase(),complete:result=>{
      const fields=result.meta.fields||[];
      const missing=columns.filter(c=>!fields.includes(c));
      const unknown=fields.filter(f=>f&&!columns.includes(f));
      const fileErrors=[];
      if(missing.includes('sku')) fileErrors.push('Missing required column: sku.');
      if(missing.includes('title')) fileErrors.push('Missing required column: title.');
      if(missing.includes('price')) fileErrors.push('Missing required column: price.');
      if(unknown.length) fileErrors.push(`Unknown columns will be ignored: ${unknown.join(', ')}`);
      if(result.errors?.length) fileErrors.push(...result.errors.slice(0,10).map(x=>`CSV parse error at row ${x.row+2}: ${x.message}`));
      const {normalized,errors:rowErrors}=validateRows(result.data||[]);
      setRows(normalized);setErrors([...fileErrors,...rowErrors].slice(0,50));
      if(!fileErrors.some(x=>x.startsWith('Missing required column')) && !rowErrors.length) setStatus(`${normalized.length} row(s) ready to import.`);
    }});
  };

  const importRows=async()=>{
    if(!rows.length || errors.some(e=>/^Missing required column|^Row/.test(e))) return;
    setSaving(true);setStatus('');
    try{
      const res=await fetch('/api/website/catalog-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Bulk import failed.');
      setStatus(`Imported ${data.count||rows.length} product row(s). Existing SKUs are updated; new SKUs are created.`);
      setRows([]);setFileName('');if(fileRef.current) fileRef.current.value='';
    }catch(err){setErrors([err.message||'Bulk import failed.']);}
    finally{setSaving(false);}
  };

  const invalid=errors.some(e=>/^Missing required column|^Row/.test(e));
  return <div className="space-y-6 text-gray-900">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><h1 className="text-2xl font-semibold">Bulk Product Listing</h1><p className="mt-1 text-sm text-gray-500">Upload up to 1,000 products at once using a controlled CSV template. Import is company-scoped and keyed by SKU.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><FileSpreadsheet size={17}/>Download template</button><button type="button" onClick={exportProducts} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><Download size={17}/>Export products</button></div>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3"><div className="rounded-xl bg-gray-100 p-2"><Upload size={19}/></div><div><h2 className="font-semibold">1. Upload CSV</h2><p className="text-sm text-gray-500">Required: sku, title, price. Other product/SEO fields are supported.</p></div></div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="block w-full text-sm"/>
        {fileName&&<p className="mt-3 text-sm text-gray-600">Selected: <b>{fileName}</b></p>}
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-5 text-gray-600">Existing SKU + company match → update. New SKU → create. Import limit: 1,000 rows. The server revalidates and scopes records to the logged-in company.</div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3"><div className="rounded-xl bg-gray-100 p-2"><CheckCircle2 size={19}/></div><div><h2 className="font-semibold">2. Validate & import</h2><p className="text-sm text-gray-500">Review the preview before writing to the product table.</p></div></div>
        <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">Rows</div><b>{rows.length}</b></div><div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">Errors</div><b>{errors.filter(e=>/^Row|^Missing/.test(e)).length}</b></div></div>
        <button type="button" disabled={!rows.length||invalid||saving} onClick={importRows} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving?'Importing…':'Import products'}</button>
      </section>
    </div>

    {(status||errors.length>0)&&<div className={`rounded-xl border px-4 py-3 text-sm ${errors.length&&invalid?'border-red-200 bg-red-50 text-red-700':'border-green-200 bg-green-50 text-green-700'}`}>{errors.length&&invalid?<div className="flex gap-2"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div><div className="font-semibold">Fix these issues before import</div><div className="mt-1 max-h-40 overflow-auto space-y-1">{errors.map((x,i)=><div key={`${x}-${i}`}>{x}</div>)}</div></div></div>:status}</div>}

    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Preview</h2><p className="text-xs text-gray-500">Showing first 25 of {rows.length} parsed row(s).</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{rows.length} rows</span></div>
      {preview.length?<div className="overflow-auto"><table className="min-w-[980px] text-xs"><thead className="bg-gray-50 text-left uppercase text-gray-500"><tr><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Brand</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">GST</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Active</th></tr></thead><tbody className="divide-y">{preview.map((r,i)=><tr key={`${r.sku}-${i}`}><td className="px-3 py-2 font-semibold">{r.sku}</td><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.brand||'—'}</td><td className="px-3 py-2">{r.price}</td><td className="px-3 py-2">{r.gst_percent??'—'}</td><td className="px-3 py-2">{r.stock_quantity??'—'}</td><td className="px-3 py-2">{r.is_active===undefined?'—':r.is_active?'Yes':'No'}</td></tr>)}</tbody></table></div>:<div className="p-12 text-center text-sm text-gray-500">Upload a CSV to preview products.</div>}
    </section>
  </div>;
}
