import PinkBoxHome from '../components/PinkBoxHome';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { filterAvailableProducts } from '@/lib/product-availability';
import { getWebsiteProductOrderCounts, sortProductsByWebsiteOrders } from '@/lib/website-product-sales';
import { absoluteUrl, limitMetaText, safeJsonLd, sanitizePublicProductText } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getStoreData = cache(unstable_cache(async function getStoreData() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id,website_name,meta_title,meta_description,logo_url,phone,email,address,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (!settings) return null;

  const companyId = settings.company_id;
  const now = new Date().toISOString();

  // The homepage only renders collection tiles, hero banners and coupon offers.
  // Fetch only the IDs needed to decide which collections have products; avoid
  // loading full product descriptions, variants, image rows, blog bodies and reviews.
  const [products, featuredProductRows, homepageReviews, categories, banners, mappings, discounts, homepageSections, orderCounts] = await Promise.all([
    db.from('website_products')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .or('sku.like.MDH-%,sku.like.BAG-%')
      .gt('price', 0),
    db.from('website_products')
      .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,featured,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .or('sku.like.MDH-%,sku.like.BAG-%')
      .gt('price', 0)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('website_product_reviews')
      .select('id,product_id,customer_name,rating,title,review_text,created_at,is_verified_purchase')
      .eq('company_id', companyId)
      .eq('is_approved', true)
      .eq('is_verified_purchase', true)
      .order('created_at', { ascending: false })
      .limit(6),
    db.from('website_categories')
      .select('id,name,slug,image_url,sort_order')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_banners')
      .select('id,title,subtitle,image_url,mobile_image_url,button_text,button_url,sort_order,starts_at,ends_at,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_product_categories')
      .select('product_id,category_id')
      .eq('company_id', companyId),
    db.from('website_discounts')
      .select('id,name,code,discount_type,value,minimum_order_amount,starts_at,ends_at,usage_limit,usage_count,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),
    db.from('website_homepage_sections')
      .select('id,section_type,title,settings,sort_order,is_active')
      .eq('company_id', companyId)
      .order('sort_order'),
    getWebsiteProductOrderCounts(companyId),
  ]);

  const results = { products, featuredProductRows, homepageReviews, categories, banners, mappings, discounts, homepageSections };
  const failed = Object.values(results).find((result) => result?.error);
  if (failed) throw new Error(failed.error.message);

  const activeBanners = (banners.data || []).filter(
    (banner) => (!banner.starts_at || banner.starts_at <= now) && (!banner.ends_at || banner.ends_at >= now)
  );

  const featuredIds = (featuredProductRows.data || []).map((product) => product.id);
  const [featuredVariantsResult, featuredImagesResult] = featuredIds.length
    ? await Promise.all([
        db.from('website_product_variants').select('id,product_id,title,sku,price,compare_at_price,stock_quantity,image_url,is_active').eq('company_id', companyId).in('product_id', featuredIds).eq('is_active', true),
        db.from('website_product_images').select('product_id,image_url,alt_text,is_primary,sort_order').eq('company_id', companyId).in('product_id', featuredIds).order('sort_order'),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (featuredVariantsResult.error || featuredImagesResult.error) throw new Error(featuredVariantsResult.error?.message || featuredImagesResult.error?.message);
  const sellableProductIds = new Set(filterAvailableProducts(featuredProductRows.data || [], featuredVariantsResult.data || []).map((product) => product.id));
  const categoryProductCounts = {};
  const productCategoryIds = new Map();
  for (const mapping of mappings.data || []) {
    if (!sellableProductIds.has(mapping.product_id)) continue;
    categoryProductCounts[mapping.category_id] = (categoryProductCounts[mapping.category_id] || 0) + 1;
    const categoryIds = productCategoryIds.get(mapping.product_id) || [];
    categoryIds.push(mapping.category_id);
    productCategoryIds.set(mapping.product_id, categoryIds);
  }
  const visibleCategories = (categories.data || []).filter(
    (category) => Number(categoryProductCounts[category.id] || 0) > 0
  );
  const rankedFeaturedRows = sortProductsByWebsiteOrders(featuredProductRows.data || [], orderCounts, sellableProductIds);
  const variantsByProduct = new Map();
  for (const variant of featuredVariantsResult.data || []) {
    const rows = variantsByProduct.get(variant.product_id) || [];
    rows.push(variant);
    variantsByProduct.set(variant.product_id, rows);
  }
  const imagesByProduct = new Map();
  for (const image of featuredImagesResult.data || []) {
    const rows = imagesByProduct.get(image.product_id) || [];
    rows.push(image);
    imagesByProduct.set(image.product_id, rows);
  }
  const toHomepageProduct = (product) => {
    const productImages = (imagesByProduct.get(product.id) || []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const fallback = `/catalog-products/${String(product.sku || '').toLowerCase()}.webp`;
    return {
      ...product,
      website_order_count: Number(orderCounts[product.id] || 0),
      short_description: sanitizePublicProductText(product.short_description),
      description: sanitizePublicProductText(product.description),
      variants: variantsByProduct.get(product.id) || [],
      images: productImages.length ? productImages : [{ image_url: fallback, alt_text: product.title }],
      image_url: productImages[0]?.image_url || fallback,
    };
  };
  const homepageProductsByCategory = Object.fromEntries(
    visibleCategories.map((category) => [
      category.slug,
      rankedFeaturedRows
        .filter((product) => sellableProductIds.has(product.id) && (productCategoryIds.get(product.id) || []).includes(category.id))
        .slice(0, 4)
        .map(toHomepageProduct),
    ])
  );
  const productTitleById = new Map((featuredProductRows.data || []).map((product) => [product.id, product.title]));
  const verifiedHomepageReviews = (homepageReviews.data || []).map((review) => ({
    ...review,
    product_title: productTitleById.get(review.product_id) || null,
  })).filter((review) => review.product_title);

  return {
    settings,
    categories: visibleCategories,
    productsByCategory: homepageProductsByCategory,
    reviews: verifiedHomepageReviews,
    banners: activeBanners,
    homepageSections: homepageSections.data || [],
    coupons: (discounts.data || [])
      .filter((coupon) =>
        (!coupon.starts_at || coupon.starts_at <= now) &&
        (!coupon.ends_at || coupon.ends_at >= now) &&
        (coupon.usage_limit == null || Number(coupon.usage_count || 0) < Number(coupon.usage_limit))
      )
      .map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        description: coupon.name || null,
        discount_type: coupon.discount_type,
        discount_value: coupon.value,
        min_order_amount: coupon.minimum_order_amount || 0,
      })),
  };
}, ['pinkbox-home-store-data'], { revalidate: 60, tags: ['pinkbox-home-store-data'] }));
export async function generateMetadata() {
  const data = await getStoreData();
  const s = data?.settings || null;
  const name = s?.website_name || 'PinkBox';
  const categoryNames = (data?.categories || []).map((category) => {
    if (category.slug === 'sanitary-pads') return 'Sanitary Pads';
    if (category.slug === 'baby-diapers') return 'Baby Diapers';
    return category.name;
  }).filter(Boolean);
  const categoryLabel = categoryNames.join(' & ');
  const title = s?.meta_title || (categoryLabel ? `${categoryLabel} | ${name}` : `${name} | Online Store`);
  const description = limitMetaText(s?.meta_description || (categoryLabel
    ? `Explore ${categoryLabel.toLowerCase()} currently available at ${name}. Review the details on each product page before ordering.`
    : `Explore current products and collections at ${name}.`), 160);
  return {
    title,
    description,
    openGraph: { title, description, url: absoluteUrl('/'), images: s?.logo_url ? [s.logo_url] : undefined, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: absoluteUrl('/') },
  };
}

