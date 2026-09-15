import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import { absoluteUrl, safeJsonLd } from '@/lib/seo';

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
  if (!c) return { title: 'Collection | PinkBox' };
  const isSanitary = c.category.slug === 'sanitary-pads';
  const title = isSanitary ? 'Sanitary Pads & Sanitary Napkins | PinkBox' : `${c.category.name} | PinkBox`;
  const description = isSanitary
    ? 'Shop sanitary pads and sanitary napkins online at PinkBox. Explore 320mm, heavy-flow, cottony-surface and anti-bacterial sanitary pad options.'
    : `Shop ${c.category.name} products at PinkBox. Explore product options, sizes, prices and everyday essentials.`;
  return { title, description, alternates: { canonical: `/collections/${encodeURIComponent(c.category.slug)}` }, openGraph: { title, description, url: absoluteUrl(`/collections/${encodeURIComponent(c.category.slug)}`), type: 'website' } };
}

export default async function CollectionPage({params}) {
  const {slug} = await params; const c = await getCollection(slug); if (!c) notFound();
  const isSanitary = c.category.slug === 'sanitary-pads';
  const guideLinks = isSanitary
    ? [
        ['/pages/sanitary-pads', 'Sanitary Pads Guide'],
        ['/pages/320mm-sanitary-pads', '320mm Sanitary Pads'],
        ['/pages/sanitary-pads-for-heavy-flow', 'Sanitary Pads for Heavy Flow'],
        ['/pages/anti-bacterial-sanitary-pads', 'Anti-Bacterial Sanitary Pads'],
        ['/pages/24-care-sanitary-pads', '24 Care Sanitary Pads'],
        ['/pages/7-soft-sanitary-pads', '7 Soft Sanitary Pads']
      ]
    : [['/pages/sanitary-pads', 'Sanitary Pads Guide']];
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isSanitary ? 'Sanitary Pads & Sanitary Napkins' : c.category.name,
    url: absoluteUrl(`/collections/${encodeURIComponent(c.category.slug)}`),
    mainEntity: { '@type': 'ItemList', itemListElement: c.products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(`/products/${encodeURIComponent(p.slug)}`), name: p.title })) }
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: isSanitary ? 'Sanitary Pads & Sanitary Napkins' : c.category.name, item: absoluteUrl(`/collections/${encodeURIComponent(c.category.slug)}`) }
    ]
  };
  return <main className="min-h-screen bg-white text-[#171717]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
    <header className="border-b"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="font-black tracking-tight">PinkBox</Link><div className="flex gap-4 text-sm font-semibold"><Link href="/account">Account</Link><Link href="/products">All products</Link></div></div></header>
    <section className="mx-auto max-w-6xl px-5 py-12"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">{isSanitary ? 'Sanitary Care' : 'Collection'}</p><h1 className="mt-3 text-5xl font-black tracking-tight">{isSanitary ? 'Sanitary Pads & Sanitary Napkins' : c.category.name}</h1><p className="mt-3 max-w-2xl text-gray-600">{isSanitary ? 'Shop sanitary pads and sanitary napkins online from PinkBox. Compare 320mm sanitary pads, heavy-flow protection, cottony surfaces and anti-bacterial options for everyday menstrual care.' : `Explore the PinkBox ${c.category.name} collection with product details, current prices and related guides.`}</p>
{!c.products.length ? <div className="mt-10 rounded-3xl border border-dashed p-12 text-center text-gray-500">No products available in this collection yet.</div> : <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">{c.products.map(p=><Link href={`/products/${p.slug}`} key={p.id} className="group"><div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f7f4f5]">{p.image_url ? <Image src={p.image_url} alt={p.title} fill sizes="(max-width:768px) 50vw, 25vw" style={{objectFit:'contain'}} className="transition group-hover:scale-[1.03]"/> : <div className="grid h-full place-items-center text-6xl font-black text-[#d9295f]/25">PB</div>}</div><p className="mt-3 text-xs text-gray-400">{p.sku || 'PinkBox'}</p><h2 className="mt-1 font-bold">{p.title}</h2><div className="mt-2 font-black">{money(p.price)} {Number(p.compare_at_price)>0 && <del className="ml-1 text-xs font-normal text-gray-400">{money(p.compare_at_price)}</del>}</div></Link>)}</div>}
      {isSanitary && <div className="mt-14 rounded-3xl border bg-[#fff9fb] p-6"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Explore sanitary care</p><h2 className="mt-2 text-2xl font-black">Sanitary pads for everyday, night and heavy flow</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">PinkBox covers common sanitary pad searches including sanitary pads, sanitary napkins, 320mm sanitary pads, heavy-flow sanitary pads, cottony-surface pads and anti-bacterial sanitary pads. Use the guides below to compare the right type for your needs.</p><div className="mt-4 flex flex-wrap gap-3">{guideLinks.map(([href,label])=><Link key={href} href={href} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">{label}</Link>)}<Link href="/blog" className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">Sanitary Pad Journal</Link></div></div>}
      {!isSanitary && <div className="mt-14 rounded-3xl border bg-[#fff9fb] p-6"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Related guide</p><h2 className="mt-2 text-2xl font-black">Sanitary Pad Journal</h2><div className="mt-4 flex flex-wrap gap-3">{guideLinks.map(([href,label])=><Link key={href} href={href} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">{label}</Link>)}<Link href="/blog" className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">View all articles</Link></div></div>}
    </section>
  </main>;
}
