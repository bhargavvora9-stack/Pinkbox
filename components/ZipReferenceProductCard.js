'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Loader2 } from 'lucide-react';
const money=(value)=>'₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function ZipReferenceProductCard({product}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const image=product.image_url||product.images?.[0]?.image_url||null;
 const stockTracked=product.track_inventory!==false;
 const available=!stockTracked||product.allow_backorder||Number(product.stock_quantity||0)>0;
 async function addToCart(event){
  event.preventDefault();event.stopPropagation();
  if(!available||busy)return;
  setBusy(true);setMessage('');
  try{
   const current=JSON.parse(localStorage.getItem('pinkbox_cart')||'[]');
   const id=product.id,existing=current.find((item)=>item.id===id),quantity=Number(existing?.quantity||0)+1,max=Number(product.stock_quantity||0);
   if(stockTracked&&max>0&&quantity>max&&!product.allow_backorder)throw new Error('Only '+max+' available');
   const item={...product,id,product_id:product.id,variant_id:null,title:product.title,price:Number(product.price||0),image_url:image,quantity,personalization:null};
   const next=existing?current.map((entry)=>entry.id===id?{...entry,...item}:entry):[...current,item];
   localStorage.setItem('pinkbox_cart',JSON.stringify(next));
   window.dispatchEvent(new Event('pinkbox-cart-updated'));
   setMessage('Added to cart');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to add to cart');}
  finally{setBusy(false);}
 }
 return (
  <article className="group overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
   <Link href={'/products/'+product.slug}>
    <div className="aspect-square overflow-hidden bg-muted">
     {image?<img src={image} alt={product.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy"/>:<div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>}
    </div>
    <div className="p-4"><h3 className="line-clamp-1 text-lg font-semibold text-card-foreground">{product.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description||product.description||''}</p><p className="mt-2 text-lg font-bold text-foreground">{money(product.price)}</p></div>
   </Link>
   <div className="px-4 pb-4">
    <button type="button" onClick={addToCart} disabled={busy||!available} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
     {busy?<Loader2 className="h-4 w-4 animate-spin"/>:<ShoppingBag className="h-4 w-4"/>}{busy?'Adding…':available?'Add to Cart':'Out of stock'}
    </button>
    {message&&<p className="mt-2 text-center text-xs text-muted-foreground" role="status">{message}</p>}
   </div>
  </article>
 );
}
