import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Vary: 'Cookie',
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user?.id || !user.email) return null;
  return user;
}

async function getStore(db) {
  const { data, error } = await db
    .from('website_settings')
    .select('company_id')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data?.company_id) return null;
  return data;
}

async function findDeliveredProductOrder(db, companyId, productId, email) {
  const { data: orders, error: ordersError } = await db
    .from('website_orders')
    .select('id,customer_id,customer_name,created_at,payment_status')
    .eq('company_id', companyId)
    .ilike('customer_email', email)
    .eq('order_status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(100);

  if (ordersError) throw ordersError;

  const eligibleOrders = (orders || []).filter(
    (order) => !['refunded', 'failed', 'cancelled'].includes(String(order.payment_status || '').toLowerCase()),
  );
  if (!eligibleOrders.length) return null;

  const orderIds = eligibleOrders.map((order) => order.id);
  const { data: items, error: itemsError } = await db
    .from('website_order_items')
    .select('order_id')
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .in('order_id', orderIds);

  if (itemsError) throw itemsError;

  const matchingOrderIds = new Set((items || []).map((item) => item.order_id));
  return eligibleOrders.find((order) => matchingOrderIds.has(order.id)) || null;
}

async function getEligibility(db, companyId, productId, user) {
  const { data: product, error: productError } = await db
    .from('website_products')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return { exists: false };

  const order = await findDeliveredProductOrder(db, companyId, productId, user.email);
  if (!order) {
    return {
      exists: true,
      eligible: false,
      alreadyReviewed: false,
      message: 'A review becomes available after a PinkBox order containing this product is marked Delivered. Sign in with the same verified email used at checkout.',
    };
  }

  const { data: existingReview, error: reviewError } = await db
    .from('website_product_reviews')
    .select('id')
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (reviewError) throw reviewError;

  if (existingReview) {
    return {
      exists: true,
      eligible: false,
      alreadyReviewed: true,
      message: 'You have already reviewed this product. Thank you for sharing your experience.',
    };
  }

  return {
    exists: true,
    eligible: true,
    alreadyReviewed: false,
    customerName: order.customer_name || 'PinkBox customer',
    message: 'Your delivered order is verified. You can now write a review.',
    order,
  };
}

export async function GET(request) {
  try {
    const productId = new URL(request.url).searchParams.get('product_id')?.trim();
    if (!productId) return json({ error: 'Product is required.' }, 400);

    const user = await getAuthenticatedUser();
    if (!user) {
      return json({
        authenticated: false,
        eligible: false,
        message: 'Sign in with the verified email address used for your PinkBox order to write a review.',
      });
    }

    if (!user.email_confirmed_at) {
      return json({
        authenticated: true,
        emailVerified: false,
        eligible: false,
        message: 'Please verify your account email before submitting a review.',
      });
    }

    const db = createAdminClient();
    const settings = await getStore(db);
    if (!settings) return json({ error: 'PinkBox store is not configured.' }, 404);

    const result = await getEligibility(db, settings.company_id, productId, user);
    if (!result.exists) return json({ error: 'Product not found.' }, 404);

    return json({
      authenticated: true,
      emailVerified: true,
      eligible: result.eligible,
      alreadyReviewed: Boolean(result.alreadyReviewed),
      customerName: result.customerName || null,
      message: result.message,
    });
  } catch (error) {
    console.error('Storefront review eligibility check failed:', error);
    return json({ error: 'Unable to check review eligibility. Please try again.' }, 500);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return json({ error: 'Please sign in with the verified email address used for your PinkBox order.' }, 401);
    }
    if (!user.email_confirmed_at) {
      return json({ error: 'Please verify your account email before submitting a review.' }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'Invalid request.' }, 400);

    const productId = String(body.product_id || '').trim();
    const rating = Number(body.rating);
    const title = String(body.title || '').trim().slice(0, 200);
    const reviewText = String(body.review_text || '').trim().slice(0, 3000);

    if (!productId) return json({ error: 'Product is required.' }, 400);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return json({ error: 'Rating must be between 1 and 5.' }, 400);
    }
    if (!reviewText || reviewText.length < 10) {
      return json({ error: 'Please write at least 10 characters about your experience.' }, 400);
    }

    const db = createAdminClient();
    const settings = await getStore(db);
    if (!settings) return json({ error: 'PinkBox store is not configured.' }, 404);

    const result = await getEligibility(db, settings.company_id, productId, user);
    if (!result.exists) return json({ error: 'Product not found.' }, 404);
    if (result.alreadyReviewed) {
      return json({ error: 'You have already reviewed this product.' }, 409);
    }
    if (!result.eligible || !result.order) {
      return json({
        error: result.message || 'A delivered PinkBox order for this product is required before reviewing.',
      }, 403);
    }

    const { error: insertError } = await db.from('website_product_reviews').insert({
      company_id: settings.company_id,
      product_id: productId,
      customer_id: result.order.customer_id || null,
      auth_user_id: user.id,
      verified_order_id: result.order.id,
      customer_name: result.order.customer_name || 'PinkBox customer',
      rating: Math.round(rating),
      title: title || null,
      review_text: reviewText,
      is_verified_purchase: true,
      is_approved: false,
      is_featured: false,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return json({ error: 'You have already reviewed this product.' }, 409);
      }
      console.error('Storefront review insert failed:', insertError);
      return json({ error: 'Unable to submit your review. Please try again.' }, 500);
    }

    return json({
      ok: true,
      message: 'Thank you! Your verified-purchase review has been submitted and will appear after PinkBox approval.',
    });
  } catch (error) {
    console.error('Storefront review submission failed:', error);
    return json({ error: 'Unable to submit review. Please try again.' }, 500);
  }
}
