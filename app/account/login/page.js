import {redirect} from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountLoginPage({searchParams}) {
  const params = await searchParams;
  const requestedNext = typeof params?.next === 'string' ? params.next : '/account';
  const next = requestedNext === '/admin' || requestedNext.startsWith('/admin/')
    ? requestedNext
    : '/account';

  redirect(`/login?next=${encodeURIComponent(next)}`);
}
