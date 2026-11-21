'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
const money=(value)=>'₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function ZipReferenceProductCard({product}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const image=product.image_url||product.images?.[0]?.image_url||null;
 const variants=Array.isArray(product.variants)?product.variants.filter((variant)=>variant?.is_active!==false):[];
 const canSellVariant=(variant)=>product.track_inventory===false||product.allow_backorder===true||Number(variant?.stock_quantity||0)>0;
 const preferredVariant=variants.find(canSellVariant)||variants[0]||null;
 const stockTracked=product.track_inventory!==false;
 const available=variants.length>0
  ? Boolean(preferredVariant&&canSellVariant(preferredVariant))
  : (!stockTracked||product.allow_backorder||Number(product.stock_quantity||0)>0);
 async function addToCart(event){
  event.preventDefault();event.stopPropagation();
  if(!available||busy)return;
  setBusy(true);setMessage('');
  try{
   const current=JSON.parse(localStorage.getItem('pinkbox_cart')||'[]');
   const cartId=preferredVariant?product.id+':'+preferredVariant.id:product.id;
   const existing=current.find((item)=>item.id===cartId);
   const quantity=Number(existing?.quantity||0)+1;
   const max=stockTracked?Number(preferredVariant?preferredVariant.stock_quantity||0:product.stock_quantity||0):0;
   if(stockTracked&&max>0&&quantity>max&&!product.allow_backorder)throw new Error('Only '+max+' available');
   const cartImage=preferredVariant?.image_url||image;
   const item={
    ...product,
    id:cartId,
    product_id:product.id,
    variant_id:preferredVariant?.id||null,
    variant_title:preferredVariant?.title||null,
    sku:preferredVariant?.sku||product.sku,
    title:preferredVariant?product.title+' - '+preferredVariant.title:product.title,
    price:Number(preferredVariant?.price)>0?Number(preferredVariant.price):Number(product.price||0),
    image_url:cartImage,
    quantity:1,
    personalization:null,
   };
   const next=existing?current.map((entry)=>entry.id===cartId?{...entry,...item,quantity}:entry):[...current,item];
   localStorage.setItem('pinkbox_cart',JSON.stringify(next));
   window.dispatchEvent(new Event('pinkbox-cart-updated'));
   setMessage('Added to cart');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to add to cart');}
  finally{setBusy(false);}
 }
 return (
  <article className="group overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-shadow hover:shadow-md">
   <Link href={'/products/'+product.slug}>
    <div className="aspect-square overflow-hidden bg-muted">
     {image?<Image src={image} alt={product.title} width={600} height={600} unoptimized className="h-full w-full object-contain p-3" loading="lazy"/>:<div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>}
    </div>
    <div className="p-4"><h3 className="line-clamp-1 text-lg font-semibold text-card-foreground">{product.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description||product.description||''}</p><p className="mt-2 text-lg font-bold text-foreground">{money(product.price)}</p></div>
   </Link>
   <div className="px-4 pb-4">
    <button type="button" onClick={addToCart} disabled={busy||!available} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
     {busy&&<Loader2 className="h-4 w-4 animate-spin"/>}{busy?'Adding…':available?'Add to Cart':'Out of stock'}
    </button>
    {message&&<p className="mt-2 text-center text-xs text-muted-foreground" role="status">{message}</p>}
   </div>
  </article>
 );
}
