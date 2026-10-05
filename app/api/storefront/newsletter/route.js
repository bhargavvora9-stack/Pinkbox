import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const db = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
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

    const coupon = 'WELCOME10';
    const { error } = await db
      .from('website_newsletter_subscribers')
      .upsert({
        company_id: settings.company_id,
        email,
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
          subject: 'Your PinkBox 10% off coupon: WELCOME10',
          text: `Welcome to ${settings.website_name || 'PinkBox'}!

Use coupon WELCOME10 at checkout to get 10% off your first order.

Shop now: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app'}

Thank you,
PinkBox`,
        }),
      });
      emailed = response.ok;
    }

    return Response.json({
      ok: true,
      coupon,
      emailed,
      message: emailed
        ? 'Welcome! Your WELCOME10 coupon has been sent to your email.'
        : 'Welcome! Use WELCOME10 on your first order.',
    });
  } catch (error) {
    console.error('Newsletter signup failed:', error);
    return Response.json({ error: 'Unable to complete signup.' }, { status: 500 });
  }
}
