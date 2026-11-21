import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import ProductImageGallery from '@/components/ProductImageGallery';
import { notFound, permanentRedirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import ProductPurchasePanel from '@/components/ProductPurchasePanel';
import ProductReviewForm from '@/components/ProductReviewForm';
import { Star } from 'lucide-react';
import { absoluteUrl, safeJsonLd, buildProductMetaDescription } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Preserve old product URLs when a product slug is improved for SEO.
const LEGACY_PRODUCT_SLUGS = {
  e: 'maxi-care-3x-320mm-sanitary-pads',
};

async function getProduct(slug) {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id,website_name,logo_url,phone,whatsapp_number,email,address,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold,default_shipping_charge,cod_enabled,online_payment_enabled')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();
  if (!settings) return null;

  const productFields = 'id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,seo_title,seo_description,seo_keywords,is_active,cod_override,online_payment_override,shipping_charge_override,requires_personalization,personalization_label';
  const { data: matchedProduct } = await db
    .from('website_products')
    .select(productFields)
    .eq('company_id', settings.company_id)
    .eq('slug', slug)
    .eq('is_active', true)
    .or('sku.like.MDH-%,sku.like.BAG-%')
    .gt('price', 0)
    .maybeSingle();

  let product = matchedProduct;
  if (!product && LEGACY_PRODUCT_SLUGS[slug]) {
    const { data: replacement } = await db
      .from('website_products')
      .select(productFields)
      .eq('company_id', settings.company_id)
      .eq('slug', LEGACY_PRODUCT_SLUGS[slug])
      .eq('is_active', true)
      .or('sku.like.MDH-%,sku.like.BAG-%')
      .gt('price', 0)
      .maybeSingle();
    product = replacement;
  }
  if (!product) return null;

  const [{ data: images }, { data: variants }, { data: reviews }] = await Promise.all([
    db.from('website_product_images')
      .select('image_url,alt_text,is_primary,sort_order')
      .eq('company_id', settings.company_id)
      .eq('product_id', product.id)
      .order('sort_order'),
    db.from('website_product_variants')
      .select('id,sku,title,option_values,price,compare_at_price,stock_quantity,image_url,is_active')
      .eq('company_id', settings.company_id)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('created_at'),
    db.from('website_product_reviews')
      .select('id,customer_name,rating,title,review_text,created_at')
      .eq('company_id', settings.company_id)
      .eq('product_id', product.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false }),
  ]);

  const orderedImages = [...(images || [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) ||
      Number(a.sort_order || 0) - Number(b.sort_order || 0),
  );
  const resolvedImages = orderedImages.length
    ? orderedImages
    : [{
        image_url: '/catalog-products/' + product.sku.toLowerCase() + '.webp',
        alt_text: product.title,
        is_primary: true,
        sort_order: 0,
      }];

  return {
    ...product,
    website_name: settings.website_name,
    logo_url: settings.logo_url,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    instagram_url: settings.instagram_url,
    facebook_url: settings.facebook_url,
    youtube_url: settings.youtube_url,
    announcement_text: settings.announcement_text,
    whatsapp_number: settings.whatsapp_number,
    free_shipping_threshold: settings.free_shipping_threshold,
    default_shipping_charge: settings.default_shipping_charge,
    cod_enabled: settings.cod_enabled,
    online_payment_enabled: settings.online_payment_enabled,
    images: resolvedImages,
    variants: variants || [],
    reviews: reviews || [],
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product | PinkBox' };
  const url = absoluteUrl('/products/' + encodeURIComponent(p.slug));
  const title = p.seo_title || p.title + ' | ' + (p.website_name || 'PinkBox');
  const description = buildProductMetaDescription(p);
  const images = p.images.filter((image) => image.image_url).map((image) => image.image_url);

  return {
    title,
    description,
    keywords: p.seo_keywords
      ? p.seo_keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean)
      : undefined,
    alternates: { canonical: '/products/' + encodeURIComponent(p.slug) },
    openGraph: { type: 'website', url, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const fetchedProduct = await getProduct(slug);
  if (!fetchedProduct) notFound();
  if (slug !== fetchedProduct.slug) permanentRedirect('/products/' + encodeURIComponent(fetchedProduct.slug));

  // The raw catalogue record contains internal supplier notes and saved SEO text
  // with stale prices. Do not serialize those fields into the client component payload.
  const p = {
    ...fetchedProduct,
    description: fetchedProduct.short_description || '',
    seo_description: buildProductMetaDescription(fetchedProduct),
  };

  const url = absoluteUrl('/products/' + encodeURIComponent(p.slug));
  const imageUrls = p.images.filter((image) => image.image_url).map((image) => image.image_url);
  const hasAvailableVariant = p.variants.length
    ? p.variants.some((variant) => Number(variant.stock_quantity || 0) > 0)
    : Number(p.stock_quantity || 0) > 0;
  const inStock = p.track_inventory === false || hasAvailableVariant || p.allow_backorder === true;
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: buildProductMetaDescription(p),
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
        ...(p.logo_url ? { logo: { '@type': 'ImageObject', url: p.logo_url } } : {}),
      },
    },
  };

  if (p.reviews.length) {
    const averageRating = p.reviews.reduce((sum, review) => sum + review.rating, 0) / p.reviews.length;
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(averageRating.toFixed(2)),
      reviewCount: p.reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Products', item: absoluteUrl('/shop') },
      { '@type': 'ListItem', position: 3, name: p.title, item: url },
    ],
  };
  const averageRating = p.reviews.length
    ? p.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / p.reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
      <ZipReferenceHeader settings={p} />
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          <ProductImageGallery images={p.images} title={p.title} />

          <section className="flex flex-col">
            <h1 className="text-3xl font-bold text-foreground">{p.title}</h1>
            <ProductPurchasePanel
              product={{
                ...p,
                images: p.images,
                image_url: p.images[0]?.image_url || null,
                variants: p.variants,
              }}
              description={p.short_description || ''}
            />
          </section>
        </div>

        <section className="mt-16 border-t border-border pt-10" aria-label="Customer reviews">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Customer Reviews</h2>
              {p.reviews.length > 0 ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-0.5" aria-label={averageRating.toFixed(1) + ' out of 5 stars'}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={'h-4 w-4 ' + (value <= Math.round(averageRating)
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground/40')}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {averageRating.toFixed(1)} out of 5 · {p.reviews.length} {p.reviews.length === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No reviews yet — be the first to share your experience.
                </p>
              )}
            </div>
            <ProductReviewForm productId={p.id} hasReviews={p.reviews.length > 0} />
          </div>

          {p.reviews.length > 0 && (
            <ul className="mt-8 space-y-6">
              {p.reviews.map((review) => (
                <li key={review.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-0.5" aria-label={review.rating + ' out of 5 stars'}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          className={'h-4 w-4 ' + (value <= review.rating
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground/40')}
                        />
                      ))}
                    </div>
                    {review.title && <h3 className="font-semibold text-foreground">{review.title}</h3>}
                  </div>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{review.review_text}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    — {review.customer_name}, {new Date(review.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <ZipReferenceFooter settings={p} />
    </div>
  );
}