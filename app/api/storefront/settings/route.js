import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('website_settings')
      .select('id,company_id,website_name,phone,email,address,whatsapp_number,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold,default_shipping_charge')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });
    }

    // Only expose an active, in-date public offer to the exit-intent popup.
    const { data: offers } = await db
      .from('website_discounts')
      .select('id,name,code,discount_type,value,minimum_order_amount,starts_at,ends_at')
      .eq('company_id', data.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    const now = Date.now();
    const exitOffer = (offers || []).find((offer) =>
      (!offer.starts_at || new Date(offer.starts_at).getTime() <= now) &&
      (!offer.ends_at || new Date(offer.ends_at).getTime() >= now) &&
      Boolean(offer.code)
    ) || null;

    return Response.json({
      settings: {
        website_name: data.website_name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        whatsapp_number: data.whatsapp_number,
        instagram_url: data.instagram_url,
        facebook_url: data.facebook_url,
        youtube_url: data.youtube_url,
        announcement_text: data.announcement_text,
        free_shipping_threshold: data.free_shipping_threshold,
        default_shipping_charge: data.default_shipping_charge,
      },
      exit_offer: exitOffer,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Public store settings failed:', error);
    return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
  }
}
