import { createClient } from '@/lib/supabase-server';

export async function getWebsiteAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, companyId: null, error: 'UNAUTHENTICATED' };
  const { data: profile, error } = await supabase.from('profiles').select('id, company_id, role, active, display_name').eq('id', user.id).maybeSingle();
  if (error || !profile || profile.active === false || !profile.company_id) return { supabase, user, profile: null, companyId: null, error: 'FORBIDDEN' };
  return { supabase, user, profile, companyId: profile.company_id, error: null };
}
export function cleanString(value, max = 5000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function slugify(value) { return cleanString(value, 180).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `item-${Date.now()}`; }
export function jsonError(message, status = 400) { return Response.json({ error: message }, { status }); }
export async function audit(supabase, { companyId, userId, action, entityType, entityId, oldData = null, newData = null }) {
  await supabase.from('website_audit_logs').insert({ company_id: companyId, user_id: userId, action, entity_type: entityType, entity_id: entityId || null, old_data: oldData, new_data: newData });
}
