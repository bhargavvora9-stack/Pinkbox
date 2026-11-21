import { getWebsiteAdminContext, jsonError } from '@/lib/website-admin';
import { sanitizePaymentAuditSnapshot } from '@/lib/sanitize-payment-audit';

export async function GET(request) {
  const { supabase, companyId, error } = await getWebsiteAdminContext(request);
  if (error) return jsonError('Access denied.', 403);

  const { data, error: dbError } = await supabase
    .from('website_audit_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(300);

  if (dbError) return jsonError(dbError.message, 500);

  const safeRows = (data || []).map((row) => {
    if (row.entity_type !== 'website_payment_methods') return row;
    return {
      ...row,
      old_data: sanitizePaymentAuditSnapshot(row.old_data),
      new_data: sanitizePaymentAuditSnapshot(row.new_data),
    };
  });

  return Response.json({ data: safeRows });
}
