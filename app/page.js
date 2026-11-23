import PinkBoxHome from '../components/PinkBoxHome';
import { createAdminClient } from '@/lib/supabase-admin';
import { absoluteUrl, safeJsonLd, sanitizePublicProductText } from '@/lib/seo';
import { isContentLiveForAvailableCategory } from '@/lib/available-content';
import { filterAvailableProducts } from '@/lib/product-availability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStoreData() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('*')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (!settings) return null;

  const companyId = settings.company_id;
  const now = new Date().toISOString();

  const [products, categories, banners, sections, menu, theme, footer, blog, images, mappings, reviews, variants, discounts] = await Promise.all([
    db.from('website_products')
      .select('id,sku,title,slug,short_description,brand,price,compare_at_price,gst_percent,stock_quantity,low_stock_threshold,track_inventory,allow_backorder,featured,is_active,cod_override,online_payment_override,shipping_charge_override')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .or('sku.like.MDH-%,sku.like.BAG-%')
      .gt('price', 0)
      .order('created_at', { ascending: false }),
    db.from('website_categories')
      .select('id,name,slug,parent_id,image_url,sort_order')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_banners')
      .select('id,title,subtitle,image_url,mobile_image_url,button_text,button_url,sort_order,starts_at,ends_at,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_homepage_sections')
      .select('id,section_type,title,settings,sort_order,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_menus')
      .select('location,name,items')
      .eq('company_id', companyId)
      .eq('location', 'header')
      .maybeSingle(),
    db.from('website_theme_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle(),
    db.from('website_footer_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle(),
    db.from('website_blog_posts')
      .select('id,title,slug,excerpt,content,cover_image_url,published_at')
      .eq('company_id', companyId)
      .eq('is_published', true)
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .limit(20),
    db.from('website_product_images')
      .select('id,product_id,image_url,alt_text,sort_order,is_primary')
      .eq('company_id', companyId)
      .order('sort_order'),
    db.from('website_product_categories')
      .select('product_id,category_id')
      .eq('company_id', companyId),
    db.from('website_product_reviews')
      .select('id,product_id,customer_name,rating,title,review_text,is_featured,created_at')
      .eq('company_id', companyId)
      .eq('is_approved', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('website_product_variants')
      .select('id,product_id,title,sku,price,compare_at_price,stock_quantity,image_url,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),
    db.from('website_discounts')
      .select('id,name,code,discount_type,value,minimum_order_amount,starts_at,ends_at,usage_limit,usage_count,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),
  ]);

  const results = { products, categories, banners, sections, menu, theme, footer, blog, images, mappings, reviews, variants, discounts };
  const failed = Object.values(results).find((result) => result?.error);
  if (failed) throw new Error(failed.error.message);

  const activeBanners = (banners.data || []).filter(
    (banner) => (!banner.starts_at || banner.starts_at <= now) && (!banner.ends_at || banner.ends_at >= now)
  );

  const imageMap = {};
  const imageListMap = {};
  for (const image of images.data || []) {
    if (!imageListMap[image.product_id]) imageListMap[image.product_id] = [];
    imageListMap[image.product_id].push(image);
    if (!imageMap[image.product_id] || image.is_primary) imageMap[image.product_id] = image.image_url;
  }

  const catMap = {};
  for (const mapping of mappings.data || []) {
    if (!catMap[mapping.product_id]) catMap[mapping.product_id] = mapping.category_id;
  }

  const variantsByProductId = new Map();
  for (const variant of variants.data || []) {
    const items = variantsByProductId.get(variant.product_id) || [];
    items.push(variant);
    variantsByProductId.set(variant.product_id, items);
  }

  const productData = (products.data || []).map((product) => ({
    ...product,
    short_description: sanitizePublicProductText(product.short_description),
    image_url: imageMap[product.id] || (product.sku?.startsWith('MDH-') ? `/catalog-products/${product.sku.toLowerCase()}.webp` : null),
    images: imageListMap[product.id] || [],
    category_id: catMap[product.id] || null,
    variants: variantsByProductId.get(product.id) || [],
  }));

  // Public listings include only active, priced products that checkout can currently sell.
  // Stock remains managed separately through the Inventory ledger in Admin.
  const saleableProducts = filterAvailableProducts(productData, variants.data || [], { includeOutOfStock: true });

  const saleableProductIds = new Set(saleableProducts.map((product) => product.id));
  const categoryProductCounts = {};
  for (const mapping of mappings.data || []) {
    if (!saleableProductIds.has(mapping.product_id)) continue;
    categoryProductCounts[mapping.category_id] = (categoryProductCounts[mapping.category_id] || 0) + 1;
  }

  const visibleCategories = (categories.data || []).filter(
    (category) => Number(categoryProductCounts[category.id] || 0) > 0
  );
  const contentContext = {
    categories: categories.data || [],
    products: saleableProducts,
    mappings: mappings.data || [],
  };
  const liveBlogPosts = (blog.data || []).filter((post) =>
    isContentLiveForAvailableCategory(post, contentContext, { keepUncategorized: false })
  );

  return {
    settings: {
      ...settings,
      meta_title: settings.meta_title || null,
      meta_description: settings.meta_description || null,
    },
    products: saleableProducts,
    categories: visibleCategories,
    availableCategorySlugs: visibleCategories.map((category) => category.slug),
    banners: activeBanners,
    sections: sections.data || [],
    menu: menu.data || null,
    theme: theme.data || null,
    footer: footer.data || null,
    blog: liveBlogPosts,
    reviews: reviews.data || [],
    coupons: (discounts.data || []).filter((coupon) => (!coupon.starts_at || coupon.starts_at <= now) && (!coupon.ends_at || coupon.ends_at >= now) && (coupon.usage_limit == null || Number(coupon.usage_count || 0) < Number(coupon.usage_limit))).map((coupon) => ({ id: coupon.id, code: coupon.code, description: coupon.name || null, discount_type: coupon.discount_type, discount_value: coupon.value, min_order_amount: coupon.minimum_order_amount || 0 })),
  };
}

async function getStoreMeta() {
  const db = createAdminClient();
  const { data } = await db
    .from('website_settings')
    .select('website_name,meta_title,meta_description,logo_url')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();
  return data;
}

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
  const description = s?.meta_description || (categoryLabel
    ? `Explore ${categoryLabel.toLowerCase()} currently available at ${name}. Review the details on each product page before ordering.`
    : `Explore current products and collections at ${name}.`);
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