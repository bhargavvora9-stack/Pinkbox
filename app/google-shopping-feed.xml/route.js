import { createAdminClient } from '@/lib/supabase-admin';
import { filterAvailableProducts } from '@/lib/product-availability';

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

function xmlError(status) {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"></rss>', {
    status,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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

  if (settingsError || !settings) return xmlError(settingsError ? 500 : 503);

  const { data: products, error: productsError } = await db
    .from('website_products')
    .select('id,sku,title,slug,short_description,description,brand,price,stock_quantity,track_inventory,allow_backorder,is_active')
    .eq('company_id', settings.company_id)
    .eq('is_active', true)
    .or('sku.like.MDH-%,sku.like.BAG-%')
    .gt('price', 0)
    .order('created_at', { ascending: false });

  if (productsError) return xmlError(500);

  const productIds = (products || []).map((product) => product.id);
  const [{ data: images, error: imagesError }, { data: mappings, error: mappingsError }, { data: categories, error: categoriesError }, { data: variants, error: variantsError }] = await Promise.all([
    productIds.length
      ? db.from('website_product_images').select('product_id,image_url,is_primary,sort_order').eq('company_id', settings.company_id).in('product_id', productIds).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? db.from('website_product_categories').select('product_id,category_id').eq('company_id', settings.company_id).in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
    db.from('website_categories').select('id,name').eq('company_id', settings.company_id).eq('is_active', true),
    productIds.length
      ? db.from('website_product_variants').select('product_id,stock_quantity,is_active').eq('company_id', settings.company_id).in('product_id', productIds).eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (imagesError || mappingsError || categoriesError || variantsError) return xmlError(500);

  const availableIds = new Set(
    filterAvailableProducts(products || [], variants || []).map((product) => product.id)
  );
  const imageMap = new Map();
  for (const image of images || []) {
    if (!image.image_url) continue;
    const current = imageMap.get(image.product_id);
    if (!current || Number(image.is_primary) > Number(current.is_primary) || Number(image.sort_order || 0) < Number(current.sort_order || 0)) {
      imageMap.set(image.product_id, image);
    }
  }

  const categoryMap = new Map((categories || []).map((category) => [category.id, category.name]));
  const productCategoryMap = new Map();
  for (const mapping of mappings || []) {
    const name = categoryMap.get(mapping.category_id);
    if (name && !productCategoryMap.has(mapping.product_id)) productCategoryMap.set(mapping.product_id, name);
  }

  const items = (products || []).map((product) => {
    const image = imageMap.get(product.id)?.image_url || (product.sku?.startsWith('MDH-') ? `${base}/catalog-products/${product.sku.toLowerCase()}.webp` : '');
    if (!image) return '';
    const description = product.short_description || product.description || product.title;
    const availability = availableIds.has(product.id) ? 'in stock' : 'out of stock';
    const link = base + '/products/' + encodeURIComponent(product.slug);
    return [
      '<item>',
      '<g:id>', esc(product.sku || product.id), '</g:id>',
      '<g:title>', esc(product.title), '</g:title>',
      '<g:description>', esc(description), '</g:description>',
      '<g:link>', esc(link), '</g:link>',
      '<g:image_link>', esc(image), '</g:image_link>',
      '<g:availability>', availability, '</g:availability>',
      '<g:condition>new</g:condition>',
      '<g:price>', esc(Number(product.price).toFixed(2)), ' INR</g:price>',
      product.brand ? '<g:brand>' + esc(product.brand) + '</g:brand>' : '',
      productCategoryMap.get(product.id) ? '<g:product_type>' + esc(productCategoryMap.get(product.id)) + '</g:product_type>' : '',
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
