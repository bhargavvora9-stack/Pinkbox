import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { getWebsiteRolePermissions } from '@/lib/website-admin';
import LogoutButton from '@/components/LogoutButton';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', module: 'dashboard' },
  { href: '/admin/orders', label: 'Orders', module: 'orders' },
  { href: '/admin/banners', label: 'Banners', module: 'banners' },
  { href: '/admin/blog', label: 'Blog', module: 'blog' },
  { href: '/admin/discounts', label: 'Coupons', module: 'discounts' },
  { href: '/admin/b2b-enquiries', label: 'Leads', module: 'b2b_enquiries' },
  { href: '/admin/subscribers', label: 'Subscribers', module: 'notifications' },
  { href: '/admin/notifications', label: 'WhatsApp', module: 'notifications' },
  { href: '/admin/reviews', label: 'Reviews', module: 'reviews' },
  { href: '/admin/settings', label: 'Site settings', module: 'settings' },
];

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

  const visibleNav = isAdministrator ? NAV : NAV.filter((item) => permissions[item.module]?.view === true);

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-display text-lg font-semibold text-foreground">Pink Box admin</Link>
          <LogoutButton />
        </div>
      </header>
      <div className="container mx-auto flex flex-col gap-8 px-4 py-8 md:flex-row">
        <nav className="flex flex-wrap gap-1 md:w-52 md:flex-col">
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
