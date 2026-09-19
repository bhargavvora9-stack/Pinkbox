import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    if (settingsError) return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
    if (!settings?.company_id) return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
    const clientSubtotal = Number(body.subtotal || 0);
    if (!Number.isFinite(clientSubtotal) || clientSubtotal < 0) return Response.json({ error: 'Invalid cart totals.' }, { status: 400 });

    const items = Array.isArray(body.items)
      ? body.items.map((x) => ({ product_id: x.product_id || x.id, quantity: Number(x.quantity || 1) }))
      : [];
    if (!items.length) return Response.json({ subtotal: 0, discount: 0, shipping: 0, total: 0, coupon: null });
    if (items.length > 100) return Response.json({ error: 'Too many cart items.' }, { status: 400 });

    const ids = items.map(x => x.product_id);
    if (ids.some(id => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))) return Response.json({ error: 'Invalid product in cart.' }, { status: 400 });
    const { data: products, error: productError } = await db.from('website_products')
      .select('id,price,is_active')
      .eq('company_id', settings.company_id)
      .in('id', [...new Set(ids)]);
    if (productError) return Response.json({ error: 'Unable to validate cart.' }, { status: 500 });
    const productMap = new Map((products || []).map(p => [p.id, p]));
    let subtotal = 0;
    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity < 1 || item.quantity > 100 || item.quantity !== Math.trunc(item.quantity)) return Response.json({ error: 'Invalid cart quantity.' }, { status: 400 });
      const product = productMap.get(item.product_id);
      if (!product || product.is_active !== true) return Response.json({ error: 'One or more cart products are unavailable.' }, { status: 409 });
      subtotal += Number(product.price || 0) * item.quantity;
    }
    subtotal = Number(subtotal.toFixed(2));

    const code = String(body.coupon_code || '').trim().toUpperCase();
    let discount = 0;
    let coupon = null;
    if (code) {
      const { data: cpn, error: couponError } = await db.from('website_discounts').select('code,discount_type,value,minimum_order_amount,maximum_discount_amount,starts_at,ends_at,usage_limit,usage_count,is_active').eq('company_id', settings.company_id).eq('code', code).maybeSingle();
      if (couponError) return Response.json({ error: 'Unable to validate coupon.' }, { status: 500 });
      const now = Date.now();
      const valid = cpn && cpn.is_active && (!cpn.starts_at || new Date(cpn.starts_at).getTime() <= now) && (!cpn.ends_at || new Date(cpn.ends_at).getTime() >= now) && (cpn.usage_limit == null || Number(cpn.usage_count || 0) < Number(cpn.usage_limit)) && subtotal >= Number(cpn.minimum_order_amount || 0);
      if (!valid) coupon = { code, valid: false, message: 'Invalid or unavailable coupon.' };
      else {
        discount = cpn.discount_type === 'percentage' ? Number((subtotal * Number(cpn.value || 0) / 100).toFixed(2)) : Number(cpn.value || 0);
        if (cpn.maximum_discount_amount != null) discount = Math.min(discount, Number(cpn.maximum_discount_amount));
        discount = Number(Math.max(0, Math.min(discount, subtotal)).toFixed(2));
        coupon = { code, valid: true, message: `Coupon applied: save ₹${discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` };
      }
    }

    const { data: shipping, error } = await db.rpc('calculate_website_shipping', {
      p_company_id: settings.company_id,
      p_subtotal: subtotal,
      p_discount: discount,
      p_state: String(body.state || '').trim(),
      p_pincode: String(body.pincode || '').trim(),
      p_items: items,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const shippingAmount = Number(shipping || 0);
    return Response.json({ subtotal, discount, shipping: shippingAmount, total: Number((subtotal - discount + shippingAmount).toFixed(2)), coupon, client_subtotal: clientSubtotal });
  } catch (error) {
    console.error('Shipping quote failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to calculate shipping.' }, { status: 500 });
  }
}
