import { createAdminClient } from '@/lib/supabase-admin';

const triggerAliases = {
  pending: 'order_created',
  new: 'order_created',
  confirmed: 'order_confirmed',
  processing: 'order_confirmed',
  packed: 'order_confirmed',
  shipped: 'order_shipped',
  delivered: 'order_delivered',
};

export async function runWebsiteAutomations({ companyId, trigger, order = null }) {
  if (!companyId || !trigger) return { matched: 0, executed: 0, errors: 0 };
  const db = createAdminClient();
  const normalizedTrigger = triggerAliases[trigger] || trigger;
  const [{ data: automations, error }, { data: notificationSettings }] = await Promise.all([
    db.from('website_automations')
      .select('*')
      .eq('company_id', companyId)
      .eq('trigger_type', normalizedTrigger)
      .eq('is_active', true)
      .order('created_at'),
    db.from('website_notification_settings')
      .select('order_confirmation,shipping_updates,abandoned_cart_reminder')
      .eq('company_id', companyId)
      .maybeSingle(),
  ]);
  if (error) throw error;

  const settings = {
    order_confirmation: notificationSettings?.order_confirmation !== false,
    shipping_updates: notificationSettings?.shipping_updates !== false,
    abandoned_cart_reminder: notificationSettings?.abandoned_cart_reminder !== false,
  };
  const settingKey = normalizedTrigger === 'abandoned_cart'
    ? 'abandoned_cart_reminder'
    : normalizedTrigger === 'order_shipped' || normalizedTrigger === 'order_delivered'
      ? 'shipping_updates'
      : 'order_confirmation';

  let executed = 0;
  let errors = 0;
  for (const automation of automations || []) {
    const config = automation.config && typeof automation.config === 'object' ? automation.config : {};
    try {
      if (automation.action_type === 'create_notification') {
        const channel = String(config.channel || 'in_app').toLowerCase();
        const recipient = channel === 'email' ? (order?.customer_email || null) : (order?.customer_email || order?.customer_phone || null);
        const subject = String(config.subject || `${automation.name}${order?.order_number ? ` · ${order.order_number}` : ''}`).slice(0, 250);
        const template = String(config.message || config.body || `Your order ${order?.order_number || ''} was updated to ${order?.order_status || normalizedTrigger}.`).slice(0, 5000);
        if (settings[settingKey] === false) {
          await db.from('website_notification_logs').insert({ company_id: companyId, channel, recipient, subject, status: 'disabled', error: `Notification type ${settingKey} is disabled.`, created_at: new Date().toISOString() });
          executed += 1;
          continue;
        }
        const providerReady = channel === 'in_app' || (channel === 'email' && !!process.env.RESEND_API_KEY);

        if (channel === 'email' && providerReady && recipient) {
          const from = process.env.RESEND_FROM_EMAIL || 'PinkBox <onboarding@resend.dev>';
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [recipient], subject, text: template }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            await db.from('website_notification_logs').insert({ company_id: companyId, channel, recipient, subject, status: 'failed', error: body?.message || 'Email provider request failed', created_at: new Date().toISOString() });
            errors += 1;
            continue;
          }
          await db.from('website_notification_logs').insert({ company_id: companyId, channel, recipient, subject, status: 'sent', error: null, created_at: new Date().toISOString() });
          executed += 1;
          continue;
        }

        const status = providerReady && recipient ? 'queued' : 'provider_not_configured';
        const errorText = providerReady ? (recipient ? null : 'Recipient is missing.') : `No active provider configured for ${channel}.`;
        await db.from('website_notification_logs').insert({ company_id: companyId, channel, recipient, subject, status, error: errorText, created_at: new Date().toISOString() });
        executed += 1;
      } else if (automation.action_type === 'update_order') {
        if (!order?.id) throw new Error('Order context is required for update_order.');
        const nextStatus = String(config.order_status || config.status || '').trim().toLowerCase();
        const allowed = ['pending','confirmed','processing','packed','shipped','delivered','cancelled','returned'];
        if (!allowed.includes(nextStatus)) throw new Error('Automation update_order status is invalid.');
        const { error: updateError } = await db.from('website_orders').update({ order_status: nextStatus, updated_at: new Date().toISOString() }).eq('company_id', companyId).eq('id', order.id);
        if (updateError) throw updateError;
        await db.from('website_order_status_history').insert({ company_id: companyId, order_id: order.id, status: nextStatus, note: `Automation: ${automation.name}` , created_at: new Date().toISOString() });
        executed += 1;
      }
    } catch (err) {
      errors += 1;
      await db.from('website_notification_logs').insert({ company_id: companyId, channel: 'automation', recipient: order?.customer_email || order?.customer_phone || null, subject: automation.name, status: 'failed', error: err instanceof Error ? err.message : 'Automation failed', created_at: new Date().toISOString() });
    }
  }
  return { matched: (automations || []).length, executed, errors };
}
