import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('website_settings')
      .select('company_id,website_name,logo_url,phone,email,address,whatsapp_number,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold,default_shipping_charge')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: 'PinkBox store is not configured.' }, { status: 404 });
    }

    const companyId = data.company_id;
    const { company_id: _companyId, ...publicSettings } = data;
    const [menuResult, themeResult] = await Promise.all([
      db.from('website_menus')
        .select('id,location,name,items')
        .eq('company_id', companyId)
        .eq('location', 'header')
        .order('updated_at', { ascending: false })
        .limit(1),
      db.from('website_theme_settings')
        .select('settings')
        .eq('company_id', companyId)
        .maybeSingle(),
    ]);

    if (menuResult.error || themeResult.error) {
      console.error('Storefront header config could not be loaded:', menuResult.error || themeResult.error);
    }

    return Response.json({
      settings: publicSettings,
      headerMenu: menuResult.data?.[0] || null,
      theme: themeResult.data?.settings || {},
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Public store settings failed:', error);
    return Response.json({ error: 'Unable to load store settings.' }, { status: 500 });
  }
}
