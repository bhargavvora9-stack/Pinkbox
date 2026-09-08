import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import WebsiteAdminNav from '@/components/WebsiteAdminNav';
import LogoutButton from '@/components/LogoutButton';
import '../website/website-theme.css';

export const metadata = { title: 'PinkBox Admin', robots: { index: false, follow: false, nocache: true } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, role, active, company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.active === false || !['super_admin', 'admin'].includes(profile.role)) redirect('/login?error=not_admin');
  if (!profile.company_id) redirect('/login?error=no_company');

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('name, logo_url, subscription_status')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (companyError || !company || (company.subscription_status && company.subscription_status !== 'active')) redirect('/login?error=company_access');

  return (
    <>
      <style>{`\n        .website-admin .glass-sidebar { width: 9rem !important; }\n        .website-admin .glass-sidebar nav { padding: .3rem .25rem; }\n        .website-admin .glass-sidebar nav > div { margin-bottom: .45rem; }\n        .website-admin .glass-sidebar nav > div > div:first-child { padding: 0 .35rem .18rem; font-size: 8px; line-height: .8rem; letter-spacing: .1em; }\n        .website-admin .glass-sidebar nav a { gap: .35rem; border-radius: .35rem; padding: .28rem .35rem; font-size: 10px; line-height: 1rem; }\n        .website-admin .glass-sidebar nav a svg { width: 12px; height: 12px; flex: 0 0 12px; }\n        .website-admin .glass-sidebar nav a span { min-width: 0; }\n        .website-admin main > * { max-width: 1400px; }\n      `}</style>
      <div className="website-admin glass-shell flex min-h-screen">
        <aside className="hidden md:flex w-36 shrink-0 glass-sidebar flex-col">
          <div className="border-b border-white/10 px-2 py-2">
            <div className="flex items-center gap-1.5">
              {company.logo_url ? <img src={company.logo_url} alt="logo" className="h-6 w-6 rounded-md bg-white object-contain" /> : <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-fuchsia-500 text-[9px] font-bold text-white">PB</div>}
              <div className="min-w-0">
                <div className="text-[7px] uppercase tracking-wider text-gray-500">Admin</div>
                <div className="truncate text-[10px] font-semibold text-white">{company.name || 'PinkBox'}</div>
              </div>
            </div>
          </div>
          <WebsiteAdminNav />
          <div className="border-t border-white/10 px-2 py-2">
            <div className="mb-1 truncate text-[9px] text-gray-300">{profile.display_name || user.email}</div>
            <LogoutButton />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-white/10 bg-black/20 px-2 backdrop-blur-xl sm:px-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-fuchsia-500 text-[9px] font-bold text-white md:hidden">PB</div>
              <div><div className="text-[9px] text-gray-500">Online Store</div><div className="text-[10px] font-semibold text-white">PinkBox Admin</div></div>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium text-gray-200 transition hover:bg-white/10 hover:text-white">View Website ↗</a>
          </header>
          <main className="min-w-0 flex-1 p-2 pb-3 sm:p-3 lg:p-4">{children}</main>
        </div>
      </div>
    </>
  );
}