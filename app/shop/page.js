import { createAdminClient } from '@/lib/supabase-admin';
import { filterAvailableProducts } from '@/lib/product-availability';
import { getWebsiteProductOrderCounts, sortProductsByWebsiteOrders } from '@/lib/website-product-sales';
import { absoluteUrl, limitMetaText, safeJsonLd, sanitizePublicProductText } from '@/lib/seo';
import PinkBoxShopListing from '@/components/PinkBoxShopListing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SHOP_TITLE = 'Shop Sanitary Pads, Baby Diapers & Bags | PinkBox';
const SHOP_DESCRIPTION = 'Shop sanitary pads, 7 Soft baby diapers and bags at PinkBox. Explore tote bags, handbags and office bag styles together in one collection.';

export const metadata = {
  title: SHOP_TITLE,
  description: limitMetaText(SHOP_DESCRIPTION),
  alternates: { canonical: '/shop' },
  openGraph: { title: SHOP_TITLE, description: limitMetaText(SHOP_DESCRIPTION), url: '/shop', type: 'website' },
  twitter: { card: 'summary_large_image', title: SHOP_TITLE, description: limitMetaText(SHOP_DESCRIPTION) },
};

async function getShopData() {
  const db = createAdminClient();
  const { data: settings, error: settingsError } = await db
    .from('website_settings')
    .select('company_id,website_name,logo_url,phone,whatsapp_number,email,address,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold,default_shipping_charge,cod_enabled,online_payment_enabled')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (settingsError || !settings) return { settings: settings || {}, products: [] };

  const [productsResult, variantsResult, orderCounts] = await Promise.all([
    db.from('website_products')
      .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,featured,is_active')
      .eq('company_id', settings.company_id)
      .eq('is_active', true)
      .or('sku.like.MDH-%,sku.like.BAG-%')
      .gt('price', 0)
      .order('created_at', { ascending: false }),
    db.from('website_product_variants')
      .select('id,product_id,title,sku,price,compare_at_price,stock_quantity,image_url,is_active')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
    getWebsiteProductOrderCounts(settings.company_id),
  ]);

  // Fail closed when inventory could not be checked; never advertise an item as available
  // if the source of truth for stock is unavailable.
  if (productsResult.error || variantsResult.error || !productsResult.data?.length) {
    return { settings, products: [] };
  }

  const sellableProductIds = new Set(filterAvailableProducts(productsResult.data, variantsResult.data || []).map((product) => product.id));
  const visibleProducts = sortProductsByWebsiteOrders(
    filterAvailableProducts(productsResult.data, variantsResult.data || [], { includeOutOfStock: true }),
    orderCounts,
    sellableProductIds,
  );
  if (!visibleProducts.length) return { settings, products: [] };

  const ids = visibleProducts.map((product) => product.id);
  const [imagesResult, reviewsResult] = await Promise.all([
    db.from('website_product_images')
      .select('product_id,image_url,alt_text,sort_order,is_primary')
      .eq('company_id', settings.company_id)
      .in('product_id', ids)
      .order('sort_order'),
    db.from('website_product_reviews')
      .select('product_id,rating')
      .eq('company_id', settings.company_id)
      .eq('is_approved', true)
      .in('product_id', ids),
  ]);

  if (imagesResult.error) return { settings, products: [] };

  const reviewStats = new Map();
  if (!reviewsResult.error) {
    for (const review of reviewsResult.data || []) {
      const current = reviewStats.get(review.product_id) || { total: 0, count: 0 };
      current.total += Number(review.rating || 0);
      current.count += 1;
      reviewStats.set(review.product_id, current);
    }
  }

  const imageMap = new Map();
  const images = imagesResult.data || [];
  for (const image of images || []) {
    const current = imageMap.get(image.product_id) || [];
    current.push(image);
    imageMap.set(image.product_id, current);
  }

  const variantsByProductId = new Map();
  for (const variant of variantsResult.data || []) {
    const items = variantsByProductId.get(variant.product_id) || [];
    items.push(variant);
    variantsByProductId.set(variant.product_id, items);
  }

  const products = visibleProducts.map((product) => {
    const productImages = (imageMap.get(product.id) || []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order || 0) - Number(b.sort_order || 0)
    );
    const fallback = { image_url: `/catalog-products/${product.sku.toLowerCase()}.webp`, alt_text: product.title, is_primary: true };
    const reviewStat = reviewStats.get(product.id);
    return {
      ...product,
      review_average: reviewStat?.count ? Number((reviewStat.total / reviewStat.count).toFixed(1)) : 0,
      review_count: reviewStat?.count || 0,
      website_order_count: Number(orderCounts[product.id] || 0),
      short_description: sanitizePublicProductText(product.short_description),
      description: sanitizePublicProductText(product.description),
      variants: variantsByProductId.get(product.id) || [],
      images: productImages.length ? productImages : [fallback],
      image_url: productImages[0]?.image_url || fallback.image_url,
    };
  });

  return { settings, products };
}

export default async function ShopPage() {
  const data = await getShopData();
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: SHOP_TITLE,
    description: limitMetaText(SHOP_DESCRIPTION),
    url: absoluteUrl('/shop'),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: data.products.length,
      itemListElement: data.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.title,
        url: absoluteUrl(`/products/${encodeURIComponent(product.slug)}`),
      })),
    },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: absoluteUrl('/shop') },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
      <PinkBoxShopListing settings={data.settings} products={data.products} />
    </>
  );
}
