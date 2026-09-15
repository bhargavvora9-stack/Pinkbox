import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(String(key || ''));
  const db = createAdminClient();

  const { data: settings } = await db
    .from('website_settings')
    .select('company_id')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (!settings || !decodedKey) {
    return new Response('Not found', { status: 404 });
  }

  const { data: product } = await db
    .from('website_products')
    .select('id')
    .eq('company_id', settings.company_id)
    .eq('sku', decodedKey)
    .eq('is_active', true)
    .maybeSingle();

  if (!product) {
    return new Response('Not found', { status: 404 });
  }

  const { data: image } = await db
    .from('website_product_images')
    .select('image_url,is_primary,sort_order')
    .eq('company_id', settings.company_id)
    .eq('product_id', product.id)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!image?.image_url) {
    return new Response('Image not found', { status: 404 });
  }

  try {
    const upstream = await fetch(image.image_url, {
      cache: 'no-store',
      headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
    });

    if (!upstream.ok) {
      return new Response('Upstream image unavailable', { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return new Response('Invalid image response', { status: 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image fetch failed', { status: 502 });
  }
}
