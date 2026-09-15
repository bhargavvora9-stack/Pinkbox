import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import ProductPurchasePanel from '@/components/ProductPurchasePanel';
import ProductReviewForm from '@/components/ProductReviewForm';
import { Star } from 'lucide-react';
import { absoluteUrl, safeJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProduct(slug) {
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id,website_name,whatsapp_number').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  if (!settings) return null;
  const { data: product } = await db.from('website_products').select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,allow_backorder,seo_title,seo_description,is_active,cod_override,online_payment_override,shipping_charge_override').eq('company_id', settings.company_id).eq('slug', slug).eq('is_active', true).maybeSingle();
  if (!product) return null;
  const { data: images } = await db.from('website_product_images').select('image_url,alt_text,is_primary,sort_order').eq('company_id', settings.company_id).eq('product_id', product.id).order('sort_order');
  const { data: reviews } = await db.from('website_product_reviews').select('id,customer_name,rating,title,review_text,created_at').eq('company_id', settings.company_id).eq('product_id', product.id).eq('is_approved', true).order('created_at', { ascending: false });
  return { ...product, website_name: settings.website_name, whatsapp_number: settings.whatsapp_number, images: images || [], reviews: reviews || [] };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product | PinkBox' };
  const url = absoluteUrl(`/products/${encodeURIComponent(p.slug)}`);
  const title = p.seo_title || `${p.title} | ${p.website_name || 'PinkBox'}`;
  const description = p.seo_description || p.short_description || p.description || '';
  const images = p.images.filter(x => x.image_url).map(x => x.image_url);
  return {
    title,
    description,
    alternates: { canonical: `/products/${encodeURIComponent(p.slug)}` },
    openGraph: { type: 'website', url, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images }
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const waNumber = String(p.whatsapp_number || '').replace(/[^0-9]/g, '');
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I have a question about ${p.title}.`)}` : null;
  const url = absoluteUrl(`/products/${encodeURIComponent(p.slug)}`);
  const imageUrls = p.images.filter(x => x.image_url).map(x => x.image_url);
  const inStock = Number(p.stock_quantity || 0) > 0 || p.allow_backorder === true;
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.seo_description || p.short_description || p.description || undefined,
    sku: p.sku || undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    image: imageUrls.length ? imageUrls : undefined,
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: Number(p.price || 0).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  };
  if (p.reviews.length) {
    const averageRating = p.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / p.reviews.length;
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(averageRating.toFixed(2)),
      reviewCount: p.reviews.length,
      bestRating: 5,
      worstRating: 1
    };
  }
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: p.brand || 'Products', item: absoluteUrl('/products') },
      { '@type': 'ListItem', position: 3, name: p.title, item: url }
    ]
  };
  const topicLinks = [
    { href: '/pages/sanitary-pads', label: 'Sanitary Pads Guide' },
    { href: '/pages/320mm-sanitary-pads', label: '320mm Sanitary Pads' },
    { href: '/pages/sanitary-pads-for-heavy-flow', label: 'Sanitary Pads for Heavy Flow' },
    ...(String(p.brand || '').toLowerCase().includes('24 care') ? [{ href: '/pages/24-care-sanitary-pads', label: '24 Care Sanitary Pads' }] : []),
    ...(String(p.brand || '').toLowerCase().includes('7 soft') ? [{ href: '/pages/7-soft-sanitary-pads', label: '7 Soft Sanitary Pads' }] : [])
  ];
  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-black tracking-tight">PinkBox</Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/account">Account</Link>
            <Link href="/#products" className="text-[#d9295f]">Continue shopping →</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-[#d9295f]">Home</Link><span className="mx-2">/</span><span>{p.brand || 'PinkBox'}</span><span className="mx-2">/</span><span className="text-gray-700">{p.title}</span>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 md:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] bg-[#f7f4f5] p-6">
            {p.images[0]?.image_url ? <div className="relative aspect-square w-full"><Image src={p.images[0].image_url} alt={p.images[0].alt_text || p.title} fill sizes="(max-width:640px) 90vw, 380px" style={{objectFit:'contain'}} priority /></div> : <div className="grid aspect-square place-items-center text-8xl font-black text-[#d9295f]/30">PB</div>}
          </div>
          {p.images.length > 1 && <div className="mx-auto mt-4 grid max-w-sm grid-cols-5 gap-3">{p.images.slice(0, 5).map((x, i) => <div key={i} className="relative aspect-square overflow-hidden rounded-2xl border bg-[#f7f4f5] p-1"><Image src={x.image_url} alt={x.alt_text || `${p.title} ${i + 1}`} fill sizes="76px" style={{objectFit:'contain'}} /></div>)}</div>}
        </section>
        <section className="flex flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">{p.brand || p.sku || 'PinkBox'}</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] md:text-5xl">{p.title}</h1>
          {p.short_description && <p className="mt-5 text-base leading-7 text-gray-600">{p.short_description}</p>}
          <div className="mt-6"><ProductPurchasePanel product={{ ...p, images: p.images, image_url: p.images[0]?.image_url || null }} /></div>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Quality checked</b><p className="mt-1 text-xs text-gray-500">Product information stays transparent.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Secure checkout</b><p className="mt-1 text-xs text-gray-500">COD and online payment supported.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Easy support</b><p className="mt-1 text-xs text-gray-500">Help is available when you need it.</p></div>
          </div>
          {waHref && <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white">Ask a question on WhatsApp</a>}
          {p.description && <details open className="mt-8 rounded-2xl border p-5"><summary className="cursor-pointer font-bold">Product details</summary><p className="mt-4 whitespace-pre-line leading-7 text-gray-600">{p.description}</p></details>}
        </section>
      </div>
      <section className="mx-auto max-w-7xl px-5 pb-12">
        <div className="rounded-3xl border bg-[#fff9fb] p-6">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Related guides</p>
          <h2 className="mt-2 text-2xl font-black">Choose the right sanitary pads</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {topicLinks.map(link => <Link key={link.href} href={link.href} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">{link.label}</Link>)}
            <Link href="/blog" className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">Sanitary Pad Guides & Journal</Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-5 pb-20">
        <h2 className="text-2xl font-black">Customer reviews {p.reviews.length > 0 && <span className="text-base font-semibold text-gray-500">({p.reviews.length})</span>}</h2>
        {p.reviews.length > 0 ? <div className="mt-6 space-y-4">{p.reviews.map(r => (
          <div key={r.id} className="rounded-2xl border p-5">
            <div className="flex gap-0.5 text-[#d9295f]">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} />)}</div>
            {r.title && <b className="mt-2 block text-sm">{r.title}</b>}
            <p className="mt-1 text-sm text-gray-600">{r.review_text}</p>
            <p className="mt-2 text-xs font-semibold text-gray-400">{r.customer_name}</p>
          </div>
        ))}</div> : <p className="mt-4 text-sm text-gray-500">No reviews yet — be the first to share your experience after your order arrives.</p>}
        <div className="mt-8"><ProductReviewForm productId={p.id} /></div>
      </div>
    </main>
  );
}
