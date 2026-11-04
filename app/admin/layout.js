import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import WebsiteAdminNav from '@/components/WebsiteAdminNav';
import LogoutButton from '@/components/LogoutButton';
import AdminExcelTableFilters from '@/components/AdminExcelTableFilters';
import { getWebsiteRolePermissions } from '@/lib/website-admin';
import '../website/website-theme.css';
import '../responsive-layout.css';

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

  if (profileError || !profile || profile.active === false) redirect('/login?error=not_admin');
  if (!profile.company_id) redirect('/login?error=no_company');
  const isAdministrator = ['super_admin', 'admin'].includes(profile.role);
  const roleAccess = isAdministrator ? null : await getWebsiteRolePermissions(supabase, profile.company_id, user.id);
  if (!isAdministrator && (!roleAccess || !Object.values(roleAccess.modules || {}).some(permission => permission?.view === true))) {
    redirect('/login?error=no_admin_role');
  }
  const roleModules = roleAccess?.modules || null;

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('name, logo_url, subscription_status')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (companyError || !company || (company.subscription_status && company.subscription_status !== 'active')) {
    redirect('/login?error=company_access');
  }

  return (
    <>
      <style>{`
        .website-admin .glass-sidebar { width: 15.5rem; }
        .website-admin .glass-sidebar nav { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.16) transparent; }
        .website-admin main > * { max-width: 1400px; }
        .website-admin .admin-content-heading { letter-spacing: -.025em; }
        @media (width <= 1023px) {
          .website-admin .glass-sidebar { width: 14rem; }
        }
        @media (width <= 767px) {
          .website-admin main > * { max-width: 100%; }
        }
      `}</style>
      <div className="website-admin glass-shell flex min-h-screen">
        <aside className="hidden md:flex w-56 shrink-0 glass-sidebar flex-col border-r border-white/10">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-3">
              {company.logo_url ? <img src={company.logo_url} alt="PinkBox logo" className="h-9 w-9 rounded-xl bg-white object-contain p-1" /> : <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-xs font-bold text-white">PB</div>}
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-pink-300">Store Management</div>
                <div className="truncate text-sm font-semibold text-white">{company.name || 'PinkBox'}</div>
              </div>
            </div>
          </div>
          <WebsiteAdminNav permissions={roleModules} />
          <div className="border-t border-white/10 px-4 py-3">
            <div className="mb-2 truncate text-xs text-gray-300">{profile.display_name || user.email}</div>
            <LogoutButton />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#111116]/90 px-3 backdrop-blur-xl sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <WebsiteAdminNav mobile permissions={roleModules} />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 text-[11px] font-bold text-white md:hidden">PB</div>
              <div className="min-w-0"><div className="text-[10px] uppercase tracking-wider text-gray-500">Store Management</div><div className="truncate text-sm font-semibold text-white">PinkBox Admin</div></div>
            </div>
            <div className="flex shrink-0 items-center gap-2"><AdminExcelTableFilters/><a href="/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white">Website ↗</a></div>
          </header>
          <main className="min-w-0 flex-1 p-3 pb-6 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
