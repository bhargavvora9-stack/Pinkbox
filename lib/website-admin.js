import { createClient } from '@/lib/supabase-server';

const WEBSITE_ADMIN_ROLES = new Set(['super_admin', 'admin']);

const RESOURCE_MODULES = {
  dashboard: 'dashboard',
  orders: 'orders',
  order: 'orders',
  'order-status': 'orders',
  invoices: 'orders',
  'packing-slip': 'orders',
  payments: 'payments',
  'shipping-methods': 'shipping',
  'shipping-zones': 'shipping',
  'shipping-rules': 'shipping',
  'abandoned-carts': 'abandoned_carts',
  customers: 'customers',
  'bulk-enquiries': 'b2b_enquiries',
  'catalog-import': 'import_export',
  inventory: 'inventory',
  products: 'products',
  'bulk-update': 'products',
  images: 'images',
  'upload-image': 'images',
  categories: 'categories',
  'product-categories': 'categories',
  brands: 'brands',
  collections: 'collections',
  'product-collections': 'collections',
  variants: 'variants',
  reviews: 'reviews',
  discounts: 'discounts',
  campaigns: 'campaigns',
  notifications: 'notifications',
  logs: 'notifications',
  settings: 'settings',
  homepage: 'homepage',
  'homepage-sections': 'homepage',
  banners: 'banners',
  pages: 'pages',
  navigation: 'navigation',
  design: 'design',
  theme: 'theme',
  seo: 'seo',
  redirects: 'seo',
  blog: 'blog',
  footer: 'footer',
  shipping: 'shipping',
  automations: 'automations',
  analytics: 'analytics',
  reports: 'reports',
  health: 'system_health',
  roles: 'roles',
  'audit-logs': 'audit_log',
};

function permissionTarget(request, override = {}) {
  if (override.resource && override.action) return { module: override.resource, action: override.action };
  if (!request?.url) return null;
  const url = new URL(request.url);
  const path = url.pathname.split('/').filter(Boolean);
  const method = String(request.method || 'GET').toUpperCase();
  let resource = url.searchParams.get('resource');
  let module = null;

  if (path[0] === 'api' && path[1] === 'website') {
    const route = path[2] || '';
    if (['phase2','phase3','phase4','phase5','phase6'].includes(route)) {
      if (!resource) {
        return null;
      }
      module = RESOURCE_MODULES[resource] || null;
      if (route === 'phase3' && resource === 'order-status') module = 'orders';
      if (route === 'phase4' && ['theme','footer','seo'].includes(resource) && method === 'POST') {
        return { module, action: 'update' };
      }
      if (route === 'phase5' && resource === 'settings' && method === 'POST') {
        return { module: 'notifications', action: 'update' };
      }
      if (route === 'phase2' && resource === 'product-collections' && method === 'POST') {
        return { module: 'collections', action: 'update' };
      }
      if (route === 'phase3' && resource === 'order-status' && method === 'POST') {
        return { module: 'orders', action: 'update' };
      }
    } else if (route === 'orders' && path.length >= 5) {
      module = 'orders';
    } else if (route === 'products' && path[3] === 'bulk-update') {
      module = 'products';
    } else {
      const last = path[path.length - 1] || route;
      module = RESOURCE_MODULES[route] || RESOURCE_MODULES[last] || null;
      if (route === 'dashboard') module = 'dashboard';
      if (route === 'audit-logs') module = 'audit_log';
      if (route === 'bulk-enquiries') module = 'b2b_enquiries';
      if (route === 'catalog-import') module = 'import_export';
      if (route === 'product-categories') module = 'categories';
      if (route === 'upload-image') module = 'images';
      if (route === 'inventory') module = 'inventory';
      if (route === 'customers') module = 'customers';
    }
  }
  if (!module) return null;
  let action = ({ GET: 'view', POST: 'create', PATCH: 'update', PUT: 'update', DELETE: 'delete' })[method];
  if (method === 'POST' && ['inventory','settings'].includes(resource || path[2])) action = 'update';
  if (method === 'POST' && path[2] === 'product-categories') action = 'update';
  if (method === 'POST' && path[2] === 'phase3') action = 'update';
  if (method === 'POST' && path[2] === 'phase4' && ['theme','footer','seo'].includes(resource)) action = 'update';
  if (method === 'POST' && path[2] === 'phase5' && resource === 'settings') action = 'update';
  if (method === 'POST' && path[2] === 'phase2' && resource === 'product-collections') action = 'update';
  return action ? { module, action } : null;
}

export async function getWebsiteRolePermissions(supabase, companyId, userId) {
  const { data: assignment, error: assignmentError } = await supabase
    .from('website_user_role_assignments')
    .select('role_id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (assignmentError || !assignment?.role_id) return null;
  const { data: role, error: roleError } = await supabase
    .from('website_roles')
    .select('id, name, permissions')
    .eq('company_id', companyId)
    .eq('id', assignment.role_id)
    .maybeSingle();
  if (roleError || !role) return null;
  return { roleId: role.id, roleName: role.name, modules: role.permissions?.modules || {} };
}

export async function getWebsiteAdminContext(request = null, override = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, companyId: null, permissions: null, error: 'UNAUTHENTICATED' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, company_id, role, active, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile || profile.active === false || !profile.company_id) {
    return { supabase, user, profile: null, companyId: null, permissions: null, error: 'FORBIDDEN' };
  }

  if (WEBSITE_ADMIN_ROLES.has(profile.role)) {
    return { supabase, user, profile, companyId: profile.company_id, permissions: null, error: null };
  }

  const target = permissionTarget(request, override);
  if (!target || target.module === 'roles') return { supabase, user, profile: null, companyId: null, permissions: null, error: 'FORBIDDEN' };
  const permissions = await getWebsiteRolePermissions(supabase, profile.company_id, user.id);
  if (!permissions?.modules?.[target.module]?.[target.action]) {
    return { supabase, user, profile: null, companyId: null, permissions, error: 'FORBIDDEN' };
  }

  return { supabase, user, profile, companyId: profile.company_id, permissions, error: null };
}

export function cleanString(value, max = 5000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function slugify(value) { return cleanString(value, 180).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `item-${Date.now()}`; }
export function jsonError(message, status = 400) { return Response.json({ error: message }, { status }); }
export async function audit(supabase, { companyId, userId, action, entityType, entityId, oldData = null, newData = null }) {
  await supabase.from('website_audit_logs').insert({ company_id: companyId, user_id: userId, action, entity_type: entityType, entity_id: entityId || null, old_data: oldData, new_data: newData });
}
