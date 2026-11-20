'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav({ items = [] }) {
  const pathname = usePathname();

  return items.map((item) => {
    const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
      >
        {item.label}
      </Link>
    );
  });
}
