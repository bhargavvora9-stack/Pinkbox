import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

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

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          if (headers) {
            Object.entries(headers).forEach(([name, value]) => {
              if (value) response.headers.set(name, value);
            });
          }
        },
      },
    }
  );

  // Supabase SSR uses getClaims() to verify the session and refresh cookies.
  // Do not create another response after this call; the response above carries
  // any refreshed auth cookies back to the browser.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? claimsData.claims : null;

  if (!user && (
    path.startsWith('/admin') ||
    path.startsWith('/website') ||
    path.startsWith('/api/website')
  )) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirect = NextResponse.redirect(url);
    redirect.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return redirect;
  }

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
