import Link from 'next/link';

const ERROR_MESSAGES = {
  missing_credentials: 'Email and password are required.',
  invalid_credentials: 'Invalid email or password.',
  not_admin: 'You do not have Website Admin access.',
  no_company: 'Your admin account is not linked to a company.',
  subscription_inactive: 'PinkBox website subscription is not active.',
  access_check_failed: 'Unable to verify admin access. Please try again.',
  company_check_failed: 'Unable to verify company access. Please try again.',
  server_error: 'Unable to sign in right now. Please try again.',
};

export const metadata = {
  title: 'PinkBox Admin Login',
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const errorCode = typeof params?.error === 'string' ? params.error : '';
  const error = ERROR_MESSAGES[errorCode] || '';
  const next = typeof params?.next === 'string' && params.next.startsWith('/') ? params.next : '/admin';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <form
        action="/api/auth/login"
        method="post"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 text-white shadow-2xl"
      >
        <h1 className="text-2xl font-bold">PinkBox</h1>
        <p className="mb-6 mt-1 text-sm text-gray-400">Website Admin Login</p>

        {error && (
          <div role="alert" aria-live="polite" className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm" htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          name="email"
          required
          type="email"
          autoComplete="email"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none focus:border-pink-400"
        />

        <label className="mb-1 block text-sm" htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          name="password"
          required
          type="password"
          autoComplete="current-password"
          className="mb-5 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none focus:border-pink-400"
        />

        <input type="hidden" name="next" value={next} />

        <button
          type="submit"
          className="w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-gray-900 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          Sign in
        </button>

        <Link href="/" className="mt-4 block text-center text-xs text-gray-500 hover:text-gray-300">
          Back to website
        </Link>
      </form>
    </main>
  );
}
