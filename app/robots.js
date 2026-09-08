import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function robots() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pinkbox-gv7q.vercel.app').replace(/\/$/, '');
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  if (!settings) return { rules: [{ userAgent: '*', disallow: ['/admin', '/api'] }] };
  const { data: seo } = await db.from('website_seo_settings').select('robots_txt,sitemap_enabled').eq('company_id', settings.company_id).maybeSingle();
  if (seo?.robots_txt?.trim()) {
    const disallow = seo.robots_txt.split(/\r?\n/).filter(line => /^disallow\s*:/i.test(line)).map(line => line.split(':').slice(1).join(':').trim()).filter(Boolean);
    const allow = seo.robots_txt.split(/\r?\n/).filter(line => /^allow\s*:/i.test(line)).map(line => line.split(':').slice(1).join(':').trim()).filter(Boolean);
    return { rules: [{ userAgent: '*', ...(allow.length ? { allow } : {}), ...(disallow.length ? { disallow } : {}) }], ...(seo.sitemap_enabled === false ? {} : { sitemap: `${base}/sitemap.xml` }) };
  }
  return { rules: [{ userAgent: '*', disallow: ['/admin', '/api'] }], ...(seo?.sitemap_enabled === false ? {} : { sitemap: `${base}/sitemap.xml` }) };
}
