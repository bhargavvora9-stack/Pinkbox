'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CartLink from '@/components/CartLink';
import { Search, SlidersHorizontal, ArrowUpDown, Phone, PackageCheck, ShieldCheck, Truck, ChevronDown } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: Number(value) % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/pages/about-us' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/pages/contact-us' },
];

export default function PinkBoxShopListing({ settings = {}, products = [] }) {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState('featured');
  const [mobileMenu, setMobileMenu] = useState(false);

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [products]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = products.filter((p) => {
      const matchesSearch = !q || [p.title, p.brand, p.sku, p.short_description].some((v) => String(v || '').toLowerCase().includes(q));
      return matchesSearch && (brand === 'all' || p.brand === brand);
    });
    if (sort === 'price-asc') result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-desc') result = [...result].sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name') result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'featured') result = [...result].sort((a, b) => Number(b.featured) - Number(a.featured));
    return result;
  }, [products, search, brand, sort]);

  const phone = String(settings.phone || settings.whatsapp_number || '7359252000');
  const digits = phone.replace(/\D/g, '');
  const telHref = digits.length === 10 ? `+91${digits}` : `+${digits}`;
  const waNumber = digits.length === 10 ? `91${digits}` : digits;
  const freeShipping = Number(settings.free_shipping_threshold || 499);

  return (
    <main className="pb-shop">
      <div className="pb-shop-ticker">
        <span>Free shipping above {money(freeShipping)}</span><i>✦</i><span>Cash on delivery available</span><i>✦</i><span>Secure online payments</span><i>✦</i><span>Bulk & retail enquiries welcome</span>
      </div>
      <header className="pb-shop-header">
        <div className="pb-shop-header-inner">
          <Link href="/" className="pb-shop-brand" aria-label="PinkBox home">
            {settings.logo_url ? <img src={settings.logo_url} alt="PinkBox logo" /> : <span className="pb-shop-logo">PB</span>}
            <span>PinkBox</span>
          </Link>
          <nav className="pb-shop-nav">
            {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === '/shop' ? 'page' : undefined}>{item.label}</Link>)}
          </nav>
          <div className="pb-shop-actions">
            {digits && <a href={`tel:${telHref}`} className="pb-shop-phone"><Phone size={15} /><span>{phone}</span></a>}
            <CartLink className="pb-shop-cart" />
            <button className="pb-shop-menu-button" type="button" onClick={() => setMobileMenu((v) => !v)} aria-label="Toggle navigation">{mobileMenu ? '✕' : '☰'}</button>
          </div>
        </div>
        {mobileMenu && <nav className="pb-shop-mobile-nav">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileMenu(false)}>{item.label}</Link>)}</nav>}
      </header>

      <section className="pb-shop-hero">
        <div>
          <p className="pb-shop-eyebrow">PINKBOX · EVERYDAY CARE</p>
          <h1>Good care starts with the right essentials.</h1>
          <p className="pb-shop-intro">Explore our listed baby diapers and hygiene essentials. Compare pack sizes, quantities and current prices before you order.</p>
          <div className="pb-shop-proof">
            <span><PackageCheck size={15} /> Carefully selected products</span><span><Truck size={15} /> Discreet delivery</span><span><ShieldCheck size={15} /> Secure checkout</span>
          </div>
        </div>
        <div className="pb-shop-hero-note"><span className="pb-shop-flower">✿</span><b>Everyday comfort, made easier.</b><small>Shop the current PinkBox catalogue</small></div>
      </section>

      <section className="pb-shop-content" id="products">
        <div className="pb-shop-section-heading">
          <div><p className="pb-shop-eyebrow">SHOP THE COLLECTION</p><h2>All products <span>({products.length})</span></h2><p>Browse all currently listed PinkBox catalogue products.</p></div>
          <div className="pb-shop-count">{visible.length} products</div>
        </div>
        <div className="pb-shop-toolbar">
          <label className="pb-shop-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, brand or pack size…" /></label>
          <label className="pb-shop-select"><SlidersHorizontal size={16} /><select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand"><option value="all">All brands</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}</select><ChevronDown size={14} /></label>
          <label className="pb-shop-select"><ArrowUpDown size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option></select><ChevronDown size={14} /></label>
        </div>

        {visible.length ? <div className="pb-shop-grid">
          {visible.map((p) => {
            const mrp = Number(p.compare_at_price || 0), price = Number(p.price || 0);
            const discount = mrp > price && mrp > 0 ? Math.round((1 - price / mrp) * 100) : 0;
            const image = p.image_url || p.images?.[0]?.image_url;
            return <article className="pb-shop-card" key={p.id}>
              <Link href={`/products/${p.slug}`} className="pb-shop-product-image">
                {image ? <img src={image} alt={p.title} loading="lazy" /> : <span className="pb-shop-image-fallback">PinkBox</span>}
                {discount > 0 && <span className="pb-shop-sale">{discount}% OFF</span>}
              </Link>
              <div className="pb-shop-card-body">
                <span className="pb-shop-brand-label">{p.brand || 'PINKBOX'}</span>
                <Link href={`/products/${p.slug}`} className="pb-shop-product-title">{p.title}</Link>
                {p.short_description && <p>{p.short_description}</p>}
                <div className="pb-shop-price-row"><strong>{money(price)}</strong>{mrp > price && <del>{money(mrp)}</del>}</div>
                {mrp > price && <small className="pb-shop-saved">You save {money(mrp - price)}</small>}
                <Link href={`/products/${p.slug}`} className="pb-shop-view">View product <span>→</span></Link>
              </div>
            </article>;
          })}
        </div> : <div className="pb-shop-empty"><Search size={24} /><b>No products found</b><span>Try another search term or choose a different brand.</span><button type="button" onClick={() => { setSearch(''); setBrand('all'); }}>Clear filters</button></div>}
      </section>

      <section className="pb-shop-support">
        <div><p className="pb-shop-eyebrow">NEED HELP?</p><h2>Questions before ordering?</h2><p>Talk to our team for product, pack-size and bulk-order enquiries.</p></div>
        <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Hi PinkBox, I need help with your products.')}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp ↗</a>
      </section>

      <footer className="pb-shop-footer">
        <div><Link href="/" className="pb-shop-brand"><span className="pb-shop-logo">PB</span><span>PinkBox</span></Link><p>Everyday care products, delivered with care.</p></div>
        <div><b>Explore</b><Link href="/">Home</Link><Link href="/shop">Shop all</Link><Link href="/blog">Journal</Link><Link href="/pages/contact-us">Contact</Link></div>
        <div><b>Customer care</b><Link href="/pages/shipping-policy">Shipping policy</Link><Link href="/pages/refund-policy">Returns & refunds</Link><Link href="/pages/privacy-policy">Privacy policy</Link><Link href="/pages/terms-conditions">Terms & conditions</Link></div>
        <div><b>Contact</b><span>{settings.phone || '7359252000'}</span><span>{settings.email || '24caresurat@gmail.com'}</span><span>{settings.address || 'Surat, Gujarat'}</span></div>
      </footer>
      <div className="pb-shop-bottom">© {new Date().getFullYear()} PinkBox. All rights reserved.</div>
    </main>
  );
}
