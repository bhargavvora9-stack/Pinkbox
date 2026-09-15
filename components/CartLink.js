'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

const readCount = () => {
  try {
    const value = JSON.parse(localStorage.getItem('pinkbox_cart') || '[]');
    return Array.isArray(value) ? value.reduce((s, x) => s + Number(x.quantity || 0), 0) : 0;
  } catch { return 0; }
};

export default function CartLink({ className = '', iconSize = 19 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(readCount());
    const sync = () => setCount(readCount());
    window.addEventListener('pinkbox-cart-updated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('pinkbox-cart-updated', sync); window.removeEventListener('storage', sync); };
  }, []);
  return (
    <Link href="/cart" aria-label="Cart" className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      <ShoppingBag size={iconSize} />
      {count > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 15, height: 15, padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: 20, background: '#d9295f', color: '#fff', fontSize: 8, fontWeight: 800 }}>{count}</span>}
    </Link>
  );
}
