import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const WEBSITE_ADMIN_ROLES = new Set(['super_admin', 'admin']);

function errorResponse(request, code, message, wantsJson) {
  if (wantsJson) {
    const status = code === 'invalid_credentials' ? 401 : ['not_admin', 'no_company', 'subscription_inactive'].includes(code) ? 403 : 500;
    const response = NextResponse.json({ ok: false, error: message, code }, { status });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('Vary', 'Cookie');
    return response;
  }
  const url = new URL('/login', request.url);
  url.searchParams.set('error', code);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  response.headers.set('Vary', 'Cookie');
  return response;
}

export async function POST(request) {
  let wantsJson = false;
  try {
    const contentType = request.headers.get('content-type') || '';
    const accept = request.headers.get('accept') || '';
    wantsJson = contentType.includes('application/json') || accept.includes('application/json');

    let body = {};
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      body = Object.fromEntries((await request.formData()).entries());
    }

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const next = typeof body?.next === 'string' && body.next.startsWith('/') && !body.next.startsWith('//') ? body.next : '/admin';

    if (!email || !password) return errorResponse(request, 'missing_credentials', 'Email and password are required.', wantsJson);

    const response = wantsJson
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL(next, request.url), 303);
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('Vary', 'Cookie');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            if (headers) Object.entries(headers).forEach(([name, value]) => value && response.headers.set(name, value));
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.error('Website admin auth failed:', error?.message || 'No authenticated user');
      return errorResponse(request, 'invalid_credentials', 'Invalid email or password.', wantsJson);
    }

    const admin = createAdminClient();
    const { data: profile, error: profileLookupError } = await admin
      .from('profiles')
      .select('id, company_id, role, active, display_name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileLookupError) {
      console.error('Website admin profile lookup failed:', profileLookupError.message);
      return errorResponse(request, 'access_check_failed', 'Unable to verify admin access.', wantsJson);
    }
    if (!profile || profile.active === false || !WEBSITE_ADMIN_ROLES.has(profile.role)) return errorResponse(request, 'not_admin', 'You do not have Website Admin access.', wantsJson);
    if (!profile.company_id) return errorResponse(request, 'no_company', 'Your admin account is not linked to a company.', wantsJson);

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name, subscription_status')
      .eq('id', profile.company_id)
      .maybeSingle();

    if (companyError) {
      console.error('Website admin company lookup failed:', companyError.message);
      return errorResponse(request, 'company_check_failed', 'Unable to verify company access.', wantsJson);
    }
    if (!company) return errorResponse(request, 'no_company', 'Your admin account is linked to a missing company.', wantsJson);
    if (company.subscription_status && company.subscription_status !== 'active') return errorResponse(request, 'subscription_inactive', 'PinkBox website subscription is not active.', wantsJson);

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return errorResponse(request, 'server_error', 'Unable to sign in right now.', wantsJson);
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
