import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const db = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const companyName = String(body.company_name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const organisationType = String(body.organisation_type || '').trim();
    const quantity = String(body.quantity || '').trim();
    const message = String(body.message || '').trim();

    if (name.length < 2 || phone.length < 7) {
      return Response.json({ error: 'Name and phone are required.' }, { status: 400 });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id,website_name,email')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    if (settingsError || !settings?.company_id) {
      return Response.json({ error: 'Bulk enquiry is temporarily unavailable.' }, { status: 500 });
    }

    const { data: enquiry, error } = await db
      .from('website_bulk_enquiries')
      .insert({
        company_id: settings.company_id,
        name,
        company_name: companyName || null,
        phone,
        email: email || null,
        organisation_type: organisationType || null,
        quantity: quantity || null,
        message: message || null,
      })
      .select('id')
      .single();
    if (error) return Response.json({ error: 'Unable to save the enquiry.' }, { status: 500 });

    if (process.env.RESEND_API_KEY && settings.email) {
      const from = process.env.RESEND_FROM_EMAIL || 'PinkBox <onboarding@resend.dev>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [settings.email],
          subject: `New PinkBox bulk enquiry from ${name}`,
          text: [
            `Name: ${name}`,
            `Company/Organisation: ${companyName || '-'}`,
            `Phone: ${phone}`,
            `Email: ${email || '-'}`,
            `Type: ${organisationType || '-'}`,
            `Quantity: ${quantity || '-'}`,
            `Message: ${message || '-'}`,
            `Enquiry ID: ${enquiry.id}`,
          ].join('\n'),
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: true, message: 'Thanks! Our bulk sales team will contact you shortly.' }, { status: 201 });
  } catch (error) {
    console.error('Bulk enquiry failed:', error);
    return Response.json({ error: 'Unable to submit the enquiry.' }, { status: 500 });
  }
}
