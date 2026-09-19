import { createAdminClient } from '@/lib/supabase-admin';
import { runWebsiteAutomations } from '@/lib/website-automation';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const retryBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: carts, error } = await db
    .from('website_abandoned_carts')
    .select('id,company_id,customer_name,customer_email,customer_phone,session_id,total_amount,last_activity_at,last_reminder_at,status,recovered')
    .eq('status', 'abandoned')
    .eq('recovered', false)
    .not('customer_email', 'is', null)
    .lte('last_activity_at', staleBefore)
    .or(`last_reminder_at.is.null,last_reminder_at.lt.${retryBefore}`)
    .order('last_activity_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Abandoned-cart cron query failed:', error);
    return Response.json({ error: 'Unable to load abandoned carts.' }, { status: 500 });
  }

  let processed = 0;
  let errors = 0;
  for (const cart of carts || []) {
    try {
      const result = await runWebsiteAutomations({
        companyId: cart.company_id,
        trigger: 'abandoned_cart',
        order: {
          id: cart.id,
          customer_name: cart.customer_name || '',
          customer_email: cart.customer_email || '',
          customer_phone: cart.customer_phone || '',
          order_status: 'abandoned',
        },
      });

      await db.from('website_abandoned_carts')
        .update({ last_reminder_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('id', cart.id)
        .eq('company_id', cart.company_id);

      processed += 1;
      if ((result?.errors || 0) > 0) errors += 1;
    } catch (e) {
      errors += 1;
      await db.from('website_abandoned_carts')
        .update({ last_reminder_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('id', cart.id)
        .eq('company_id', cart.company_id);
      console.error('Abandoned-cart reminder failed:', e);
    }
  }

  return Response.json({ ok: true, matched: carts?.length || 0, processed, errors, ranAt: now.toISOString() });
}
