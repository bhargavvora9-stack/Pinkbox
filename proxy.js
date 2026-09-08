import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ayphefqdvrbldhwzhybe.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Ql0ABtOzHqN96WvjMRomEQ_r_2CNjAh';

export async function proxy(request) {
  const path = request.nextUrl.pathname;

  if (path === '/Admin' || path.startsWith('/Admin/')) {
    const url = request.nextUrl.clone();
    url.pathname = path.replace(/^\/Admin/, '/admin');
    return NextResponse.redirect(url);
  }

  if (path === '/Login' || path.startsWith('/Login/')) {
    const url = request.nextUrl.clone();
    url.pathname = path.replace(/^\/Login/, '/login');
    return NextResponse.redirect(url);
  }

  if (path === '/login') {
    const response = NextResponse.next({ request });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('Vary', 'Cookie');
    return response;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value, options));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) {
          Object.entries(headers).forEach(([name, value]) => {
            if (value) response.headers.set(name, value);
          });
        }
      },
    },
  });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? claimsData.claims : null;

  if (claimsError) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  }

  if (!user && (
    path.startsWith('/admin') ||
    path.startsWith('/website') ||
    path.startsWith('/api/website')
  )) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('error', 'session_expired');
    const redirect = NextResponse.redirect(url);
    redirect.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    return redirect;
  }

  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  response.headers.set('Vary', 'Cookie');
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/Admin/:path*',
    '/website/:path*',
    '/api/website/:path*',
    '/login',
    '/Login',
  ],
};
