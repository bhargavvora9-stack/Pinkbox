import { createAdminClient } from '@/lib/supabase-admin';
import { isContentLiveForAvailableCategory } from '@/lib/available-content';
import { filterAvailableProducts } from '@/lib/product-availability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app').replace(/\/$/, '');
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  // Only emit lastModified when it comes from a real content timestamp.
  // Do not use the current time as a synthetic freshness signal.
  const urls = [
    { url: base },
    { url: `${base}/products` },
    { url: `${base}/blog` },
  ];

  if (!settings) return urls;

  const [posts, products, categories, pages, mappings] = await Promise.all([
    db
      .from('website_blog_posts')
      .select('slug,title,excerpt,content,seo_keywords,updated_at,published_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    db
      .from('website_products')
      .select('id,slug,is_active,updated_at,price,stock_quantity,track_inventory,allow_backorder')
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

  const productIds = (products.data || []).map((product) => product.id);
  const { data: variants, error: variantsError } = productIds.length
    ? await db
        .from('website_product_variants')
        .select('product_id,stock_quantity,is_active')
        .eq('company_id', settings.company_id)
        .in('product_id', productIds)
        .eq('is_active', true)
    : { data: [], error: null };

  // If variant inventory cannot be read, do not guess which collections are available.
  if (variantsError) throw new Error(variantsError.message);

  const availableProducts = filterAvailableProducts(products.data || [], variants || []);
  const contentContext = {
    categories: categories.data || [],
    products: availableProducts,
    mappings: mappings.data || [],
  };

  for (const p of posts.data || []) {
    if (p.slug && isContentLiveForAvailableCategory(p, contentContext, { keepUncategorized: false })) {
      urls.push({
        url: `${base}/blog/${encodeURIComponent(p.slug)}`,
        ...(p.updated_at || p.published_at
          ? { lastModified: p.updated_at || p.published_at }
          : {}),
      });
    }
  }

  // Keep active product detail URLs in the sitemap. They remain valid pages and
  // expose their current InStock / OutOfStock offer state in Product structured data.
  for (const p of products.data || []) {
    if (p.slug) {
      urls.push({
        url: `${base}/products/${encodeURIComponent(p.slug)}`,
        ...(p.updated_at ? { lastModified: p.updated_at } : {}),
      });
    }
  }

  const availableProductIds = new Set(availableProducts.map((product) => product.id));
  const categoryIdsWithProducts = new Set(
    (mappings.data || [])
      .filter((mapping) => availableProductIds.has(mapping.product_id))
      .map((mapping) => mapping.category_id)
  );

  // Collection pages return 404 when no purchasable product remains, so only
  // include categories that currently have at least one purchasable product.
  for (const c of categories.data || []) {
    if (c.slug && categoryIdsWithProducts.has(c.id)) {
      urls.push({
        url: `${base}/collections/${encodeURIComponent(c.slug)}`,
        ...(c.updated_at ? { lastModified: c.updated_at } : {}),
      });
    }
  }

  for (const p of pages.data || []) {
    if (p.slug && isContentLiveForAvailableCategory(p, contentContext, { keepUncategorized: true })) {
      urls.push({
        url: `${base}/pages/${encodeURIComponent(p.slug)}`,
        ...(p.updated_at ? { lastModified: p.updated_at } : {}),
      });
    }
  }

  return urls;
}

// SEO: sitemap emits lastModified only from real content timestamps.
