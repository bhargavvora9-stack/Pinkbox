import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const WEBSITE_ADMIN_ROLES = new Set(['super_admin', 'admin']);

export async function POST(request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Keep the auth session on this exact response so the browser receives the
    // SSR cookies produced by signInWithPassword.
    const response = NextResponse.json({ ok: true });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.error('Website admin auth failed:', error?.message || 'No authenticated user');
      return NextResponse.json({ error: error?.message || 'Invalid email or password.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error: profileLookupError } = await admin
      .from('profiles')
      .select('id, company_id, role, active, display_name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileLookupError) {
      console.error('Website admin profile lookup failed:', profileLookupError.message);
      return NextResponse.json({ error: 'Unable to verify admin access.' }, { status: 500 });
    }

    if (!profile || profile.active === false || !WEBSITE_ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'You do not have Website Admin access.' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ error: 'Your admin account is not linked to a company.' }, { status: 403 });
    }

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name, subscription_status')
      .eq('id', profile.company_id)
      .maybeSingle();

    if (companyError) {
      console.error('Website admin company lookup failed:', companyError.message);
      return NextResponse.json({ error: 'Unable to verify company access.' }, { status: 500 });
    }

    if (!company) {
      return NextResponse.json({ error: 'Your admin account is linked to a missing company.' }, { status: 403 });
    }

    if (company.subscription_status && company.subscription_status !== 'active') {
      return NextResponse.json({ error: 'PinkBox website subscription is not active.' }, { status: 403 });
    }

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: error?.message || 'Unable to sign in right now.' }, { status: 500 });
  }
}
