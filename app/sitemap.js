import { createAdminClient } from '@/lib/supabase-admin';
import { isContentLiveForAvailableCategory } from '@/lib/available-content';
import { filterAvailableProducts } from '@/lib/product-availability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeImageUrl(value, base) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;

  try {
    const imageUrl = new URL(raw, base);
    if (!['http:', 'https:'].includes(imageUrl.protocol)) return null;

    // Use the same-origin Next.js optimized image URL used by product image elements.
    // This keeps image sitemap URLs on the verified storefront host.
    if (
      imageUrl.hostname.endsWith('.supabase.co') &&
      imageUrl.pathname.startsWith('/storage/v1/object/public/')
    ) {
      const optimizedUrl = new URL('/_next/image', base);
      optimizedUrl.searchParams.set('url', imageUrl.toString());
      optimizedUrl.searchParams.set('w', '1200');
      optimizedUrl.searchParams.set('q', '75');
      return optimizedUrl.toString();
    }

    return imageUrl.toString();
  } catch {
    return null;
  }
}

function uniqueImageUrls(values, base) {
  return [...new Set((values || [])
    .map((value) => normalizeImageUrl(value, base))
    .filter(Boolean))]
    .slice(0, 1000);
}

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app').replace(/\/$/, '');
  const db = createAdminClient();
  const { data: settings, error: settingsError } = await db
    .from('website_settings')
    .select('company_id')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  // Keep core URLs available even if the store database is temporarily unavailable.
  const urls = [
    { url: base },
    { url: `${base}/shop` },
    { url: `${base}/blog` },
  ];
  if (settingsError || !settings) return urls;

  const now = new Date();
  const nowIso = now.toISOString();
  const [posts, productsResult, categories, pages, mappings, banners] = await Promise.all([
    db
      .from('website_blog_posts')
      .select('slug,title,excerpt,content,cover_image_url,seo_keywords,updated_at,published_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true)
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false }),
    db
      .from('website_products')
      .select('id,sku,slug,is_active,updated_at,price,track_inventory,allow_backorder,stock_quantity')
      .eq('company_id', settings.company_id)
      .eq('is_active', true)
      .gt('price', 0),
    db
      .from('website_categories')
      .select('id,slug,image_url,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
    db
      .from('website_pages')
      .select('slug,title,content,seo_title,seo_description,seo_keywords,image_url,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true),
    db
      .from('website_product_categories')
      .select('category_id,product_id')
      .eq('company_id', settings.company_id),
    db
      .from('website_banners')
      .select('image_url,mobile_image_url,starts_at,ends_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
  ]);

  if (productsResult.error || categories.error || mappings.error) return urls;
  const productIds = (productsResult.data || []).map((product) => product.id);
  const [{ data: variants, error: variantsError }, { data: productImageRows }] = await Promise.all([
    productIds.length
      ? db.from('website_product_variants')
        .select('product_id,stock_quantity,is_active')
        .eq('company_id', settings.company_id)
        .in('product_id', productIds)
        .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? db.from('website_product_images')
        .select('product_id,image_url,is_primary,sort_order')
        .eq('company_id', settings.company_id)
        .in('product_id', productIds)
        .order('sort_order')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (variantsError) return urls;

  const productImagesById = new Map();
  for (const image of productImageRows || []) {
    if (!image.product_id || !image.image_url) continue;
    const current = productImagesById.get(image.product_id) || [];
    current.push({
      imageUrl: image.image_url,
      isPrimary: Boolean(image.is_primary),
      sortOrder: Number(image.sort_order || 0),
    });
    productImagesById.set(image.product_id, current);
  }
  for (const [productId, images] of productImagesById) {
    productImagesById.set(productId, uniqueImageUrls(
      images
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
        .map((image) => image.imageUrl),
      base,
    ));
  }

  const saleableProducts = filterAvailableProducts(productsResult.data || [], variants || [], { includeOutOfStock: true });
  const contentContext = {
    categories: categories.data || [],
    products: saleableProducts,
    mappings: mappings.data || [],
  };

  const activeBanners = (banners.data || []).filter(
    (banner) => (!banner.starts_at || banner.starts_at <= nowIso) &&
      (!banner.ends_at || banner.ends_at >= nowIso),
  );
  const homepageImages = uniqueImageUrls([
    ...activeBanners.flatMap((banner) => [banner.image_url, banner.mobile_image_url]),
    ...(categories.data || []).map((category) => category.image_url),
  ], base);
  if (homepageImages.length) urls[0] = { ...urls[0], images: homepageImages };

  for (const post of posts.data || []) {
    if (post.slug && isContentLiveForAvailableCategory(post, contentContext, { keepUncategorized: false })) {
      const images = uniqueImageUrls([post.cover_image_url], base);
      urls.push({
        url: `${base}/blog/${encodeURIComponent(post.slug)}`,
        ...(images.length ? { images } : {}),
        ...(post.updated_at || post.published_at ? { lastModified: post.updated_at || post.published_at } : {}),
      });
    }
  }

  // Keep active product detail URLs discoverable even when inventory is temporarily unavailable.
  // Their Product schema still reports the current InStock / OutOfStock offer state.
  for (const product of productsResult.data || []) {
    if (product.slug) {
      const images = productImagesById.get(product.id) || [];
      urls.push({
        url: `${base}/products/${encodeURIComponent(product.slug)}`,
        ...(images.length ? { images } : {}),
        ...(product.updated_at ? { lastModified: product.updated_at } : {}),
      });
    }
  }

  const saleableProductIds = new Set(saleableProducts.map((product) => product.id));
  const categoryProductIds = new Map();
  for (const mapping of mappings.data || []) {
    if (!saleableProductIds.has(mapping.product_id)) continue;
    const current = categoryProductIds.get(mapping.category_id) || [];
    current.push(mapping.product_id);
    categoryProductIds.set(mapping.category_id, current);
  }

  for (const category of categories.data || []) {
    const productIdsInCategory = categoryProductIds.get(category.id) || [];
    if (!category.slug || !productIdsInCategory.length) continue;
    const categoryImages = uniqueImageUrls([
      category.image_url,
      ...productIdsInCategory.flatMap((productId) => productImagesById.get(productId) || []),
    ], base);
    urls.push({
      url: `${base}/collections/${encodeURIComponent(category.slug)}`,
      ...(categoryImages.length ? { images: categoryImages } : {}),
      ...(category.updated_at ? { lastModified: category.updated_at } : {}),
    });
  }

  for (const page of pages.data || []) {
    if (page.slug && isContentLiveForAvailableCategory(page, contentContext, { keepUncategorized: true })) {
      const images = uniqueImageUrls([page.image_url], base);
      urls.push({
        url: `${base}/pages/${encodeURIComponent(page.slug)}`,
        ...(images.length ? { images } : {}),
        ...(page.updated_at ? { lastModified: page.updated_at } : {}),
      });
    }
  }

  return urls;
}
