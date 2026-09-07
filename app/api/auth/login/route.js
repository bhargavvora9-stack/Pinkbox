import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

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

    // Bootstrap the first Website Admin profile from the active 24Care website.
    const admin = createAdminClient();
    const { data: website } = await admin
      .from('website_settings')
      .select('company_id')
      .eq('slug', '24care')
      .eq('status', 'active')
      .maybeSingle();

    if (website?.company_id) {
      const { error: profileError } = await admin.from('profiles').upsert(
        {
          id: data.user.id,
          company_id: website.company_id,
          role: 'super_admin',
          active: true,
          display_name: data.user.user_metadata?.full_name || email.split('@')[0],
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.error('Website admin profile bootstrap failed:', profileError.message);
        return NextResponse.json({ error: 'Login succeeded, but admin access could not be initialized.' }, { status: 500 });
      }
    }

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
