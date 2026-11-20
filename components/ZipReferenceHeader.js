'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flower2, Menu, X, Phone } from 'lucide-react';
import ZipReferenceCartDrawer from '@/components/ZipReferenceCartDrawer';
const NAV = [
  { label: 'Home', href: '/#top' },{ label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },{ label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },{ label: 'Contact', href: '/#contact' },
];
const TICKER = [
  'Free shipping on orders above ₹499','Ultra-soft cotton top sheet',
  'Rash-free · Leak-proof · 12 hr protection','Dealer & bulk enquiries welcome',
];
export default function ZipReferenceHeader({ settings = {} }) {
  const [open, setOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState(settings || {});
  useEffect(() => {
    if (Object.keys(settings || {}).length) {
      setSiteSettings(settings);
      return;
    }
    let active = true;
    fetch('/api/storefront/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.settings) setSiteSettings(data.settings); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const currentSettings = siteSettings || settings || {};
  const phone = currentSettings.phone || '+91 73592 52000';
  const ticker = currentSettings.announcement_text?.trim() ? [currentSettings.announcement_text.trim()] : TICKER;
  const phoneHref = phone.replace(/[^\d+]/g, '');
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
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5" /></span>
            <span className="font-display text-xl leading-none font-semibold text-foreground">Pink <span className="text-primary">Box</span></span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => <Link key={item.label} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-1">
            <a href={'tel:' + phoneHref} className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary lg:inline-flex"><Phone className="h-4 w-4" />{phone}</a>
            <ZipReferenceCartDrawer settings={currentSettings} />
            <button type="button" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground md:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {open && <nav className="border-t border-border bg-background px-4 py-3 md:hidden">{NAV.map((item) => <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">{item.label}</Link>)}</nav>}
      </div>
    </header>
  );
}
