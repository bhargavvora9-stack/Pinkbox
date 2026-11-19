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
    <div className="website-admin min-h-screen bg-secondary/20">
      <header className="pb-admin-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex min-h-[68px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <WebsiteAdminNav mobile permissions={roleModules} />
            </div>
            {company.logo_url
              ? <img src={company.logo_url} alt="PinkBox logo" className="h-10 w-10 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
              : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">PB</div>}
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Store management</div>
              <div className="truncate font-display text-lg font-semibold leading-tight text-foreground">{company.name || 'PinkBox'} <span className="font-sans text-xs font-medium text-muted-foreground">Admin</span></div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block"><AdminExcelTableFilters /></div>
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">View Website ↗</a>
            <div className="hidden lg:block"><LogoutButton /></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-8">
        <aside className="pb-admin-navigation min-w-0 rounded-2xl border border-border bg-card p-2 shadow-sm md:sticky md:top-[92px] md:max-h-[calc(100vh-116px)] md:w-56 md:shrink-0 md:overflow-y-auto">
          <WebsiteAdminNav permissions={roleModules} />
          <div className="mt-3 border-t border-border px-3 pt-3 lg:hidden">
            <div className="mb-2 truncate text-xs text-muted-foreground">{profile.display_name || user.email}</div>
            <LogoutButton />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
