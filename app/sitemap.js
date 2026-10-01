import { createAdminClient } from '@/lib/supabase-admin';

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
    { url: `${base}/blog` },
  ];

  if (!settings) return urls;

  const [posts, products, categories, pages] = await Promise.all([
    db
      .from('website_blog_posts')
      .select('slug,updated_at,published_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    db
      .from('website_products')
      .select('slug,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
    db
      .from('website_categories')
      .select('slug,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
    db
      .from('website_pages')
      .select('slug,updated_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true),
  ]);

  for (const p of posts.data || []) {
    if (p.slug) {
      urls.push({
        url: `${base}/blog/${encodeURIComponent(p.slug)}`,
        ...(p.updated_at || p.published_at
          ? { lastModified: p.updated_at || p.published_at }
          : {}),
      });
    }
  }

  for (const p of products.data || []) {
    if (p.slug) {
      urls.push({
        url: `${base}/products/${encodeURIComponent(p.slug)}`,
        ...(p.updated_at ? { lastModified: p.updated_at } : {}),
      });
    }
  }

  for (const c of categories.data || []) {
    if (c.slug) {
      urls.push({
        url: `${base}/collections/${encodeURIComponent(c.slug)}`,
        ...(c.updated_at ? { lastModified: c.updated_at } : {}),
      });
    }
  }

  for (const p of pages.data || []) {
    if (p.slug) {
      urls.push({
        url: `${base}/pages/${encodeURIComponent(p.slug)}`,
        ...(p.updated_at ? { lastModified: p.updated_at } : {}),
      });
    }
  }

  return urls;
}

// SEO: sitemap emits lastModified only from real content timestamps.
// Deployment trigger: keep sitemap freshness behavior active in production.
