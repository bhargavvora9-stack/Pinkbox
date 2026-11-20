import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const db = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim().slice(0, 180);
    const submittedPhone = String(body.phone || '').trim().slice(0, 40);
    const whatsappOptIn = body.whatsapp_opt_in === true;
    const phoneDigits = submittedPhone.replace(/\D/g, '');
    const phone = whatsappOptIn ? submittedPhone : '';
    const source = String(body.source || 'Homepage newsletter').trim().slice(0, 80);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (whatsappOptIn && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      return Response.json({ error: 'Enter a valid WhatsApp number to opt in.' }, { status: 400 });
    }

    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id,website_name')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    if (settingsError || !settings?.company_id) {
      return Response.json({ error: 'Newsletter is temporarily unavailable.' }, { status: 500 });
    }

    const { data: offerRows } = await db
      .from('website_discounts')
      .select('code,starts_at,ends_at')
      .eq('company_id', settings.company_id)
      .eq('is_active', true)
      .eq('code', 'WELCOME10')
      .limit(1);
    const currentTime = Date.now();
    const couponRow = (offerRows || []).find((offer) =>
      (!offer.starts_at || new Date(offer.starts_at).getTime() <= currentTime) &&
      (!offer.ends_at || new Date(offer.ends_at).getTime() >= currentTime)
    );
    const coupon = couponRow?.code || null;
    const { error } = await db
      .from('website_newsletter_subscribers')
      .upsert({
        company_id: settings.company_id,
        email,
        name: name || null,
        phone: whatsappOptIn ? (phone || null) : null,
        whatsapp_opt_in: whatsappOptIn,
        source,
        coupon_code: coupon,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,email' });
    if (error) return Response.json({ error: 'Unable to save your email right now.' }, { status: 500 });

    let emailed = false;
    if (process.env.RESEND_API_KEY) {
      const from = process.env.RESEND_FROM_EMAIL || 'PinkBox <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: coupon ? `Your PinkBox welcome coupon: ${coupon}` : `Welcome to ${settings.website_name || 'PinkBox'}`,
          text: `Welcome to ${settings.website_name || 'PinkBox'}!\n\n${coupon ? `Use coupon ${coupon} at checkout for your welcome offer.` : 'Thanks for joining our list. Watch your inbox for PinkBox offers.'}\n\nShop now: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app'}\n\nThank you,\nPinkBox`,
        }),
      });
      emailed = response.ok;
    }

    return Response.json({
      ok: true,
      coupon,
      emailed,
      message: coupon
        ? (emailed ? `Welcome! Your ${coupon} coupon has been sent to your email.` : `Welcome! Use ${coupon} at checkout.`)
        : 'Welcome! You are on the Pink Box list.',
    });
  } catch (error) {
    console.error('Newsletter signup failed:', error);
    return Response.json({ error: 'Unable to complete signup.' }, { status: 500 });
  }
}
