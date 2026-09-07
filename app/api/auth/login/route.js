import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const WEBSITE_ADMIN_ROLES = new Set(['super_admin', 'admin']);

function redirectWithError(request, code) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', code);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export async function POST(request) {
  let response;

  try {
    const contentType = request.headers.get('content-type') || '';
    let body = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const next = typeof body?.next === 'string' && body.next.startsWith('/') ? body.next : '/admin';

    if (!email || !password) return redirectWithError(request, 'missing_credentials');

    // The same response object must receive every Supabase auth cookie and
    // response header. The browser then follows this response's 303 redirect.
    response = NextResponse.redirect(new URL(next, request.url), 303);
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
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
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
            if (headers) {
              Object.entries(headers).forEach(([name, value]) => {
                if (value) response.headers.set(name, value);
              });
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.error('Website admin auth failed:', error?.message || 'No authenticated user');
      return redirectWithError(request, 'invalid_credentials');
    }

    const admin = createAdminClient();
    const { data: profile, error: profileLookupError } = await admin
      .from('profiles')
      .select('id, company_id, role, active, display_name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileLookupError) {
      console.error('Website admin profile lookup failed:', profileLookupError.message);
      return redirectWithError(request, 'access_check_failed');
    }

    if (!profile || profile.active === false || !WEBSITE_ADMIN_ROLES.has(profile.role)) {
      return redirectWithError(request, 'not_admin');
    }

    if (!profile.company_id) {
      return redirectWithError(request, 'no_company');
    }

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name, subscription_status')
      .eq('id', profile.company_id)
      .maybeSingle();

    if (companyError) {
      console.error('Website admin company lookup failed:', companyError.message);
      return redirectWithError(request, 'company_check_failed');
    }

    if (!company) return redirectWithError(request, 'no_company');

    if (company.subscription_status && company.subscription_status !== 'active') {
      return redirectWithError(request, 'subscription_inactive');
    }

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return redirectWithError(request, 'server_error');
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
