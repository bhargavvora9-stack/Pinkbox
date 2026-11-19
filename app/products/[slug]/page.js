import Link from 'next/link';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
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
  const { data: settings } = await db.from('website_settings').select('company_id,website_name,logo_url,whatsapp_number,free_shipping_threshold,default_shipping_charge,cod_enabled,online_payment_enabled').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  if (!settings) return null;
  const productFields = 'id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,seo_title,seo_description,seo_keywords,is_active,cod_override,online_payment_override,shipping_charge_override,requires_personalization,personalization_label';
  const { data: matchedProduct } = await db.from('website_products').select(productFields).eq('company_id', settings.company_id).eq('slug', slug).eq('is_active', true).like('sku', 'MDH-%').gt('price', 0).maybeSingle();
  let product = matchedProduct;
  // If an old slug no longer exists, load its mapped destination so the page can issue a permanent redirect.
  if (!product && LEGACY_PRODUCT_SLUGS[slug]) {
    const { data: replacement } = await db.from('website_products').select(productFields).eq('company_id', settings.company_id).eq('slug', LEGACY_PRODUCT_SLUGS[slug]).eq('is_active', true).like('sku', 'MDH-%').gt('price', 0).maybeSingle();
    product = replacement;
  }
  if (!product) return null;
  const [{ data: images }, { data: variants }, { data: categoryMappings }] = await Promise.all([
    db.from('website_product_images').select('image_url,alt_text,is_primary,sort_order').eq('company_id', settings.company_id).eq('product_id', product.id).order('sort_order'),
    db.from('website_product_variants').select('id,sku,title,option_values,price,compare_at_price,stock_quantity,image_url,is_active').eq('company_id', settings.company_id).eq('product_id', product.id).eq('is_active', true).order('created_at'),
    db.from('website_product_categories').select('category_id').eq('company_id', settings.company_id).eq('product_id', product.id),
  ]);
  const categoryIds = [...new Set((categoryMappings || []).map((x) => x.category_id).filter(Boolean))];
  const { data: categories } = categoryIds.length
    ? await db.from('website_categories').select('slug').eq('company_id', settings.company_id).in('id', categoryIds).eq('is_active', true)
    : { data: [] };
  const category_slugs = (categories || []).map((category) => category.slug);
  const orderedImages = [...(images || [])].sort((a, b) => (Number(b.is_primary) - Number(a.is_primary)) || (Number(a.sort_order || 0) - Number(b.sort_order || 0)));
  const resolvedImages = orderedImages.length ? orderedImages : [{ image_url: `/catalog-products/${product.sku.toLowerCase()}.webp`, alt_text: product.title, is_primary: true, sort_order: 0 }];
  const { data: reviews } = await db.from('website_product_reviews').select('id,customer_name,rating,title,review_text,created_at').eq('company_id', settings.company_id).eq('product_id', product.id).eq('is_approved', true).order('created_at', { ascending: false });
  return { ...product, category_slugs, website_name: settings.website_name, logo_url: settings.logo_url, whatsapp_number: settings.whatsapp_number, free_shipping_threshold: settings.free_shipping_threshold, default_shipping_charge: settings.default_shipping_charge, cod_enabled: settings.cod_enabled, online_payment_enabled: settings.online_payment_enabled, images: resolvedImages, variants: variants || [], reviews: reviews || [] };
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
  const hasAvailableVariant = (p.variants || []).length ? p.variants.some(v => Number(v.stock_quantity || 0) > 0) : Number(p.stock_quantity || 0) > 0;
  const inStock = p.track_inventory === false || hasAvailableVariant || p.allow_backorder === true;
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
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        '@id': absoluteUrl('/#organization'),
        name: p.website_name || 'PinkBox',
        url: absoluteUrl('/'),
        ...(p.logo_url ? { logo: { '@type': 'ImageObject', url: p.logo_url } } : {})
      },
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
  const isBabyDiaper = (p.category_slugs || []).includes('baby-diapers');
  const isSanitaryProduct = (p.category_slugs || []).includes('sanitary-pads');
  const topicLinks = isBabyDiaper
    ? [
        { href: '/pages/baby-diaper-size-guide', label: 'Baby Diaper Size Guide' },
        { href: '/collections/baby-diapers', label: 'Browse Baby Diapers' }
      ]
    : isSanitaryProduct
      ? [
          { href: '/pages/sanitary-pads', label: 'Sanitary Pads Guide' },
          { href: '/pages/320mm-sanitary-pads', label: '320mm Sanitary Pads' },
          { href: '/pages/sanitary-pads-for-heavy-flow', label: 'Sanitary Pads for Heavy Flow' },
          ...(String(p.brand || '').toLowerCase().includes('24 care') ? [{ href: '/pages/24-care-sanitary-pads', label: '24 Care Sanitary Pads' }] : []),
          ...(String(p.brand || '').toLowerCase().includes('7 soft') ? [{ href: '/pages/7-soft-sanitary-pads', label: '7 Soft Sanitary Pads' }] : [])
        ]
      : [];
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
      <ZipReferenceHeader settings={{ phone: p.phone, website_name: p.website_name }} />
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          <section>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {p.images[0]?.image_url ? <Image src={p.images[0].image_url} alt={p.images[0].alt_text || p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="h-full w-full object-cover" priority /> : <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>}
            </div>
            {p.images.length > 1 && <div className="mt-4 grid grid-cols-5 gap-3">{p.images.slice(0, 5).map((image, index) => <div key={image.id || index} className="relative aspect-square overflow-hidden rounded-md bg-muted"><Image src={image.image_url} alt={image.alt_text || p.title} fill sizes="100px" className="object-cover" /></div>)}</div>}
          </section>
          <section className="flex flex-col">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">{p.brand || p.sku || 'Pink Box'}</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">{p.title}</h1>
            {p.short_description && <p className="mt-4 leading-relaxed text-muted-foreground">{p.short_description}</p>}
            <div className="mt-6"><ProductPurchasePanel product={{ ...p, images: p.images, image_url: p.images[0]?.image_url || null, variants: p.variants }} /></div>
            {p.description && <section className="mt-8"><h2 className="font-display text-xl font-semibold text-foreground">Product details</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p></section>}
            {topicLinks.length > 0 && <section className="mt-8"><h2 className="font-display text-xl font-semibold text-foreground">Related guides</h2><div className="mt-4 flex flex-wrap gap-2">{topicLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">{link.label}</Link>)}</div></section>}
          </section>
        </div>
        <section className="mx-auto mt-16 max-w-3xl">
          {p.reviews.length > 0 && <>
            <h2 className="font-display text-2xl font-semibold text-foreground">Customer reviews <span className="text-base font-medium text-muted-foreground">({p.reviews.length})</span></h2>
            <div className="mt-6 space-y-4">{p.reviews.map((review) => <article key={review.id} className="rounded-xl border border-border bg-card p-5"><div className="flex gap-1 text-primary">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={14} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div>{review.title && <h3 className="mt-2 font-semibold text-foreground">{review.title}</h3>}<p className="mt-2 text-sm text-muted-foreground">{review.review_text}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">{review.customer_name}</p></article>)}</div>
          </>}
          <div className={p.reviews.length > 0 ? 'mt-10' : ''}><ProductReviewForm productId={p.id} /></div>
        </section>
      </main>
      <ZipReferenceFooter settings={{ phone: p.phone, email: p.email, address: p.address, website_name: p.website_name }} />
    </div>
  );
}
