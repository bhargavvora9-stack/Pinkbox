import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('website_settings')
      .select('website_name,phone,email,address,whatsapp_number,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold,default_shipping_charge')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });
    }
    return Response.json({ settings: data }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Public store settings failed:', error);
    return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
  }
}
