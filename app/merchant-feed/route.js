import { createAdminClient } from '@/lib/supabase-admin';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function xml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id,website_name')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (!settings) return new Response('Store not configured', { status: 503 });

  const { data: products } = await db
    .from('website_products')
    .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,allow_backorder,is_active')
    .eq('company_id', settings.company_id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  const ids = (products || []).map(p => p.id);
  const { data: images } = ids.length
    ? await db.from('website_product_images').select('product_id,image_url,is_primary,sort_order').eq('company_id', settings.company_id).in('product_id', ids).order('sort_order')
    : { data: [] };

  const imageMap = {};
  for (const image of images || []) {
    if (!imageMap[image.product_id] || image.is_primary) imageMap[image.product_id] = image.image_url;
  }

  const items = (products || []).map(p => {
    const inStock = Number(p.stock_quantity || 0) > 0 || p.allow_backorder === true;
    const additionalImages = (images || [])
      .filter(x => x.product_id === p.id && !x.is_primary && x.image_url)
      .slice(0, 9)
      .map(x => `      <g:additional_image_link>${xml(x.image_url)}</g:additional_image_link>`)
      .join('\n');
    const description = p.short_description || p.description || `${p.brand || ''} ${p.title}`.trim();
    const id = p.sku || p.id;
    return `  <item>\n    <g:id>${xml(id)}</g:id>\n    <g:title>${xml(p.title)}</g:title>\n    <g:description>${xml(description)}</g:description>\n    <g:link>${xml(absoluteUrl(`/products/${p.slug}`))}</g:link>\n    <g:image_link>${xml(imageMap[p.id] || '')}</g:image_link>\n${additionalImages ? `${additionalImages}\n` : ''}    <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>\n    <g:condition>new</g:condition>\n    <g:price>${xml(Number(p.price || 0).toFixed(2))} INR</g:price>\n    <g:brand>${xml(p.brand || settings.website_name || 'PinkBox')}</g:brand>\n    <g:identifier_exists>no</g:identifier_exists>\n  </item>`;
  }).join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n  <title>${xml(settings.website_name || 'PinkBox')}</title>\n  <link>${xml(absoluteUrl('/'))}</link>\n  <description>PinkBox product feed for Google Merchant Center</description>\n${items}\n</channel>\n</rss>`;

  return new Response(feed, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
