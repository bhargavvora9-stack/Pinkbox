import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const db = createAdminClient();
    const { data: settings } = await db.from('website_settings').select('company_id').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
    if (!settings) return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });

    const b = await request.json().catch(() => null);
    if (!b) return Response.json({ error: 'Invalid request.' }, { status: 400 });

    const productId = String(b.product_id || '').trim();
    const rating = Number(b.rating);
    const customerName = String(b.customer_name || '').trim().slice(0, 180);
    const title = String(b.title || '').trim().slice(0, 200);
    const reviewText = String(b.review_text || '').trim().slice(0, 3000);

    if (!productId) return Response.json({ error: 'Product is required.' }, { status: 400 });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return Response.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    if (!customerName) return Response.json({ error: 'Your name is required.' }, { status: 400 });
    if (!reviewText || reviewText.length < 10) return Response.json({ error: 'Please write a few words about your experience.' }, { status: 400 });

    const { data: product } = await db.from('website_products').select('id').eq('company_id', settings.company_id).eq('id', productId).eq('is_active', true).maybeSingle();
    if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });

    const { error } = await db.from('website_product_reviews').insert({
      company_id: settings.company_id,
      product_id: productId,
      customer_name: customerName,
      rating: Math.round(rating),
      title: title || null,
      review_text: reviewText,
      is_approved: false,
      is_featured: false,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, message: 'Thank you! Your review will appear once approved.' });
  } catch (e) {
    return Response.json({ error: 'Unable to submit review.' }, { status: 500 });
  }
}
