'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
const money=(value)=>'₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const shouldUnoptimizeImage = (src) => {
  if (typeof src !== 'string') return true;
  return !(src.startsWith('/') || /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(src));
};
export default function ZipReferenceProductCard({product, priority = false}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const image=product.image_url||product.images?.[0]?.image_url||null;
 const variants=Array.isArray(product.variants)?product.variants.filter((variant)=>variant?.is_active!==false):[];
 const canSellVariant=(variant)=>product.track_inventory===false||product.allow_backorder===true||Number(variant?.stock_quantity||0)>0;
 const preferredVariant=variants.find(canSellVariant)||variants[0]||null;
 const stockTracked=product.track_inventory!==false;
 const offerPrice=Number(preferredVariant?.price)>0?Number(preferredVariant.price):Number(product.price||0);
 const listPrice=Number(preferredVariant?.compare_at_price)>offerPrice?Number(preferredVariant.compare_at_price):Number(product.compare_at_price||0);
 const packText=[preferredVariant?.title,product.title].filter(Boolean).join(' ');
 const packMatch=packText.match(/\b(\d{1,3})\s*(?:pcs?|pieces|pads?|counts?)\b/i);
 const packCount=packMatch?Number(packMatch[1]):0;
 const perPiece=packCount>0?offerPrice/packCount:0;
 const available=variants.length>0
  ? Boolean(preferredVariant&&canSellVariant(preferredVariant))
  : (!stockTracked||product.allow_backorder||Number(product.stock_quantity||0)>0);
 async function addToCart(event,buyNow=false){
  event.preventDefault();event.stopPropagation();
  if(!available||busy)return;
  setBusy(true);setMessage('');
  try{
   const stored=JSON.parse(localStorage.getItem('pinkbox_cart')||'[]');
   const current=Array.isArray(stored)?stored:[];
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
    quantity_limit:max>0&&!product.allow_backorder?max:null,
    allow_backorder:Boolean(product.allow_backorder),
   };
   const next=existing?current.map((entry)=>entry.id===cartId?{...entry,...item,quantity}:entry):[...current,item];
   localStorage.setItem('pinkbox_cart',JSON.stringify(next));
   window.dispatchEvent(new Event('pinkbox-cart-updated'));
   if(buyNow){
    router.push('/checkout');
    return;
   }
   setMessage('Added to cart');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to add to cart');}
  finally{setBusy(false);}
 }
 return (
  <article className="group overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-shadow hover:shadow-md">
   <Link href={'/products/'+product.slug}>
    <div className="aspect-square overflow-hidden bg-muted">
     {image?<Image src={image} alt={product.title} width={600} height={600} sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc((100vw - 3rem) / 2), (max-width: 1279px) calc((100vw - 4rem) / 3), 25vw" unoptimized={shouldUnoptimizeImage(image)} className="h-full w-full object-contain p-3" preload={priority || undefined} fetchPriority={priority ? "high" : "auto"} loading={priority ? undefined : "lazy"} decoding="async"/>:<div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>}
    </div>
    <div className="p-4"><h2 className="line-clamp-1 text-lg font-semibold text-card-foreground">{product.title}</h2><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description||product.description||''}</p><div className="mt-2 flex flex-wrap items-baseline gap-2"><p className="text-lg font-bold text-foreground">{money(offerPrice)}</p>{listPrice>offerPrice&&<><p className="text-sm text-muted-foreground line-through">MRP {money(listPrice)}</p><span className="text-xs font-semibold text-primary">{Math.round((1-offerPrice/listPrice)*100)}% off</span></>}</div>{packCount>0&&<p className="mt-1 text-xs text-muted-foreground">{packCount}-piece pack · {money(perPiece)} per piece</p>}{!available&&<p className="mt-2 text-xs font-semibold text-muted-foreground">Currently out of stock</p>}</div>
   </Link>
   <div className="grid grid-cols-2 gap-2 px-4 pb-4">
    <button type="button" onClick={(event)=>addToCart(event,false)} disabled={busy||!available} className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-primary bg-background px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm">
     {busy&&<Loader2 className="h-4 w-4 animate-spin"/>}{busy?'Adding…':available?'Add to Cart':'Out of stock'}
    </button>
    <button type="button" onClick={(event)=>addToCart(event,true)} disabled={busy||!available} className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm">
     {busy&&<Loader2 className="h-4 w-4 animate-spin"/>}{busy?'Please wait…':'Buy Now'}
    </button>
    {message&&<p className="mt-2 text-center text-xs text-muted-foreground" role="status">{message}</p>}
   </div>
  </article>
 );
}
