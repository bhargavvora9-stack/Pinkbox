import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app').replace(/\/$/, '');
  const db = createAdminClient();

  const { data: settings, error: settingsError } = await db
    .from('website_settings')
    .select('company_id')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (settingsError || !settings) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"></rss>', {
      status: 503,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const { data: products, error } = await db
    .from('website_products')
    .select('id,sku,title,slug,short_description,description,brand,price,stock_quantity,allow_backorder,is_active')
    .eq('company_id', settings.company_id)
    .eq('is_active', true)
    .gt('price', 0)
    .order('created_at', { ascending: false });

  if (error) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"></rss>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const productIds = (products || []).map((p) => p.id);
  const [{ data: images }, { data: mappings }, { data: categories }] = await Promise.all([
    productIds.length
      ? db.from('website_product_images').select('product_id,image_url,is_primary,sort_order').eq('company_id', settings.company_id).in('product_id', productIds).order('sort_order')
      : Promise.resolve({ data: [] }),
    productIds.length
      ? db.from('website_product_categories').select('product_id,category_id').eq('company_id', settings.company_id).in('product_id', productIds)
      : Promise.resolve({ data: [] }),
    db.from('website_categories').select('id,name').eq('company_id', settings.company_id).eq('is_active', true),
  ]);

  const imageMap = new Map();
  for (const image of images || []) {
    if (!image.image_url) continue;
    const current = imageMap.get(image.product_id);
    if (!current || Number(image.is_primary) > Number(current.is_primary) || Number(image.sort_order || 0) < Number(current.sort_order || 0)) {
      imageMap.set(image.product_id, image);
    }
  }

  const categoryMap = new Map((categories || []).map((c) => [c.id, c.name]));
  const productCategoryMap = new Map();
  for (const mapping of mappings || []) {
    const name = categoryMap.get(mapping.category_id);
    if (name && !productCategoryMap.has(mapping.product_id)) productCategoryMap.set(mapping.product_id, name);
  }

  const items = (products || []).map((p) => {
    const image = imageMap.get(p.id)?.image_url;
    if (!image) return '';

    const description = p.short_description || p.description || p.title;
    const availability = Number(p.stock_quantity || 0) > 0 || p.allow_backorder ? 'in stock' : 'out of stock';
    const link = base + '/products/' + encodeURIComponent(p.slug);

    return [
      '<item>',
      '<g:id>', esc(p.sku || p.id), '</g:id>',
      '<g:title>', esc(p.title), '</g:title>',
      '<g:description>', esc(description), '</g:description>',
      '<g:link>', esc(link), '</g:link>',
      '<g:image_link>', esc(image), '</g:image_link>',
      '<g:availability>', availability, '</g:availability>',
      '<g:condition>new</g:condition>',
      '<g:price>', esc(Number(p.price).toFixed(2)), ' INR</g:price>',
      p.brand ? '<g:brand>' + esc(p.brand) + '</g:brand>' : '',
      productCategoryMap.get(p.id) ? '<g:product_type>' + esc(productCategoryMap.get(p.id)) + '</g:product_type>' : '',
      '</item>',
    ].join('');
  }).filter(Boolean).join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>PinkBox Products</title>',
    '<link>', esc(base), '</link>',
    '<description>PinkBox product feed for Google Merchant Center free listings.</description>',
    items,
    '</channel>',
    '</rss>',
  ].join('');

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
