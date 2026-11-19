import Link from 'next/link';
import { headers } from 'next/headers';
import { Flower2 } from 'lucide-react';

const ERROR_MESSAGES = {
  missing_credentials: 'Email and password are required.',
  invalid_credentials: 'Invalid email or password.',
  auth_service_unavailable: 'Login service is temporarily unavailable. Please try again.',
  not_admin: 'You do not have Website Admin access.',
  no_company: 'Your admin account is not linked to a company.',
  subscription_inactive: 'PinkBox website subscription is not active.',
  access_check_failed: 'Unable to verify admin access. Please try again.',
  company_check_failed: 'Unable to verify company access. Please try again.',
  server_error: 'Unable to sign in right now. Please try again.',
};

export const metadata = {
  title: 'PinkBox Login',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LoginPage({ searchParams }) {
  await headers();
  const params = await searchParams;
  const errorCode = typeof params?.error === 'string' ? params.error : '';
  const error = ERROR_MESSAGES[errorCode] || '';
  const requestedNext = typeof params?.next === 'string' ? params.next : '';
  const next = requestedNext === '/admin' || requestedNext.startsWith('/admin/') || requestedNext === '/account' || requestedNext.startsWith('/account/')
    ? requestedNext
    : '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
      <form action="/api/auth/login" method="post" className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-soft">
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-primary">← Pink Box</Link>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5"/></span>
          <div><h1 className="font-display text-2xl font-semibold text-foreground">Admin sign in</h1><p className="mt-1 text-sm text-muted-foreground">Sign in to manage the Pink Box store content.</p></div>
        </div>
        {error && <div role="alert" aria-live="polite" className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="login-email">Email</label>
          <input id="login-email" name="email" required type="email" autoComplete="email" className="mb-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="login-password">Password</label>
          <input id="login-password" name="password" required type="password" autoComplete="current-password" className="mb-5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
          {next && <input type="hidden" name="next" value={next} />}
          <button type="submit" className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring">Sign in</button>
        </div>
        <Link href="/" className="mt-4 block text-center text-xs text-muted-foreground transition-colors hover:text-primary">Back to website</Link>
      </form>
    </main>
  );
}
