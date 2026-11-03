'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Boxes, Users, TicketPercent,
  Truck, CreditCard, BarChart3, Bell, Settings, FileText, Image, Navigation,
  Palette, Search, ClipboardList, Layers, GitBranch, Star, Upload, BookOpen,
  Send, Shield, Workflow, HeartPulse, FileBarChart, WandSparkles,
  SlidersHorizontal, ListChecks, Menu, X, ChevronDown, PhoneCall
} from 'lucide-react';

const groups = [
  { label: 'OVERVIEW', items: [['/admin/dashboard', 'Dashboard', LayoutDashboard]] },
  { label: 'SALES & CUSTOMERS', items: [
    ['/admin/orders', 'Orders', ShoppingCart],
    ['/admin/invoices', 'Invoices', FileText],
    ['/admin/abandoned-carts', 'Abandoned Carts', ShoppingCart],
    ['/admin/customers', 'Customers', Users],
    ['/admin/b2b-enquiries', 'B2B Enquiries', PhoneCall],
  ] },
  { label: 'PRODUCT CATALOG', items: [
    ['/admin/products', 'All Products', Package],
    ['/admin/products/bulk-edit', 'Bulk Edit', ListChecks],
    ['/admin/products/import-export', 'Import / Export', Upload],
    ['/admin/images', 'Product Images', Image],
    ['/admin/categories', 'Category Manager', Tags],
    ['/admin/products/categories', 'Product Mapping', GitBranch],
    ['/admin/brands', 'Brands', Layers],
    ['/admin/collections', 'Collections', Layers],
    ['/admin/products/collections', 'Collection Mapping', GitBranch],
    ['/admin/variants', 'Variants', GitBranch],
    ['/admin/inventory', 'Inventory & Stock', Boxes],
    ['/admin/reviews', 'Product Reviews', Star],
  ] },
  { label: 'MARKETING', items: [
    ['/admin/discounts', 'Discounts & Coupons', TicketPercent],
    ['/admin/campaigns', 'Campaigns', BarChart3],
    ['/admin/notifications', 'Notifications', Bell],
    ['/admin/notification-logs', 'Notification History', Send],
  ] },
  { label: 'WEBSITE CONTENT', items: [
    ['/admin/homepage', 'Homepage Builder', SlidersHorizontal],
    ['/admin/banners', 'Banners', Image],
    ['/admin/pages', 'Pages', FileText],
    ['/admin/navigation', 'Menus & Navigation', Navigation],
    ['/admin/design', 'Design Studio', WandSparkles],
    ['/admin/theme', 'Theme & Customize', Palette],
    ['/admin/seo', 'SEO Settings', Search],
    ['/admin/blog', 'Blog & Journal', BookOpen],
    ['/admin/footer', 'Footer & Social', FileText],
  ] },
  { label: 'FULFILMENT & PAYMENTS', items: [
    ['/admin/shipping', 'Shipping', Truck],
    ['/admin/payments', 'Payments', CreditCard],
    ['/admin/automations', 'Automations', Workflow],
  ] },
  { label: 'REPORTS & SYSTEM', items: [
    ['/admin/analytics', 'Analytics', BarChart3],
    ['/admin/reports', 'Reports', FileBarChart],
    ['/admin/system-health', 'System Health', HeartPulse],
    ['/admin/audit-log', 'Activity Log', ClipboardList],
  ] },
  { label: 'ADMIN SETTINGS', items: [
    ['/admin/roles', 'Roles & Permissions', Shield],
    ['/admin/settings', 'Store Settings', Settings],
  ] },
];

function isItemActive(pathname, href) {
  if (href === '/admin/products') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationList({ pathname, query, onNavigate }) {
  const visibleGroups = useMemo(() => groups.map(group => ({
    ...group,
    items: group.items.filter(([, label]) =>
      !query || `${group.label} ${label}`.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter(group => group.items.length), [query]);

  const activeGroup = groups.find(group => group.items.some(([href]) => isItemActive(pathname, href)))?.label;
  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroup ? [activeGroup] : ['OVERVIEW', 'SALES & CUSTOMERS', 'PRODUCT CATALOG']));

  useEffect(() => {
    if (activeGroup) setOpenGroups(current => new Set([...current, activeGroup]));
  }, [activeGroup]);

  return (
    <div className="space-y-2">
      {visibleGroups.map(group => {
        const expanded = Boolean(query) || openGroups.has(group.label);
        const hasActive = group.items.some(([href]) => isItemActive(pathname, href));
        return (
          <section key={group.label} className="rounded-xl">
            <button
              type="button"
              onClick={() => setOpenGroups(current => {
                const next = new Set(current);
                next.has(group.label) ? next.delete(group.label) : next.add(group.label);
                return next;
              })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-bold tracking-[0.14em] transition ${hasActive ? 'text-pink-300' : 'text-gray-500 hover:text-gray-300'}`}
              aria-expanded={expanded}
            >
              <span>{group.label}</span>
              <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div className="space-y-1 px-1 pb-1">
                {group.items.map(([href, label, Icon]) => {
                  const active = isItemActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? 'bg-pink-500/15 text-white ring-1 ring-pink-400/25' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      <span className="min-w-0 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {!visibleGroups.length && <p className="px-3 py-6 text-center text-xs text-gray-500">No menu items found.</p>}
    </div>
  );
}

export default function WebsiteAdminNav({ mobile = false }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  if (mobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-100 md:hidden"
        >
          <Menu size={18} />
        </button>
        {drawerOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <button type="button" aria-label="Close admin menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,330px)] flex-col border-r border-white/10 bg-[#111116] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-300">PinkBox</div><div className="mt-0.5 text-sm font-semibold text-white">Admin Menu</div></div>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18}/></button>
              </div>
              <div className="border-b border-white/10 p-3">
                <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a menu..." className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-pink-400/50"/></div>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3"><NavigationList pathname={pathname} query={query} onNavigate={() => setDrawerOpen(false)}/></nav>
            </aside>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="border-b border-white/10 p-3">
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search admin menu..." className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-pink-400/50"/></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3"><NavigationList pathname={pathname} query={query}/></nav>
    </>
  );
}