export default async function HomePage(){
  const data = await getStoreData();
  const s = data?.settings || null;
  const name = s?.website_name || 'PinkBox';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name,
    description: data?.categories?.length ? `Explore ${data.categories.map((category) => category.name).join(', ')} currently available at ${name}.` : undefined,
    logo: s?.logo_url || undefined,
    url: siteUrl,
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      '@id': absoluteUrl('/pages/refund-policy#return-policy'),
      applicableCountry: 'IN',
      merchantReturnLink: absoluteUrl('/pages/refund-policy')
    },
    hasShippingService: {
      '@type': 'ShippingService',
      '@id': absoluteUrl('/#standard-shipping'),
      name: 'Standard shipping across India',
      description: 'Standard shipping is ₹49 on orders below ₹499. Orders of ₹499 or more qualify for free standard shipping. Orders are typically processed within 1–2 business days and standard delivery usually takes 3–7 business days after dispatch.',
      fulfillmentType: 'https://schema.org/FulfillmentTypeDelivery',
      handlingTime: {
        '@type': 'ServicePeriod',
        duration: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' }
      },
      shippingConditions: [
        {
          '@type': 'ShippingConditions',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
          orderValue: { '@type': 'MonetaryAmount', minValue: 0, maxValue: 498.99, currency: 'INR' },
          shippingRate: { '@type': 'MonetaryAmount', value: 49, currency: 'INR' },
          transitTime: {
            '@type': 'ServicePeriod',
            duration: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' }
          }
        },
        {
          '@type': 'ShippingConditions',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
          orderValue: { '@type': 'MonetaryAmount', minValue: 499, currency: 'INR' },
          shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'INR' },
          transitTime: {
            '@type': 'ServicePeriod',
            duration: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' }
          }
        }
      ]
    }
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app',
    description: data?.categories?.length ? `Explore ${data.categories.map((category) => category.name).join(', ')} currently available at ${name}.` : undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />
      <PinkBoxHome initialData={data} />
    </>
  );
}