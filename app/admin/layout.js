import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { getWebsiteRolePermissions } from '@/lib/website-admin';
import LogoutButton from '@/components/LogoutButton';
import WebsiteAdminNav from '@/components/WebsiteAdminNav';
import AdminExcelTableFilters from '@/components/AdminExcelTableFilters';

export const metadata = { title: 'Admin — Pink Box', robots: { index: false, follow: false, nocache: true } };
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
  const permissions = roleAccess?.modules || null;
  if (!isAdministrator && (!permissions || !Object.values(permissions).some((item) => item?.view === true))) {
    redirect('/login?error=no_admin_role');
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('name, logo_url, subscription_status')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (companyError || !company || (company.subscription_status && company.subscription_status !== 'active')) {
    redirect('/login?error=company_access');
  }

  const navPermissions = isAdministrator ? null : permissions;

  return (
    <div className="website-admin min-h-screen bg-secondary/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-display text-lg font-semibold text-foreground">Pink Box admin</Link>
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <WebsiteAdminNav mobile permissions={navPermissions} />
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 md:flex-row md:items-start">
        <aside className="hidden md:sticky md:top-[88px] md:flex md:h-[calc(100vh-112px)] md:w-[285px] md:shrink-0 md:flex-col md:overflow-hidden md:rounded-2xl md:border md:border-white/10 md:bg-[#111116] md:shadow-xl">
          <WebsiteAdminNav permissions={navPermissions} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <AdminExcelTableFilters />
    </div>
  );
}
