'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Tags, Boxes, Users, TicketPercent, Monitor, Truck, CreditCard, BarChart3, Bell, Settings, FileText, Image, Navigation, Palette, Search, ClipboardList, Layers, GitBranch, Star, Upload, BookOpen, Send, Shield, Workflow, HeartPulse, FileBarChart } from 'lucide-react';

const groups = [
  { label: 'HOME', items: [['/admin/dashboard', 'Dashboard', LayoutDashboard]] },
  { label: 'SALES', items: [['/admin/orders', 'Orders', ShoppingCart], ['/admin/abandoned-carts', 'Abandoned Carts', ShoppingCart]] },
  { label: 'CATALOG', items: [['/admin/products', 'Products', Package], ['/admin/products/import-export', 'Import / Export', Upload], ['/admin/products/categories', 'Product Categories', Tags], ['/admin/categories', 'Categories', Tags], ['/admin/brands', 'Brands', Layers], ['/admin/collections', 'Collections', Layers], ['/admin/products/collections', 'Product Collections', GitBranch], ['/admin/variants', 'Variants', GitBranch], ['/admin/inventory', 'Inventory', Boxes], ['/admin/reviews', 'Reviews', Star]] },
  { label: 'CUSTOMERS', items: [['/admin/customers', 'Customers', Users]] },
  { label: 'MARKETING', items: [['/admin/discounts', 'Discounts & Coupons', TicketPercent], ['/admin/campaigns', 'Campaigns', BarChart3], ['/admin/notifications', 'Notifications', Bell]] },
  { label: 'ONLINE STORE', items: [['/admin/homepage', 'Homepage', Monitor], ['/admin/banners', 'Banners', Image], ['/admin/pages', 'Pages', FileText], ['/admin/navigation', 'Navigation', Navigation], ['/admin/theme', 'Theme & Customize', Palette], ['/admin/seo', 'SEO', Search], ['/admin/blog', 'Blog', BookOpen], ['/admin/footer', 'Footer & Social', FileText]] },
  { label: 'OPERATIONS', items: [['/admin/shipping', 'Shipping', Truck], ['/admin/payments', 'Payments', CreditCard], ['/admin/notification-logs', 'Notification Logs', Send], ['/admin/automations', 'Automations', Workflow]] },
  { label: 'INSIGHTS', items: [['/admin/analytics', 'Analytics', BarChart3], ['/admin/reports', 'Reports', FileBarChart], ['/admin/system-health', 'System Health', HeartPulse]] },
  { label: 'CONFIGURATION', items: [['/admin/roles', 'Roles & Permissions', Shield], ['/admin/settings', 'Website Settings', Settings], ['/admin/audit-log', 'Audit Log', ClipboardList]] },
];

const active = (p, h) => p === h || p.startsWith(`${h}/`);

export default function WebsiteAdminNav() {
  const p = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-gray-500">{g.label}</div>
          <div className="space-y-1">
            {g.items.map(([h, l, I]) => (
              <Link key={h} href={h} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active(p, h) ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <I size={17} strokeWidth={1.8} />
                <span className="truncate">{l}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
