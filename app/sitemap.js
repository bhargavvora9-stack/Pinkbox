import { createAdminClient } from '@/lib/supabase-admin';
import { isContentLiveForAvailableCategory } from '@/lib/available-content';
import { filterAvailableProducts } from '@/lib/product-availability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    { url: `${base}/products` },
    { url: `${base}/blog` },
  ];
  if (settingsError || !settings) return urls;

  const [posts, productsResult, categories, pages, mappings] = await Promise.all([
    db
      .from('website_blog_posts')
      .select('slug,title,excerpt,content,seo_keywords,updated_at,published_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    db
      .from('website_products')
      .select('id,slug,is_active,updated_at,price,track_inventory,allow_backorder,stock_quantity')
      .eq('company_id', settings.company_id)
      .eq('is_active', true)
      .gt('price', 0),
    db
      .from('website_categories')
      .select('id,slug,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
    db
      .from('website_pages')
      .select('slug,title,content,seo_title,seo_description,seo_keywords,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true),
    db
      .from('website_product_categories')
      .select('category_id,product_id')
      .eq('company_id', settings.company_id),
  ]);

  if (productsResult.error || categories.error || mappings.error) return urls;
  const productIds = (productsResult.data || []).map((product) => product.id);
  const { data: variants, error: variantsError } = productIds.length
    ? await db.from('website_product_variants')
      .select('product_id,stock_quantity,is_active')
      .eq('company_id', settings.company_id)
      .in('product_id', productIds)
      .eq('is_active', true)
    : { data: [], error: null };
  if (variantsError) return urls;

  const saleableProducts = filterAvailableProducts(productsResult.data || [], variants || []);
  const contentContext = {
    categories: categories.data || [],
    products: saleableProducts,
    mappings: mappings.data || [],
  };

  for (const post of posts.data || []) {
    if (post.slug && isContentLiveForAvailableCategory(post, contentContext, { keepUncategorized: false })) {
      urls.push({
        url: `${base}/blog/${encodeURIComponent(post.slug)}`,
        ...(post.updated_at || post.published_at ? { lastModified: post.updated_at || post.published_at } : {}),
      });
    }
  }

  // Keep active product detail URLs discoverable even when inventory is temporarily unavailable.
  // Their Product schema still reports the current InStock / OutOfStock offer state.
  for (const product of productsResult.data || []) {
    if (product.slug) {
      urls.push({
        url: `${base}/products/${encodeURIComponent(product.slug)}`,
        ...(product.updated_at ? { lastModified: product.updated_at } : {}),
      });
    }
  }

  const saleableProductIds = new Set(saleableProducts.map((product) => product.id));
  const categoryIdsWithProducts = new Set(
    (mappings.data || [])
      .filter((mapping) => saleableProductIds.has(mapping.product_id))
      .map((mapping) => mapping.category_id)
  );

  for (const category of categories.data || []) {
    if (category.slug && categoryIdsWithProducts.has(category.id)) {
      urls.push({
        url: `${base}/collections/${encodeURIComponent(category.slug)}`,
        ...(category.updated_at ? { lastModified: category.updated_at } : {}),
      });
    }
  }

  for (const page of pages.data || []) {
    if (page.slug && isContentLiveForAvailableCategory(page, contentContext, { keepUncategorized: true })) {
      urls.push({
        url: `${base}/pages/${encodeURIComponent(page.slug)}`,
        ...(page.updated_at ? { lastModified: page.updated_at } : {}),
      });
    }
  }

  return urls;
}
