import Link from 'next/link';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import ProductPurchasePanel from '@/components/ProductPurchasePanel';
import ProductReviewForm from '@/components/ProductReviewForm';
import CartLink from '@/components/CartLink';
import { Star } from 'lucide-react';
import { absoluteUrl, safeJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Preserve old product URLs when a product slug is improved for SEO.
const LEGACY_PRODUCT_SLUGS = {
  e: 'maxi-care-3x-320mm-sanitary-pads',
};

async function getProduct(slug) {
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id,website_name,whatsapp_number,free_shipping_threshold,default_shipping_charge,cod_enabled,online_payment_enabled').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  if (!settings) return null;
  const productFields = 'id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,allow_backorder,seo_title,seo_description,seo_keywords,is_active,cod_override,online_payment_override,shipping_charge_override';
  const { data: matchedProduct } = await db.from('website_products').select(productFields).eq('company_id', settings.company_id).eq('slug', slug).eq('is_active', true).gt('price', 0).maybeSingle();
  let product = matchedProduct;
  // If an old slug no longer exists, load its mapped destination so the page can issue a permanent redirect.
  if (!product && LEGACY_PRODUCT_SLUGS[slug]) {
    const { data: replacement } = await db.from('website_products').select(productFields).eq('company_id', settings.company_id).eq('slug', LEGACY_PRODUCT_SLUGS[slug]).eq('is_active', true).gt('price', 0).maybeSingle();
    product = replacement;
  }
  if (!product) return null;
  const [{ data: images }, { data: variants }] = await Promise.all([
    db.from('website_product_images').select('image_url,alt_text,is_primary,sort_order').eq('company_id', settings.company_id).eq('product_id', product.id).order('sort_order'),
    db.from('website_product_variants').select('id,sku,title,option_values,price,compare_at_price,stock_quantity,image_url,is_active').eq('company_id', settings.company_id).eq('product_id', product.id).eq('is_active', true).order('created_at'),
  ]);
  const orderedImages = [...(images || [])].sort((a, b) => (Number(b.is_primary) - Number(a.is_primary)) || (Number(a.sort_order || 0) - Number(b.sort_order || 0)));
  const { data: reviews } = await db.from('website_product_reviews').select('id,customer_name,rating,title,review_text,created_at').eq('company_id', settings.company_id).eq('product_id', product.id).eq('is_approved', true).order('created_at', { ascending: false });
  return { ...product, website_name: settings.website_name, whatsapp_number: settings.whatsapp_number, free_shipping_threshold: settings.free_shipping_threshold, default_shipping_charge: settings.default_shipping_charge, cod_enabled: settings.cod_enabled, online_payment_enabled: settings.online_payment_enabled, images: orderedImages, variants: variants || [], reviews: reviews || [] };
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
    keywords: p.seo_keywords ? p.seo_keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean) : undefined,
    alternates: { canonical: `/products/${encodeURIComponent(p.slug)}` },
    openGraph: { type: 'website', url, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images }
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  if (slug !== p.slug) permanentRedirect(`/products/${encodeURIComponent(p.slug)}`);
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
            <CartLink className="text-gray-700" />
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
          <div className="mt-6"><ProductPurchasePanel product={{ ...p, images: p.images, image_url: p.images[0]?.image_url || null, variants: p.variants }} /></div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            {Number(p.free_shipping_threshold || 0) > 0 && <span className="rounded-full bg-[#fff3f6] px-3 py-2 text-[#c36f83]">Free shipping above ₹{Number(p.free_shipping_threshold).toLocaleString('en-IN')}</span>}
            {p.cod_enabled && <span className="rounded-full bg-[#f7f8ff] px-3 py-2 text-[#5b5d85]">COD available</span>}
            {p.online_payment_enabled && <span className="rounded-full bg-[#f3fbf6] px-3 py-2 text-[#3e7a5a]">UPI / online payment</span>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Quality checked</b><p className="mt-1 text-xs text-gray-500">Product information stays transparent.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">₹49 shipping below ₹499</b><p className="mt-1 text-xs text-gray-500">Free standard shipping from ₹499.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Easy support</b><p className="mt-1 text-xs text-gray-500">Questions? Chat with PinkBox on WhatsApp.</p></div>
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
        {p.reviews.length > 0 && <>
          <h2 className="text-2xl font-black">Customer reviews <span className="text-base font-semibold text-gray-500">({p.reviews.length})</span></h2>
          <div className="mt-6 space-y-4">{p.reviews.map(r => (
            <div key={r.id} className="rounded-2xl border p-5">
              <div className="flex gap-0.5 text-[#d9295f]">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} />)}</div>
              {r.title && <b className="mt-2 block text-sm">{r.title}</b>}
              <p className="mt-1 text-sm text-gray-600">{r.review_text}</p>
              <p className="mt-2 text-xs font-semibold text-gray-400">{r.customer_name}</p>
            </div>
          ))}</div>
        </>}
        <div className={p.reviews.length > 0 ? "mt-10" : ""}>
          <ProductReviewForm productId={p.id} />
        </div>
      </div>
    </main>
  );
}
