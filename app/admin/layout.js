import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Flower2 } from 'lucide-react';
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
    <div className="website-admin min-h-screen">
      <header className="pb-admin-header border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <WebsiteAdminNav mobile permissions={roleModules} />
            {company.logo_url
              ? <img src={company.logo_url} alt="PinkBox logo" className="h-10 w-10 shrink-0 rounded-full border border-border bg-card p-1 object-contain" />
              : <span className="pb-admin-brand-mark h-10 w-10 shrink-0"><Flower2 size={21}/></span>}
            <div className="min-w-0">
              <Link href="/admin/dashboard" className="block truncate font-display text-xl font-semibold text-foreground">Pink Box <span className="text-primary">Admin</span></Link>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{company.name || 'Store management'} · {profile.display_name || user.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden md:block"><AdminExcelTableFilters/></div>
            <Link href="/" target="_blank" rel="noreferrer" className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">Website ↗</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-6 md:py-8">
        <nav className="pb-admin-navigation flex min-w-0 flex-wrap gap-1 md:w-52 md:shrink-0 md:flex-col">
          <div className="hidden px-3 pb-2 pt-1 md:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Store management</p>
          </div>
          <WebsiteAdminNav permissions={roleModules} />
        </nav>
        <main className="min-w-0 flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
