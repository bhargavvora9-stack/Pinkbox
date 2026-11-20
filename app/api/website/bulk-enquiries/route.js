import { getWebsiteAdminContext, jsonError, audit } from '@/lib/website-admin';

const SOURCES = new Set(['Website', 'Phone call', 'WhatsApp', 'Instagram', 'Google', 'Referral', 'Other']);
const STATUSES = new Set(['new', 'contacted', 'qualified', 'converted', 'lost']);
const LEAD_TYPES = new Set(['contact', 'dealer', 'bulk']);
const clean = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validEmail = (value) => {
  const at = value.indexOf('@');
  const dot = value.lastIndexOf('.');
  return at > 0 && value.indexOf('@', at + 1) === -1 && dot > at + 1 && dot < value.length - 1
    && ![...value].some((character) => character.charCodeAt(0) <= 32);
};

export async function GET(request) {
  const ctx = await getWebsiteAdminContext(request);
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { data, error } = await ctx.supabase
    .from('website_bulk_enquiries')
    .select('id,name,company_name,phone,email,city,lead_type,organisation_type,quantity,message,notes,status,source,created_at,updated_at')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return jsonError(error.message, 500);
  return Response.json({ data: data || [] });
}

export async function POST(request) {
  const ctx = await getWebsiteAdminContext(request);
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const body = await request.json().catch(() => ({}));
  const name = clean(body.name, 160);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160).toLowerCase();
  const phoneDigits = phone.replace(/[^0-9]/g, '');
  if (name.length < 2 || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return jsonError('Name and a valid phone number are required.');
  }
  if (email && !validEmail(email)) return jsonError('Please enter a valid email address.');
  if (body.lead_type && !LEAD_TYPES.has(body.lead_type)) return jsonError('Please choose a valid lead type.');
  if (body.status && !STATUSES.has(body.status)) return jsonError('Please choose a valid lead status.');

  const source = SOURCES.has(body.source) ? body.source : 'Other';
  const { data, error } = await ctx.supabase.from('website_bulk_enquiries').insert({
    company_id: ctx.companyId,
    name,
    company_name: clean(body.company_name, 180) || null,
    phone,
    email: email || null,
    city: clean(body.city, 120) || null,
    lead_type: LEAD_TYPES.has(body.lead_type) ? body.lead_type : 'contact',
    organisation_type: clean(body.organisation_type, 120) || null,
    quantity: clean(body.quantity, 120) || null,
    message: clean(body.message, 3000) || null,
    notes: clean(body.notes, 3000) || null,
    source,
    status: STATUSES.has(body.status) ? body.status : 'new',
  }).select().single();
  if (error) return jsonError(error.message, 500);
  await audit(ctx.supabase, { companyId: ctx.companyId, userId: ctx.user.id, action: 'bulk_enquiry.create', entityType: 'website_bulk_enquiries', entityId: data.id, newData: data });
  return Response.json({ data }, { status: 201 });
}

export async function PATCH(request) {
  const ctx = await getWebsiteAdminContext(request);
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const body = await request.json().catch(() => ({}));
  if (!body.id) return jsonError('A valid enquiry ID is required.');

  const { data: oldData, error: loadError } = await ctx.supabase
    .from('website_bulk_enquiries')
    .select('*')
    .eq('company_id', ctx.companyId)
    .eq('id', body.id)
    .maybeSingle();
  if (loadError) return jsonError(loadError.message, 500);
  if (!oldData) return jsonError('Enquiry not found.', 404);

  const patch = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) {
    patch.name = clean(body.name, 160);
    if (patch.name.length < 2) return jsonError('Name must contain at least two characters.');
  }
  if (body.phone !== undefined) {
    patch.phone = clean(body.phone, 40);
    const digits = patch.phone.replace(/[^0-9]/g, '');
    if (digits.length < 7 || digits.length > 15) return jsonError('Enter a valid phone number.');
  }
  if (body.email !== undefined) {
    patch.email = clean(body.email, 160).toLowerCase() || null;
    if (patch.email && !validEmail(patch.email)) return jsonError('Please enter a valid email address.');
  }
  if (body.city !== undefined) patch.city = clean(body.city, 120) || null;
  if (body.lead_type !== undefined) {
    if (!LEAD_TYPES.has(body.lead_type)) return jsonError('Please choose a valid lead type.');
    patch.lead_type = body.lead_type;
  }
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) return jsonError('Please choose a valid lead status.');
    patch.status = body.status;
  }
  if (body.source !== undefined) {
    if (!SOURCES.has(body.source)) return jsonError('Please choose a valid lead source.');
    patch.source = body.source;
  }
  if (body.company_name !== undefined) patch.company_name = clean(body.company_name, 180) || null;
  if (body.organisation_type !== undefined) patch.organisation_type = clean(body.organisation_type, 120) || null;
  if (body.quantity !== undefined) patch.quantity = clean(body.quantity, 120) || null;
  if (body.message !== undefined) patch.message = clean(body.message, 3000) || null;
  if (body.notes !== undefined) patch.notes = clean(body.notes, 3000) || null;

  const { data, error } = await ctx.supabase
    .from('website_bulk_enquiries')
    .update(patch)
    .eq('company_id', ctx.companyId)
    .eq('id', body.id)
    .select()
    .single();
  if (error) return jsonError(error.message, 500);
  await audit(ctx.supabase, { companyId: ctx.companyId, userId: ctx.user.id, action: 'bulk_enquiry.update', entityType: 'website_bulk_enquiries', entityId: data.id, oldData, newData: data });
  return Response.json({ data });
}
