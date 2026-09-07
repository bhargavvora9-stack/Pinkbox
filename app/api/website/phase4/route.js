import { getWebsiteAdminContext, cleanString, slugify, audit, jsonError } from '@/lib/website-admin';

const TABLES = { theme: 'website_theme_settings', blog: 'website_blog_posts', footer: 'website_footer_settings', seo: 'website_seo_settings', redirects: 'website_seo_redirects' };
const jsonObject = (v, fallback = {}) => v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
const jsonArray = (v, fallback = []) => Array.isArray(v) ? v : fallback;
const truthy = v => v === true || v === 'true';

export async function GET(request) {
  const resource = new URL(request.url).searchParams.get('resource') || 'theme';
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId } = ctx;
  const table = TABLES[resource];
  if (!table) return jsonError('Unknown Phase 4 resource.', 404);
  let q = supabase.from(table).select('*').eq('company_id', companyId);
  if (['theme', 'footer', 'seo'].includes(resource)) q = q.maybeSingle();
  else q = q.order(resource === 'blog' ? 'published_at' : 'created_at', { ascending: false }).limit(200);
  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);
  return Response.json({ data: data ?? (['blog', 'redirects'].includes(resource) ? [] : {}) });
}

function buildPayload(resource, body, companyId, partial = false) {
  const p = { company_id: companyId };
  const text = (k, max = 5000) => { if (!partial || body[k] !== undefined) p[k] = cleanString(body[k], max) || null; };
  const bool = (k, fallback = false) => { if (!partial || body[k] !== undefined) p[k] = body[k] === undefined ? fallback : truthy(body[k]); };
  if (resource === 'theme') {
    if (!partial || body.primary_color !== undefined) p.primary_color = cleanString(body.primary_color, 30) || null;
    if (!partial || body.secondary_color !== undefined) p.secondary_color = cleanString(body.secondary_color, 30) || null;
    if (!partial || body.font_family !== undefined) p.font_family = cleanString(body.font_family, 120) || null;
    const incoming = jsonObject(body.settings);
    const allowed = [
      'theme_name','accent_color','background_color','surface_color','text_color','muted_color',
      'border_radius','button_radius','card_radius','layout_width','section_spacing','product_grid',
      'image_ratio','header_style','header_height','hero_style','hero_height','button_style',
      'card_style','card_shadow','heading_weight','announcement_bar','show_benefits','show_categories',
      'show_blog','checkout_style','header_settings','footer_settings','custom_css'
    ];
    const settings = {};
    for (const key of allowed) {
      if (!partial || Object.prototype.hasOwnProperty.call(incoming, key)) settings[key] = incoming[key];
    }
    p.settings = settings;
    return p;
  }
  if (resource === 'footer') {
    p.columns = jsonArray(body.columns);
    p.social_links = jsonObject(body.social_links);
    text('copyright_text', 500);
    return p;
  }
  if (resource === 'seo') {
    text('default_meta_title', 180); text('default_meta_description', 320); text('robots_txt', 10000); bool('sitemap_enabled', true); return p;
  }
  if (resource === 'blog') {
    text('title', 180); text('slug', 180); text('excerpt', 1000); text('cover_image_url', 1500);
    if (!partial || body.content !== undefined) p.content = jsonObject(body.content, { html: cleanString(body.content, 30000) });
    bool('is_published', false);
    if (!partial || body.published_at !== undefined) p.published_at = body.published_at || null;
    return p;
  }
  if (resource === 'redirects') {
    text('from_path', 500); text('to_path', 500); if (!partial || body.status_code !== undefined) p.status_code = Number(body.status_code) || 301; bool('is_active', true); return p;
  }
  return p;
}

export async function POST(request) {
  const resource = new URL(request.url).searchParams.get('resource');
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId, user } = ctx;
  const body = await request.json().catch(() => ({}));
  const table = TABLES[resource];
  if (!table) return jsonError('Unknown Phase 4 resource.', 404);
  const p = buildPayload(resource, body, companyId);
  if (resource === 'blog') {
    if (!p.title) return jsonError('Blog title is required.');
    p.slug = slugify(p.slug || p.title);
    if (p.is_published && !p.published_at) p.published_at = new Date().toISOString();
  }
  if (resource === 'redirects') {
    if (!p.from_path || !p.to_path) return jsonError('From and To paths are required.');
    if (!p.from_path.startsWith('/')) p.from_path = '/' + p.from_path;
    if (!p.to_path.startsWith('/')) p.to_path = '/' + p.to_path;
  }
  const result = await supabase.from(table).upsert(p, ['theme','footer','seo'].includes(resource) ? { onConflict: 'company_id' } : undefined).select().single();
  if (result.error) return jsonError(result.error.message, 500);
  await audit(supabase, { companyId, userId: user.id, action: `phase4.${resource}.create`, entityType: table, entityId: result.data.id || null, newData: result.data });
  return Response.json({ data: result.data }, { status: 201 });
}

export async function PATCH(request) {
  const resource = new URL(request.url).searchParams.get('resource');
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId, user } = ctx;
  const body = await request.json().catch(() => null);
  if (!body?.id) return jsonError('Record id is required.');
  const table = TABLES[resource];
  if (!table) return jsonError('Unknown Phase 4 resource.', 404);
  const { data: oldData } = await supabase.from(table).select('*').eq('company_id', companyId).eq('id', body.id).maybeSingle();
  if (!oldData) return jsonError('Record not found.', 404);
  const p = buildPayload(resource, body, companyId, true);
  delete p.id; delete p.company_id; delete p.created_at; p.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from(table).update(p).eq('company_id', companyId).eq('id', body.id).select().single();
  if (error) return jsonError(error.message, 500);
  await audit(supabase, { companyId, userId: user.id, action: `phase4.${resource}.update`, entityType: table, entityId: data.id, oldData, newData: data });
  return Response.json({ data });
}

export async function DELETE(request) {
  const u = new URL(request.url); const resource = u.searchParams.get('resource'); const id = u.searchParams.get('id');
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId, user } = ctx; const table = TABLES[resource];
  if (!table || !id) return jsonError('Resource and id are required.');
  const { data: oldData } = await supabase.from(table).select('*').eq('company_id', companyId).eq('id', id).maybeSingle();
  if (!oldData) return jsonError('Record not found.', 404);
  const { error } = await supabase.from(table).delete().eq('company_id', companyId).eq('id', id);
  if (error) return jsonError(error.message, 500);
  await audit(supabase, { companyId, userId: user.id, action: `phase4.${resource}.delete`, entityType: table, entityId: id, oldData });
  return Response.json({ ok: true });
}