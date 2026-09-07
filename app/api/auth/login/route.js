import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const WEBSITE_ADMIN_ROLES = new Set(['super_admin', 'admin']);

function getBootstrapAdminEmails() {
  return new Set(
    String(process.env.WEBSITE_ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: website } = await admin
      .from('website_settings')
      .select('company_id')
      .eq('slug', '24care')
      .eq('status', 'active')
      .maybeSingle();

    if (!website?.company_id) {
      return NextResponse.json({ error: 'Website admin is not configured.' }, { status: 403 });
    }

    const { data: profile, error: profileLookupError } = await admin
      .from('profiles')
      .select('id, company_id, role, active, display_name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileLookupError) {
      console.error('Website admin profile lookup failed:', profileLookupError.message);
      return NextResponse.json({ error: 'Unable to verify admin access.' }, { status: 500 });
    }

    if (profile) {
      if (
        profile.company_id !== website.company_id ||
        profile.active === false ||
        !WEBSITE_ADMIN_ROLES.has(profile.role)
      ) {
        return NextResponse.json({ error: 'You do not have Website Admin access.' }, { status: 403 });
      }

      return response;
    }

    // A new Website Admin may only be bootstrapped when their email is explicitly
    // allowlisted in the server-only WEBSITE_ADMIN_EMAILS environment variable.
    if (!getBootstrapAdminEmails().has(email)) {
      return NextResponse.json({ error: 'You do not have Website Admin access.' }, { status: 403 });
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: data.user.id,
      company_id: website.company_id,
      role: 'super_admin',
      active: true,
      display_name: data.user.user_metadata?.full_name || email.split('@')[0],
    });

    if (profileError) {
      console.error('Website admin profile bootstrap failed:', profileError.message);
      return NextResponse.json({ error: 'Login succeeded, but admin access could not be initialized.' }, { status: 500 });
    }

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
