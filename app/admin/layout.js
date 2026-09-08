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

  if (profileError || !profile || profile.active === false || !['super_admin', 'admin'].includes(profile.role)) {
    redirect('/login?error=not_admin');
  }
  if (!profile.company_id) redirect('/login?error=no_company');

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('name, logo_url, subscription_status')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (companyError || !company || (company.subscription_status && company.subscription_status !== 'active')) {
    redirect('/login?error=company_access');
  }

  return (
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
  );
}
