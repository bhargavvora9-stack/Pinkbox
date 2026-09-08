import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pinkbox-gv7q.vercel.app').replace(/\/$/, '');
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  const urls = [{ url: base, lastModified: new Date() }];
  if (!settings) return urls;

  const [{ data: posts }, { data: pages }, { data: products }] = await Promise.all([
    db.from('website_blog_posts').select('slug,updated_at,published_at').eq('company_id', settings.company_id).eq('is_published', true).lte('published_at', new Date().toISOString()),
    db.from('website_pages').select('slug,updated_at').eq('company_id', settings.company_id).eq('is_published', true),
    db.from('website_products').select('slug,updated_at').eq('company_id', settings.company_id).eq('is_active', true)
  ]);
  for (const p of posts || []) if (p.slug) urls.push({ url: `${base}/blog/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at || p.published_at || new Date() });
  for (const p of pages || []) if (p.slug) urls.push({ url: `${base}/page/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at || new Date() });
  for (const p of products || []) if (p.slug) urls.push({ url: `${base}/products/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at || new Date() });
  urls.push({ url: `${base}/blog`, lastModified: new Date() });
  return urls;
}
