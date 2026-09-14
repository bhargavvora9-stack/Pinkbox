'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Heart,Minus,Plus,ShoppingBag,ArrowLeft} from 'lucide-react';

const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

export default function ProductDetailClient({product}){
 const [qty,setQty]=useState(1);
 const [wish,setWish]=useState(false);
 const [added,setAdded]=useState(false);
 const [selectedImage,setSelectedImage]=useState(product.images?.find(x=>x.is_primary)?.image_url||product.image_url||product.images?.[0]?.image_url||null);
 useEffect(()=>{
  try{
   const ids=JSON.parse(localStorage.getItem('pinkbox_wishlist')||'[]');
   setWish(Array.isArray(ids)&&ids.includes(product.id));
  }catch{}
 },[product.id]);
 const toggleWish=()=>{
  try{
   const ids=JSON.parse(localStorage.getItem('pinkbox_wishlist')||'[]');
   const next=Array.isArray(ids)?ids:[ ];
   const updated=next.includes(product.id)?next.filter(x=>x!==product.id):[...next,product.id];
   localStorage.setItem('pinkbox_wishlist',JSON.stringify(updated));
   setWish(updated.includes(product.id));
  }catch{}
 };
 const addToCart=()=>{
  try{
   const current=JSON.parse(localStorage.getItem('pinkbox_cart')||'[]');
   const cart=Array.isArray(current)?current:[];
   const image=selectedImage||product.image_url||null;
   const existing=cart.find(x=>x.id===product.id);
   const item={id:product.id,sku:product.sku,title:product.title,slug:product.slug,price:Number(product.price||0),compare_at_price:Number(product.compare_at_price||0),quantity:Math.max(1,qty),image_url:image,cod_override:product.cod_override??null,online_payment_override:product.online_payment_override??null,shipping_charge_override:product.shipping_charge_override??null};
   const updated=existing?cart.map(x=>x.id===product.id?{...x,...item,quantity:Number(x.quantity||0)+qty}:x):[...cart,item];
   localStorage.setItem('pinkbox_cart',JSON.stringify(updated));
   window.dispatchEvent(new Event('pinkbox-cart-updated'));
   setAdded(true);setTimeout(()=>setAdded(false),1800);
  }catch{}
 };
 const inStock=product.allow_backorder||Number(product.stock_quantity||0)>0;
 return <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><Link href="/products" className="inline-flex items-center gap-2 font-semibold text-[#c36f83]"><ArrowLeft size={16}/> All products</Link><div className="flex gap-3"><Link href="/account" className="text-sm font-semibold">Account</Link><Link href="/cart" className="text-sm font-semibold">Cart</Link></div></div><div className="mt-8 grid gap-10 lg:grid-cols-2"><section><div className="overflow-hidden rounded-3xl border border-[#eadfd9] bg-white"><div className="aspect-square bg-[#f6eeeb]">{selectedImage?<img src={selectedImage} alt={product.title} className="h-full w-full object-contain"/>:<div className="grid h-full place-items-center text-7xl font-black text-[#d8899d]/40">PB</div>}</div></div>{product.images?.length>1&&<div className="mt-4 grid grid-cols-5 gap-3">{product.images.slice(0,5).map((img,i)=><button type="button" key={img.id||i} onClick={()=>setSelectedImage(img.image_url)} className={`overflow-hidden rounded-2xl border bg-white ${selectedImage===img.image_url?'border-[#d8899d] ring-2 ring-[#d8899d]/20':'border-[#eadfd9]'}`}><img src={img.image_url} alt="" className="aspect-square w-full object-contain"/></button>)}</div>}</section><section className="rounded-3xl border border-[#eadfd9] bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#c36f83]">{product.brand||'PinkBox'}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#5f4649]">{product.title}</h1><p className="mt-2 text-sm text-[#846f70]">SKU: {product.sku||'—'}</p><div className="mt-6 flex items-end gap-3"><span className="text-3xl font-bold">{money(product.price)}</span>{Number(product.compare_at_price)>Number(product.price||0)&&<del className="pb-1 text-sm text-gray-400">{money(product.compare_at_price)}</del>}</div>{product.short_description&&<p className="mt-6 whitespace-pre-line leading-7 text-[#765f62]">{product.short_description}</p>}<div className="mt-6 rounded-2xl bg-[#fff4f6] p-4 text-sm"><b>{inStock?'Available to order':'Currently out of stock'}</b>{product.track_inventory&&<span className="ml-2 text-[#846f70]">{Number(product.stock_quantity||0)} in stock</span>}</div><div className="mt-6 flex items-center gap-3"><div className="flex items-center rounded-2xl border border-[#eadfd9] bg-[#fffaf7]"><button type="button" onClick={()=>setQty(q=>Math.max(1,q-1))} className="p-3" aria-label="Decrease quantity"><Minus size={16}/></button><span className="min-w-10 text-center font-semibold">{qty}</span><button type="button" onClick={()=>setQty(q=>q+1)} className="p-3" aria-label="Increase quantity"><Plus size={16}/></button></div><button type="button" onClick={addToCart} disabled={!inStock} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#d8899d] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={18}/>{added?'Added to cart':'Add to cart'}</button><button type="button" onClick={toggleWish} className="rounded-2xl border border-[#eadfd9] bg-white p-3" aria-label="Save to wishlist"><Heart size={19} fill={wish?'currentColor':'none'}/></button></div><div className="mt-7 border-t border-[#eadfd9] pt-6"><h2 className="font-bold">Product details</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#765f62]">{product.description||product.short_description||'Quality checked PinkBox everyday essentials.'}</p></div></section></div></div></main>;
}
