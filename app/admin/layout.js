import { redirect } from 'next/navigation';
import { getWebsiteAdminContext } from '@/lib/website-admin';
import WebsiteAdminNav from '@/components/WebsiteAdminNav';
import LogoutButton from '@/components/LogoutButton';
import '../website/website-theme.css';

export const metadata = { title: 'PinkBox Admin', robots: { index: false, follow: false, nocache: true } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }) {
  const { user, profile, company, error } = await getWebsiteAdminContext();

  if (error === 'UNAUTHENTICATED') redirect('/login');
  if (error === 'NOT_ADMIN') redirect('/login?error=not_admin');
  if (error === 'NO_COMPANY') redirect('/login?error=no_company');
  if (error === 'SUBSCRIPTION_INACTIVE') redirect('/login?error=subscription_inactive');
  if (error === 'COMPANY_ACCESS') redirect('/login?error=company_check_failed');
  if (!user || !profile || !company) redirect('/login?error=server_error');

  return (
    <>
      <style>{`
        .website-admin .glass-sidebar { width: 14rem; }
        .website-admin .glass-sidebar nav { padding: .625rem .5rem; }
        .website-admin .glass-sidebar nav > div { margin-bottom: .875rem; }
        .website-admin .glass-sidebar nav a { gap: .625rem; border-radius: .5rem; padding: .45rem .6rem; font-size: 13px; line-height: 1.25rem; }
        .website-admin .glass-sidebar nav a svg { width: 15px; height: 15px; }
        .website-admin main { zoom: .82; }
        .website-admin main > * { max-width: 1400px; }
      `}</style>
      <div className="website-admin glass-shell flex min-h-screen">
        <aside className="hidden md:flex w-56 shrink-0 glass-sidebar flex-col">
          <div className="border-b border-white/10 px-3 py-3">
            <div className="flex items-center gap-2.5">
              {company.logo_url ? <img src={company.logo_url} alt="logo" className="h-8 w-8 rounded-lg bg-white object-contain" /> : <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 text-xs font-bold text-white">PB</div>}
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider text-gray-500">Admin Panel</div>
                <div className="truncate text-sm font-semibold text-white">{company.name || 'PinkBox'}</div>
              </div>
            </div>
          </div>
          <WebsiteAdminNav />
          <div className="border-t border-white/10 px-3 py-3">
            <div className="mb-2 truncate text-xs text-gray-300">{profile.display_name || user.email}</div>
            <LogoutButton />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-black/20 px-3 backdrop-blur-xl sm:px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 text-[11px] font-bold text-white md:hidden">PB</div>
              <div><div className="text-[11px] text-gray-500">Online Store</div><div className="text-xs font-semibold text-white">PinkBox Admin</div></div>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-gray-200 transition hover:bg-white/10 hover:text-white">View Website ↗</a>
          </header>
          <main className="min-w-0 flex-1 p-3 pb-6 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
