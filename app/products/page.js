import Link from 'next/link';
import {createAdminClient} from '@/lib/supabase-admin';
import {ArrowLeft,ArrowRight,ShoppingBag} from 'lucide-react';

export const dynamic='force-dynamic';
export const revalidate=0;

const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

async function getProducts(){
 const db=createAdminClient();
 const {data:settings}=await db.from('website_settings').select('company_id,website_name,logo_url').eq('slug','pinkbox').eq('status','active').maybeSingle();
 if(!settings)return {settings:null,products:[]};
 const {data:products}=await db.from('website_products').select('id,sku,title,slug,short_description,price,compare_at_price,stock_quantity,track_inventory,is_active,brand').eq('company_id',settings.company_id).eq('is_active',true).order('created_at',{ascending:false});
 const ids=(products||[]).map(p=>p.id);
 const {data:images}=ids.length?await db.from('website_product_images').select('id,product_id,image_url,is_primary,sort_order').eq('company_id',settings.company_id).in('product_id',ids).order('sort_order'):{data:[]};
 const imageMap={};(images||[]).forEach(x=>{if(!imageMap[x.product_id]||x.is_primary)imageMap[x.product_id]=x.image_url});
 return {settings,products:(products||[]).map(p=>({...p,image_url:imageMap[p.id]||null}))};
}

export async function generateMetadata(){
 const {settings}=await getProducts();
 return {title:`Products | ${settings?.website_name||'PinkBox'}`,description:`Shop ${settings?.website_name||'PinkBox'} products.`};
}

export default async function ProductsPage(){
 const {settings,products}=await getProducts();
 return <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 font-semibold text-[#c36f83]"><ArrowLeft size={16}/> PinkBox</Link><div className="flex items-center gap-4"><Link href="/account" className="text-sm font-semibold">Account</Link><Link href="/cart" aria-label="Cart" className="inline-flex items-center gap-2 text-sm font-semibold"><ShoppingBag size={17}/> Cart</Link></div></div><header className="mt-10"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#c36f83]">{settings?.website_name||'PinkBox'}</p><h1 className="mt-2 text-5xl font-semibold tracking-tight">Our products</h1><p className="mt-3 max-w-2xl text-[#846f70]">Browse the current PinkBox range. Select a product to view details, images and ordering options.</p></header>{!products.length?<div className="mt-10 rounded-3xl border border-dashed border-[#eadfd9] bg-white p-12 text-center text-[#846f70]">No active products are available yet.</div>:<div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">{products.map(p=><Link href={`/products/${p.slug}`} key={p.id} className="group rounded-3xl border border-[#eadfd9] bg-white p-3 shadow-sm transition hover:-translate-y-0.5"><div className="overflow-hidden rounded-2xl bg-[#f6eeeb]">{p.image_url?<img src={p.image_url} alt={p.title} className="aspect-square w-full object-contain transition group-hover:scale-[1.03]"/>:<div className="grid aspect-square place-items-center text-6xl font-black text-[#d8899d]/35">PB</div>}</div><p className="mt-3 text-xs text-[#a08488]">{p.brand||p.sku||'PinkBox'}</p><h2 className="mt-1 font-bold text-[#5f4649]">{p.title}</h2><div className="mt-2 flex items-center justify-between"><div className="font-black">{money(p.price)} {Number(p.compare_at_price)>Number(p.price||0)&&<del className="ml-1 text-xs font-normal text-gray-400">{money(p.compare_at_price)}</del>}</div><span className="rounded-full bg-[#fff0f5] p-2 text-[#d9295f]"><ArrowRight size={15}/></span></div></Link>)}</div>}</div></main>;
}
