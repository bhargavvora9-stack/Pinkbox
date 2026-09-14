import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ayphefqdvrbldhwzhybe.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'REPLACE_WITH_ENV_KEY';
const WEBSITE_ADMIN_ROLES = new Set(['super_admin', 'admin']);
const TRANSIENT_ERRORS = /bad gateway|failed to get project config|fetch failed|network|timeout|temporarily unavailable|503|502/i;

function errorResponse(request, code, message, wantsJson) {
  if (wantsJson) {
    const status = code === 'invalid_credentials' ? 401 : ['not_admin', 'no_company', 'subscription_inactive'].includes(code) ? 403 : code === 'auth_service_unavailable' ? 503 : 500;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(operation, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    const result = await operation();
    if (!result?.error || !TRANSIENT_ERRORS.test(result.error.message || '')) return result;
    last = result;
    if (i < attempts - 1) await sleep(250 * (i + 1));
  }
  return last;
}

export async function POST(request) {
  let wantsJson = false;
  try {
    const contentType = request.headers.get('content-type') || '';
    const accept = request.headers.get('accept') || '';
    wantsJson = contentType.includes('application/json') || accept.includes('application/json');
    const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const requestedNext = typeof body?.next === 'string' ? body.next : '';
    const hasExplicitNext = requestedNext === '/admin' || requestedNext.startsWith('/admin/') || requestedNext === '/account' || requestedNext.startsWith('/account/');
    const requestedDestination = hasExplicitNext ? requestedNext : '';
    const isExplicitAdminDestination = requestedDestination === '/admin' || requestedDestination.startsWith('/admin/');

    if (!email || !password) return errorResponse(request, 'missing_credentials', 'Email and password are required.', wantsJson);

    const supabaseResponse = NextResponse.json({ ok: true });
    supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    supabaseResponse.headers.set('Vary', 'Cookie');
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
          if (headers) Object.entries(headers).forEach(([name, value]) => value && supabaseResponse.headers.set(name, value));
        },
      },
    });

    const authResult = await withRetry(() => supabase.auth.signInWithPassword({ email, password }));
    const { data, error } = authResult || {};
    if (error || !data?.user) {
      const message = error?.message || 'No authenticated user';
      console.error('Authentication failed:', message);
      if (TRANSIENT_ERRORS.test(message)) return errorResponse(request, 'auth_service_unavailable', 'Login service is temporarily unavailable. Please try again.', wantsJson);
      return errorResponse(request, 'invalid_credentials', 'Invalid email or password.', wantsJson);
    }

    let destination = requestedDestination || '/account';
    let profile = null;

    if (!hasExplicitNext || isExplicitAdminDestination) {
      const profileResult = await withRetry(() => supabase.from('profiles').select('id, company_id, role, active, display_name').eq('id', data.user.id).maybeSingle());
      if (profileResult?.error) {
        console.error('Profile lookup failed:', profileResult.error.message);
        if (isExplicitAdminDestination || TRANSIENT_ERRORS.test(profileResult.error.message || '')) {
          return errorResponse(request, 'access_check_failed', TRANSIENT_ERRORS.test(profileResult.error.message || '') ? 'Unable to reach the account service. Please try again.' : 'Unable to verify admin access.', wantsJson);
        }
      } else {
        profile = profileResult?.data || null;
      }
      if (!hasExplicitNext && profile && profile.active !== false && WEBSITE_ADMIN_ROLES.has(profile.role)) destination = '/admin';
    }

    const isAdminDestination = destination === '/admin' || destination.startsWith('/admin/');
    if (isAdminDestination) {
      if (!profile) {
        const profileResult = await withRetry(() => supabase.from('profiles').select('id, company_id, role, active, display_name').eq('id', data.user.id).maybeSingle());
        if (profileResult?.error) {
          console.error('Website admin profile lookup failed:', profileResult.error.message);
          return errorResponse(request, 'access_check_failed', TRANSIENT_ERRORS.test(profileResult.error.message || '') ? 'Unable to reach the account service. Please try again.' : 'Unable to verify admin access.', wantsJson);
        }
        profile = profileResult?.data || null;
      }
      if (!profile || profile.active === false || !WEBSITE_ADMIN_ROLES.has(profile.role)) return errorResponse(request, 'not_admin', 'You do not have Website Admin access.', wantsJson);
      if (!profile.company_id) return errorResponse(request, 'no_company', 'Your admin account is not linked to a company.', wantsJson);

      const companyResult = await withRetry(() => supabase.from('companies').select('id, name, subscription_status').eq('id', profile.company_id).maybeSingle());
      if (companyResult?.error) {
        console.error('Website admin company lookup failed:', companyResult.error.message);
        return errorResponse(request, TRANSIENT_ERRORS.test(companyResult.error.message || '') ? 'access_check_failed' : 'company_check_failed', TRANSIENT_ERRORS.test(companyResult.error.message || '') ? 'Unable to reach the account service. Please try again.' : 'Unable to verify company access.', wantsJson);
      }
      const company = companyResult?.data || null;
      if (!company) return errorResponse(request, 'no_company', 'Your admin account is linked to a missing company.', wantsJson);
      if (company.subscription_status && company.subscription_status !== 'active') return errorResponse(request, 'subscription_inactive', 'PinkBox website subscription is not active.', wantsJson);
    }

    if (wantsJson) {
      const response = NextResponse.json({ ok: true, destination });
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
      response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      response.headers.set('Vary', 'Cookie');
      return response;
    }

    const response = NextResponse.redirect(new URL(destination, request.url), 303);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return errorResponse(request, 'server_error', 'Unable to sign in right now. Please try again.', wantsJson);
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
