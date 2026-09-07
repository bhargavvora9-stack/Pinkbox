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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && (
    path.startsWith('/admin') ||
    path.startsWith('/website') ||
    path.startsWith('/api/website')
  )) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
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
