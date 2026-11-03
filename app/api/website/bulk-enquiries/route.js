import { getWebsiteAdminContext, jsonError, audit } from '@/lib/website-admin';

const SOURCES = new Set(['Website', 'Phone call', 'WhatsApp', 'Instagram', 'Google', 'Referral', 'Other']);
const STATUSES = new Set(['new', 'contacted', 'qualified', 'converted', 'lost']);
const clean = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function GET() {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { data, error } = await ctx.supabase
    .from('website_bulk_enquiries')
    .select('id,name,company_name,phone,email,organisation_type,quantity,message,status,source,created_at,updated_at')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return jsonError(error.message, 500);
  return Response.json({ data: data || [] });
}

export async function POST(request) {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const body = await request.json().catch(() => ({}));
  const name = clean(body.name, 160);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160).toLowerCase();
  if (name.length < 2 || phone.replace(/\\D/g, '').length < 7) return jsonError('Name and a valid phone number are required.');
  if (email && !/^\\S+@\\S+\\.\\S+$/.test(email)) return jsonError('Please enter a valid email address.');
  const source = SOURCES.has(body.source) ? body.source : 'Other';
  const { data, error } = await ctx.supabase.from('website_bulk_enquiries').insert({
    company_id: ctx.companyId,
    name,
    company_name: clean(body.company_name, 180) || null,
    phone,
    email: email || null,
    organisation_type: clean(body.organisation_type, 120) || null,
    quantity: clean(body.quantity, 120) || null,
    message: clean(body.message, 3000) || null,
    source,
    status: 'new',
  }).select().single();
  if (error) return jsonError(error.message, 500);
  await audit(ctx.supabase, { companyId: ctx.companyId, userId: ctx.user.id, action: 'bulk_enquiry.create', entityType: 'website_bulk_enquiries', entityId: data.id, newData: data });
  return Response.json({ data }, { status: 201 });
}

export async function PATCH(request) {
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const body = await request.json().catch(() => ({}));
  if (!body.id || !STATUSES.has(body.status)) return jsonError('A valid enquiry ID and status are required.');
  const { data: oldData } = await ctx.supabase.from('website_bulk_enquiries').select('*').eq('company_id', ctx.companyId).eq('id', body.id).maybeSingle();
  if (!oldData) return jsonError('Enquiry not found.', 404);
  const patch = { status: body.status, updated_at: new Date().toISOString() };
  if (body.source !== undefined) patch.source = SOURCES.has(body.source) ? body.source : oldData.source;
  const { data, error } = await ctx.supabase.from('website_bulk_enquiries').update(patch).eq('company_id', ctx.companyId).eq('id', body.id).select().single();
  if (error) return jsonError(error.message, 500);
  await audit(ctx.supabase, { companyId: ctx.companyId, userId: ctx.user.id, action: 'bulk_enquiry.update', entityType: 'website_bulk_enquiries', entityId: data.id, oldData, newData: data });
  return Response.json({ data });
}
