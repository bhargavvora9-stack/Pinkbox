'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ShoppingBag} from 'lucide-react';

const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

export default function ProductsCatalogClient(){
 const [products,setProducts]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  fetch('/api/storefront',{cache:'no-store'}).then(async r=>{
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'Store unavailable.');
   setProducts(Array.isArray(j.products)?j.products:[]);
  }).catch(e=>setError(e.message||'Store unavailable.')).finally(()=>setLoading(false));
 },[]);
 return <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 font-semibold text-[#c36f83]"><ArrowLeft size={16}/> PinkBox</Link><div className="flex items-center gap-4"><Link href="/account" className="text-sm font-semibold">Account</Link><Link href="/cart" aria-label="Cart" className="inline-flex items-center gap-2 text-sm font-semibold"><ShoppingBag size={17}/> Cart</Link></div></div><header className="mt-10"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#c36f83]">PinkBox</p><h1 className="mt-2 text-5xl font-semibold tracking-tight">Our products</h1><p className="mt-3 max-w-2xl text-[#846f70]">Browse the current PinkBox range. Select a product to view details, images and ordering options.</p></header>{loading?<div className="mt-10 rounded-3xl border border-[#eadfd9] bg-white p-12 text-center text-[#846f70]">Loading products…</div>:error?<div role="alert" className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-12 text-center text-red-700">{error}</div>:!products.length?<div className="mt-10 rounded-3xl border border-dashed border-[#eadfd9] bg-white p-12 text-center text-[#846f70]">No active products are available yet.</div>:<div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">{products.map(p=><Link href={`/products/${p.slug}`} key={p.id} className="group rounded-3xl border border-[#eadfd9] bg-white p-3 shadow-sm transition hover:-translate-y-0.5"><div className="overflow-hidden rounded-2xl bg-[#f6eeeb]">{p.image_url?<img src={p.image_url} alt={p.title} className="aspect-square w-full object-contain transition group-hover:scale-[1.03]"/>:<div className="grid aspect-square place-items-center text-6xl font-black text-[#d8899d]/35">PB</div>}</div><p className="mt-3 text-xs text-[#a08488]">{p.brand||p.sku||'PinkBox'}</p><h2 className="mt-1 font-bold text-[#5f4649]">{p.title}</h2><div className="mt-2 flex items-center justify-between"><div className="font-black">{money(p.price)} {Number(p.compare_at_price)>Number(p.price||0)&&<del className="ml-1 text-xs font-normal text-gray-400">{money(p.compare_at_price)}</del>}</div><span className="rounded-full bg-[#fff0f5] p-2 text-[#d9295f]"><ArrowRight size={15}/></span></div></Link>)}</div>}</div></main>;
}
