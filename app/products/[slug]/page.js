import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function getProduct(slug) {
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id,website_name').eq('slug','pinkbox').eq('status','active').maybeSingle();
  if (!settings) return null;
  const { data: product } = await db.from('website_products').select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,allow_backorder,seo_title,seo_description,is_active').eq('company_id',settings.company_id).eq('slug',slug).eq('is_active',true).maybeSingle();
  if (!product) return null;
  const { data: images } = await db.from('website_product_images').select('image_url,alt_text,is_primary,sort_order').eq('company_id',settings.company_id).eq('product_id',product.id).order('sort_order');
  return { ...product, website_name: settings.website_name, images: images || [] };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product | PinkBox' };
  return { title: p.seo_title || `${p.title} | ${p.website_name || 'PinkBox'}`, description: p.seo_description || p.short_description || p.description || '' };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const imgs = p.images.length ? p.images : [];
  const inStock = Number(p.stock_quantity || 0) > 0 || p.allow_backorder;
  return <main className="min-h-screen bg-white text-[#171717]">
    <header className="border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-black tracking-tight">PinkBox</Link>
        <Link href="/#products" className="text-sm font-semibold text-[#d9295f]">Continue shopping →</Link>
      </div>
    </header>
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-2 md:py-16">
      <div>
        <div className="overflow-hidden rounded-3xl bg-[#f7f4f5]">
          {imgs[0]?.image_url ? <img src={imgs[0].image_url} alt={imgs[0].alt_text || p.title} className="aspect-square w-full object-contain" /> : <div className="grid aspect-square place-items-center text-8xl font-black text-[#d9295f]/30">PB</div>}
        </div>
        {imgs.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{imgs.slice(0,5).map((x,i)=><div key={i} className="overflow-hidden rounded-xl bg-[#f7f4f5]"><img src={x.image_url} alt={x.alt_text || `${p.title} ${i+1}`} className="aspect-square w-full object-contain" /></div>)}</div>}
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">{p.brand || p.sku || 'PinkBox'}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{p.title}</h1>
        {p.short_description && <p className="mt-4 text-base leading-7 text-gray-600">{p.short_description}</p>}
        <div className="mt-7 flex items-end gap-3"><span className="text-3xl font-black">{money(p.price)}</span>{p.compare_at_price && <del className="text-sm text-gray-400">{money(p.compare_at_price)}</del>}</div>
        <div className="mt-5 rounded-2xl border bg-[#fff8fa] p-4 text-sm text-gray-700">{inStock ? '✓ Available to order' : 'Currently out of stock'}</div>
        {p.description && <div className="mt-7"><h2 className="text-lg font-bold">Product details</h2><p className="mt-3 whitespace-pre-line leading-7 text-gray-600">{p.description}</p></div>}
        <div className="mt-8 flex gap-3"><Link href="/#products" className="inline-flex rounded-2xl bg-[#d9295f] px-6 py-3 font-bold text-white">Shop & add to cart</Link><Link href="/account" className="inline-flex rounded-2xl border px-6 py-3 font-bold">My account</Link></div>
      </div>
    </div>
  </main>;
}
