import { createAdminClient } from '@/lib/supabase-admin';
import { absoluteUrl } from '@/lib/seo';
import { filterAvailableProducts } from '@/lib/product-availability';

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

function xmlError(message, status = 500) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET() {
  const db = createAdminClient();
  const { data: settings, error: settingsError } = await db
    .from('website_settings')
    .select('company_id,website_name')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (settingsError) return xmlError('Store settings unavailable', 500);
  if (!settings) return xmlError('Store not configured', 503);

  const { data: products, error: productsError } = await db
    .from('website_products')
    .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,is_active')
    .eq('company_id', settings.company_id)
    .eq('is_active', true)
    .or('sku.like.MDH-%,sku.like.BAG-%')
    .gt('price', 0)
    .order('updated_at', { ascending: false });

  if (productsError) return xmlError('Products unavailable', 500);

  const ids = (products || []).map((product) => product.id);
  const [{ data: images, error: imagesError }, { data: variants, error: variantsError }] = await Promise.all([
    ids.length
      ? db.from('website_product_images')
        .select('product_id,image_url,is_primary,sort_order')
        .eq('company_id', settings.company_id)
        .in('product_id', ids)
        .order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? db.from('website_product_variants')
        .select('product_id,stock_quantity,is_active')
        .eq('company_id', settings.company_id)
        .in('product_id', ids)
        .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (imagesError || variantsError) return xmlError('Catalogue images or inventory unavailable', 500);

  const availableIds = new Set(
    filterAvailableProducts(products || [], variants || []).map((product) => product.id)
  );
  const imageMap = {};
  for (const image of images || []) {
    if (!imageMap[image.product_id] || image.is_primary) imageMap[image.product_id] = image.image_url;
  }

  const items = (products || []).map((product) => {
    const inStock = availableIds.has(product.id);
    const description = product.short_description || product.description || `${product.brand || ''} ${product.title}`.trim();
    const id = product.sku || product.id;
    const primaryImage = imageMap[product.id]
      ? absoluteUrl(`/merchant-image/${encodeURIComponent(id)}`)
      : (/^(MDH-|BAG-)/i.test(String(product.sku || '')) ? absoluteUrl(`/catalog-products/${product.sku.toLowerCase()}.webp`) : '');
    if (!primaryImage) return '';
    return `  <item>
    <g:id>${xml(id)}</g:id>
    <g:title>${xml(product.title)}</g:title>
    <g:description>${xml(description)}</g:description>
    <g:link>${xml(absoluteUrl(`/products/${product.slug}`))}</g:link>
    <g:image_link>${xml(primaryImage)}</g:image_link>
    <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
    <g:condition>new</g:condition>
    <g:price>${xml(Number(product.price || 0).toFixed(2))} INR</g:price>
    <g:brand>${xml(product.brand || settings.website_name || 'PinkBox')}</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
  </item>`;
  }).filter(Boolean).join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${xml(settings.website_name || 'PinkBox')}</title>
  <link>${xml(absoluteUrl('/'))}</link>
  <description>PinkBox product feed for Google Merchant Center</description>
${items}
</channel>
</rss>`;

  return new Response(feed, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
