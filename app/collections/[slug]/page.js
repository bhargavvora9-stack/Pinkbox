import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function getCollection(slug) {
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id,website_name').eq('slug','pinkbox').eq('status','active').maybeSingle();
  if (!settings) return null;
  const { data: category } = await db.from('website_categories').select('id,name,slug,image_url').eq('company_id',settings.company_id).eq('slug',slug).eq('is_active',true).maybeSingle();
  if (!category) return null;
  const { data: mappings } = await db.from('website_product_categories').select('product_id').eq('company_id',settings.company_id).eq('category_id',category.id);
  const ids = (mappings || []).map(x => x.product_id);
  const { data: products } = ids.length ? await db.from('website_products').select('id,sku,title,slug,short_description,price,compare_at_price,stock_quantity,is_active').eq('company_id',settings.company_id).in('id',ids).eq('is_active',true).order('created_at',{ascending:false}) : {data:[]};
  const { data: images } = ids.length ? await db.from('website_product_images').select('product_id,image_url,is_primary,sort_order').eq('company_id',settings.company_id).in('product_id',ids).order('sort_order') : {data:[]};
  const imageMap = {}; (images || []).forEach(x => { if (!imageMap[x.product_id] || x.is_primary) imageMap[x.product_id] = x.image_url; });
  return {category, products:(products || []).map(p => ({...p,image_url:imageMap[p.id]||null}))};
}

export async function generateMetadata({params}) {
  const {slug} = await params; const c = await getCollection(slug);
  return { title: c ? `${c.category.name} | PinkBox` : 'Collection | PinkBox', description: c ? `Shop ${c.category.name} products from PinkBox.` : '' };
}

export default async function CollectionPage({params}) {
  const {slug} = await params; const c = await getCollection(slug); if (!c) notFound();
  return <main className="min-h-screen bg-white text-[#171717]">
    <header className="border-b"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="font-black tracking-tight">PinkBox</Link><div className="flex gap-4 text-sm font-semibold"><Link href="/account">Account</Link><Link href="/#products">All products</Link></div></div></header>
    <section className="mx-auto max-w-6xl px-5 py-12"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Collection</p><h1 className="mt-3 text-5xl font-black tracking-tight">{c.category.name}</h1><p className="mt-3 max-w-2xl text-gray-600">Explore the PinkBox {c.category.name} collection.</p>
      {!c.products.length ? <div className="mt-10 rounded-3xl border border-dashed p-12 text-center text-gray-500">No products available in this collection yet.</div> : <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">{c.products.map(p=><Link href={`/products/${p.slug}`} key={p.id} className="group"><div className="overflow-hidden rounded-2xl bg-[#f7f4f5]">{p.image_url ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-contain transition group-hover:scale-[1.03]"/> : <div className="grid aspect-square place-items-center text-6xl font-black text-[#d9295f]/25">PB</div>}</div><p className="mt-3 text-xs text-gray-400">{p.sku || 'PinkBox'}</p><h2 className="mt-1 font-bold">{p.title}</h2><div className="mt-2 font-black">{money(p.price)} {p.compare_at_price && <del className="ml-1 text-xs font-normal text-gray-400">{money(p.compare_at_price)}</del>}</div></Link>)}</div>}
    </section>
  </main>;
}
