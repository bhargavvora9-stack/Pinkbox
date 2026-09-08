import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function robots() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pinkbox-gv7q.vercel.app').replace(/\/$/, '');
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  let robotsTxt = '';
  if (settings) {
    const { data: seo } = await db.from('website_seo_settings').select('robots_txt,sitemap_enabled').eq('company_id', settings.company_id).maybeSingle();
    robotsTxt = seo?.robots_txt || '';
    if (seo?.sitemap_enabled === false) return { rules: [{ userAgent: '*', disallow: ['/admin', '/api'] }] };
  }
  if (robotsTxt.trim()) return new Response(robotsTxt, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  return { rules: [{ userAgent: '*', disallow: ['/admin', '/api'] }], sitemap: `${base}/sitemap.xml` };
}
