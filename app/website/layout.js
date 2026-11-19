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
    <div className="website-admin min-h-screen bg-secondary/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex min-h-[68px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            {company.logo_url
              ? <img src={company.logo_url} alt="PinkBox logo" className="h-10 w-10 rounded-xl border border-border bg-white object-contain p-1" />
              : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">PB</div>}
            <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Website management</div><div className="font-display text-lg font-semibold text-foreground">{company.name || 'PinkBox'} <span className="font-sans text-xs font-medium text-muted-foreground">Website</span></div></div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary">View Storefront ↗</a>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="container mx-auto flex flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-8">
        <aside className="pb-admin-navigation min-w-0 rounded-2xl border border-border bg-card p-2 shadow-sm md:sticky md:top-[92px] md:max-h-[calc(100vh-116px)] md:w-56 md:shrink-0 md:overflow-y-auto">
          <WebsiteAdminNav />
          <div className="mt-3 border-t border-border px-3 pt-3">
            <div className="mb-2 truncate text-xs text-muted-foreground">{profile.display_name || user.email}</div>
            <LogoutButton />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
