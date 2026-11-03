import { getWebsiteAdminContext, jsonError, audit } from '@/lib/website-admin';

export async function GET() {
  const { supabase, companyId, error } = await getWebsiteAdminContext();
  if (error) return jsonError(error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', error === 'UNAUTHENTICATED' ? 401 : 403);
  const { data, error: dbError } = await supabase.from('website_product_categories').select('*').eq('company_id', companyId);
  if (dbError) return jsonError(dbError.message, 500);
  return Response.json({ data: data || [] });
}

export async function POST(request) {
  const { supabase, companyId, user, error } = await getWebsiteAdminContext();
  if (error) return jsonError(error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', error === 'UNAUTHENTICATED' ? 401 : 403);
  const body = await request.json().catch(() => null);
  if (!body?.product_id || !Array.isArray(body.category_ids)) return jsonError('Product and category_ids are required.');
  const ids = [...new Set(body.category_ids.map(String))];
  if (ids.length !== body.category_ids.length) return jsonError('Duplicate category ids are not allowed.');

  const [{ data: product, error: productError }, { data: categories, error: categoryError }, { data: before, error: beforeError }] = await Promise.all([
    supabase.from('website_products').select('id').eq('company_id', companyId).eq('id', body.product_id).maybeSingle(),
    ids.length ? supabase.from('website_categories').select('id').eq('company_id', companyId).in('id', ids) : Promise.resolve({ data: [], error: null }),
    supabase.from('website_product_categories').select('category_id').eq('company_id', companyId).eq('product_id', body.product_id),
  ]);
  if (productError || categoryError || beforeError) return jsonError(productError?.message || categoryError?.message || beforeError?.message || 'Unable to validate category mapping.', 500);
  if (!product) return jsonError('Product not found.', 404);
  if ((categories || []).length !== ids.length) return jsonError('One or more categories were not found for this company.', 400);

  const { error: replaceError } = await supabase.rpc('replace_website_product_links', {
    p_company_id: companyId,
    p_product_id: body.product_id,
    p_relation: 'categories',
    p_related_ids: ids,
  });
  if (replaceError) return jsonError(replaceError.message, replaceError.code === '42501' ? 403 : 400);

  await audit(supabase, {
    companyId,
    userId: user.id,
    action: 'product.categories.replace',
    entityType: 'website_product_categories',
    entityId: body.product_id,
    oldData: before || [],
    newData: ids.map(category_id => ({ category_id })),
  });
  return Response.json({ ok: true });
}
