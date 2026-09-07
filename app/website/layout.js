import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import WebsiteAdminNav from '@/components/WebsiteAdminNav';
import LogoutButton from '@/components/LogoutButton';
import './website-theme.css';

export const metadata = { title: 'PinkBox Website Admin', robots: { index: false, follow: false, nocache: true } };

export default async function WebsiteAdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, role, active, company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.active) redirect('/login');

  let company = null;
  if (profile.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('name, logo_url, subscription_status')
      .eq('id', profile.company_id)
      .maybeSingle();
    company = data || null;
  }

  if (!company) redirect('/login');

  return (
    <div className="website-admin glass-shell flex min-h-screen">
      <aside className="hidden md:flex w-64 shrink-0 glass-sidebar flex-col">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            {company.logo_url ? <img src={company.logo_url} alt="logo" className="h-9 w-9 rounded-lg bg-white object-contain" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 text-sm font-bold text-white">PB</div>}
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Website Admin</div>
              <div className="truncate font-semibold text-white">{company.name || 'PinkBox'}</div>
            </div>
          </div>
        </div>
        <WebsiteAdminNav />
        <div className="border-t border-white/10 p-4">
          <div className="mb-2 truncate text-sm text-gray-300">{profile.display_name}</div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/20 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-xs font-bold text-white md:hidden">PB</div>
            <div><div className="text-xs text-gray-500">Online Store</div><div className="text-sm font-semibold text-white">PinkBox Admin</div></div>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 transition hover:bg-white/10 hover:text-white">View Website ↗</a>
        </header>
        <main className="min-w-0 flex-1 p-4 pb-8 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
