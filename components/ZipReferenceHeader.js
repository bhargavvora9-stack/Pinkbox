'use client';
import { useEffect, useState } from 'react';
const EMPTY_SETTINGS = Object.freeze({});
import Link from 'next/link';
import Image from 'next/image';
import { Flower2, Menu, X, Phone, ChevronDown } from 'lucide-react';
import ZipReferenceCartDrawer from '@/components/ZipReferenceCartDrawer';
const NAV = [
  { label: 'Home', href: '/#top' },{ label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },{ label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },{ label: 'Contact', href: '/#contact' },
];
const CORE_COLLECTION_NAV = [
  { label: 'Sanitary Pads', href: '/collections/sanitary-pads' },
  { label: 'Baby Diapers', href: '/collections/baby-diapers' },
  { label: 'Bags', href: '/collections/bags' },
];

function withShopDropdown(items) {
  const currentItems = Array.isArray(items) ? items : [];
  const collectionHrefs = new Set(CORE_COLLECTION_NAV.map((item) => item.href));
  const separateCollections = currentItems.filter((item) =>
    collectionHrefs.has(String(item?.href || item?.url || '').trim()),
  );
  const topLevelItems = currentItems.filter((item) =>
    !collectionHrefs.has(String(item?.href || item?.url || '').trim()),
  );
  const shopIndex = topLevelItems.findIndex(
    (item) => String(item?.href || item?.url || '').trim() === '/shop',
  );

  if (shopIndex < 0) {
    const homeIndex = topLevelItems.findIndex((item) =>
      ['/', '/#top'].includes(String(item?.href || item?.url || '').trim()),
    );
    topLevelItems.splice(homeIndex >= 0 ? homeIndex + 1 : topLevelItems.length, 0, {
      label: 'Shop',
      href: '/shop',
    });
  }

  const resolvedShopIndex = topLevelItems.findIndex(
    (item) => String(item?.href || item?.url || '').trim() === '/shop',
  );
  const shopItem = topLevelItems[resolvedShopIndex];
  const nestedItems = [
    ...(Array.isArray(shopItem?.children) ? shopItem.children : []),
    ...separateCollections,
    ...CORE_COLLECTION_NAV,
  ];
  const seen = new Set();
  const children = nestedItems.filter((item) => {
    const href = String(item?.href || item?.url || '').trim();
    if (!href || seen.has(href) || item?.is_active === false) return false;
    seen.add(href);
    return true;
  });

  topLevelItems[resolvedShopIndex] = { ...shopItem, children };
  return topLevelItems;
}

const TICKER = [
  'Free shipping on orders above ₹499','Ultra-soft cotton top sheet',
  'Rash-free · Leak-proof · 12 hr protection','Dealer & bulk enquiries welcome',
];
export default function ZipReferenceHeader({ settings = EMPTY_SETTINGS }) {
  const [open, setOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState(settings || {});
  const [navItems, setNavItems] = useState(withShopDropdown(NAV));
  const [themeSettings, setThemeSettings] = useState({});
  useEffect(() => {
    let active = true;
    fetch('/api/storefront/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data) return;
        setSiteSettings({ ...(settings || {}), ...(data.settings || {}) });
        const savedItems = data.headerMenu?.items;
        setNavItems(withShopDropdown(Array.isArray(savedItems) && savedItems.length
          ? savedItems.filter((item) => item && item.is_active !== false && (item.href || item.url))
          : NAV));
        setThemeSettings(data.theme || {});
      })
      .catch(() => {
        if (active && Object.keys(settings || {}).length) setSiteSettings(settings);
      });
    return () => { active = false; };
  }, [settings]);
  const currentSettings = siteSettings || settings || {};
  const phone = currentSettings.phone || '6358218366';
  const phoneHref = phone.replace(/[^\d+]/g, '');
  const announcementSetting = themeSettings.announcement_bar;
  const themeAnnouncement = typeof announcementSetting === 'string'
    ? announcementSetting.trim()
    : announcementSetting?.enabled === false ? '' : String(announcementSetting?.text || '').trim();
  const announcement = String(currentSettings.announcement_text || '').trim() || themeAnnouncement;
  const ticker = announcement ? [announcement] : TICKER;
  const displayName = String(currentSettings.website_name || 'PinkBox');
  const logoUrl = currentSettings.logo_url || '';
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="overflow-hidden bg-gradient-brand text-primary-foreground">
        <div className="flex w-max animate-marquee gap-12 py-2 text-xs font-medium tracking-wide whitespace-nowrap">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => (
            <span key={i} className="flex items-center gap-2"><Flower2 className="h-3.5 w-3.5" aria-hidden />{t}</span>
          ))}
        </div>
      </div>
      <div className="border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/" aria-label={displayName + ' home'} className="flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt={displayName} width={150} height={48} unoptimized className="h-10 w-auto max-w-[150px] object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5" /></span>
                <span className="truncate font-display text-xl leading-none font-semibold text-foreground">{displayName}</span>
              </>
            )}
          </Link>
          <nav className="hidden items-center gap-3 lg:flex">
            {navItems.map((item, index) => item.children?.length ? (
              <details key={item.id || item.href || item.label || index} className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:text-sm">
                  {item.label || item.title || 'Shop'}
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="absolute left-0 top-full z-50 mt-2 hidden min-w-48 rounded-xl border border-border bg-background p-2 shadow-xl group-open:block">
                  <Link href={item.href || item.url || '/shop'} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); }} className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary">All Products</Link>
                  {item.children.map((child, childIndex) => <Link key={child.id || child.href || child.url || child.label || childIndex} href={child.href || child.url || '/shop'} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); }} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-primary">{child.label || child.title || 'Category'}</Link>)}
                </div>
              </details>
            ) : (
              <Link key={item.id || item.href || item.url || item.label || index} href={item.href || item.url || '/'} className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary lg:text-sm">{item.label || item.title || 'Link'}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <a href={'tel:' + phoneHref} className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary lg:inline-flex"><Phone className="h-4 w-4" />{phone}</a>
            <Link href="/shop" className="hidden h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 lg:inline-flex">Shop Now</Link>
            <ZipReferenceCartDrawer settings={currentSettings} />
            <button type="button" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground lg:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {open && <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">{navItems.map((item, index) => item.children?.length ? (
          <details key={item.id || item.href || item.label || index} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
              {item.label || item.title || 'Shop'}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mb-2 ml-3 hidden border-l border-border pl-3 group-open:block">
              <Link href={item.href || item.url || '/shop'} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-secondary">All Products</Link>
              {item.children.map((child, childIndex) => <Link key={child.id || child.href || child.url || child.label || childIndex} href={child.href || child.url || '/shop'} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-primary">{child.label || child.title || 'Category'}</Link>)}
            </div>
          </details>
        ) : (
          <Link key={item.id || item.href || item.url || item.label || index} href={item.href || item.url || '/'} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">{item.label || item.title || 'Link'}</Link>
        ))}</nav>}
      </div>
    </header>
  );
}
