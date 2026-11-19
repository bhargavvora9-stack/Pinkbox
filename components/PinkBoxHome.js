'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CartLink from './CartLink';
import NewsletterSignup from './NewsletterSignup';
import BulkEnquiryForm from './BulkEnquiryForm';
import {
  Award, ArrowRight, Boxes, Check, ChevronLeft,
  ChevronRight, Copy, FlaskConical, Flower2, Heart, HeartHandshake, Mail,
  Menu, PackageCheck, Phone, Search, ShieldCheck, Sparkles, Star, Tag,
  Truck, X, Droplets, Feather, Leaf, Wind, MessageSquareHeart
} from 'lucide-react';

const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pick = (value, fallback = '') => typeof value === 'string' && value.trim() ? value : fallback;

const TICKER = [
  'Free shipping on orders above ₹499',
  'Ultra-soft cotton top sheet',
  'Rash-free · Leak-proof · 12 hr protection',
  'Dealer & bulk enquiries welcome',
];
const NAV = [
  ['Home', '/#top'], ['Shop', '/shop'], ['About', '/#about'],
  ['Blog', '/blog'], ['FAQ', '/pages/faq'], ['Contact', '/#contact'],
];
const TRUST = [
  [Award, 'ISO certified unit'],
  [FlaskConical, 'Lab tested quality'],
  [PackageCheck, 'Discreet packaging'],
  [HeartHandshake, 'Bulk & retail supply'],
];
const FEATURES = [
  [Feather, 'Ultra-soft top sheet', 'Cotton-feel surface that stays gentle against sensitive skin.'],
  [Droplets, '12-hour absorbency', 'High-capacity gel core locks moisture and prevents side leaks.'],
  [Wind, 'Breathable back sheet', 'Air-flow layers keep you fresh and rash-free all day.'],
  [ShieldCheck, 'Anti-bacterial layer', 'Odour control and hygiene protection you can trust.'],
  [Leaf, 'Skin-safe materials', 'No chlorine bleaching, no harsh fragrance, dermatologist tested.'],
  [Truck, 'Discreet fast delivery', 'Plain packaging, pan-India shipping, free above ₹499.'],
];
const FINDER_EXAMPLES = ['Heavy flow, overnight protection', 'Sensitive skin, rash-free', 'Light days, thin and discreet'];

export default function PinkBoxHome({ initialData }) {
  const data = initialData || null;
  const [slide, setSlide] = useState(0);
  const [query, setQuery] = useState('');
  const [finderQuery, setFinderQuery] = useState('');
  const [wish, setWish] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { setWish(JSON.parse(localStorage.getItem('pinkbox_wishlist') || '[]')); }
    catch { setWish([]); }
  }, []);
  useEffect(() => { localStorage.setItem('pinkbox_wishlist', JSON.stringify(wish)); }, [wish]);

  const banners = useMemo(() => data?.banners?.filter((banner) => banner?.is_active !== false) || [], [data]);
  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => setSlide((index) => (index + 1) % banners.length), 6000);
    return () => clearInterval(timer);
  }, [banners.length]);
  useEffect(() => { if (slide >= banners.length) setSlide(0); }, [slide, banners.length]);

  if (!data) return <main className="min-h-screen grid place-items-center bg-background p-8 text-center text-foreground"><div><b>PinkBox is temporarily unavailable</b><p className="mt-2 text-sm text-muted-foreground">Store data could not be loaded.</p></div></main>;

  const settings = data.settings || {};
  const theme = data.theme || {};
  const products = (data.products || []).filter((product) => Number(product?.price || 0) > 0 && product.is_active !== false);
  const activeBanner = banners[slide] || null;
  const displayedProducts = (query.trim() ? products.filter((product) => [product.title, product.brand, product.sku, product.short_description, product.description].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))) : products).slice(0, 8);
  const freeShippingThreshold = Number(settings.free_shipping_threshold || 499);
  const freeShippingLabel = `Free shipping on orders above ${money(freeShippingThreshold)}`;
  const heroImage = activeBanner?.image_url || products[0]?.image_url || '/pinkbox-reference/hero-woman.webp';
  const heroHeading = pick(activeBanner?.title, 'Comfort that stays with you, every single day');
  const heroSubheading = pick(activeBanner?.subtitle, 'Ultra-soft cotton sanitary napkins with 12-hour leak protection, anti-bacterial core and a breathable back sheet — designed for Indian skin and Indian weather.');
  const heroButtonText = pick(activeBanner?.button_text, 'Shop Now');
  const heroButtonLink = pick(activeBanner?.button_url, '#products');
  const phone = pick(settings.phone || settings.whatsapp_number);
  const whatsappNumber = String(settings.whatsapp_number || settings.phone || '').replace(/\D/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi PinkBox, I need help with an order.')}` : '';
  const reviews = (data.reviews || []).filter(Boolean).slice(0, 3);
  const toggleWishlist = (id) => setWish((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  function runFinder(value) {
    const clean = String(value || '').trim();
    if (clean.length < 2) return;
    setQuery(clean);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function copyCoupon() {
    try {
      await navigator.clipboard.writeText('WELCOME10');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground" style={{ '--pb-primary': theme.primary_color || 'var(--color-primary)' }}>
      {/* Original ZIP announcement ticker + header */}
      <header id="top" className="sticky top-0 z-50 w-full">
        <div className="overflow-hidden bg-gradient-brand text-primary-foreground">
          <div className="flex w-max animate-marquee gap-12 py-2 text-xs font-medium tracking-wide whitespace-nowrap home-ticker-track">
            {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((text, index) => (
              <span key={`${text}-${index}`} className="flex items-center gap-2"><Flower2 className="h-3.5 w-3.5" aria-hidden />{index % TICKER.length === 0 ? freeShippingLabel : text}</span>
            ))}
          </div>
        </div>
        <div className="border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Pink Box home">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5" /></span>
              <span className="font-display text-xl leading-none font-semibold text-foreground">Pink <span className="text-primary">Box</span></span>
            </Link>
            <nav className="hidden items-center gap-7 md:flex">
              {NAV.map(([label, href]) => <Link key={label} href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">{label}</Link>)}
            </nav>
            <div className="flex items-center gap-1">
              {phone && <a href={`tel:${phone}`} className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary lg:inline-flex"><Phone className="h-4 w-4" />{phone}</a>}
              <label className="hidden h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-muted-foreground sm:flex">
                <Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') runFinder(query); }} placeholder="Search products" aria-label="Search products" className="w-28 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground md:w-36" />
              </label>
              <Link href="/account" aria-label="Account" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary">◯</Link>
              <Link href="/wishlist" aria-label="Wishlist" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary"><Heart className="h-5 w-5" fill={wish.length ? 'currentColor' : 'none'} />{wish.length > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">{wish.length}</span>}</Link>
              <CartLink />
              <button type="button" aria-label="Toggle navigation" onClick={() => setMobileOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary md:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            </div>
          </div>
          {mobileOpen && <nav className="border-t border-border bg-background px-4 py-3 md:hidden">{NAV.map(([label, href]) => <Link key={label} href={href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">{label}</Link>)}</nav>}
        </div>
      </header>

      {/* Original ZIP hero structure */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase"><Sparkles className="h-3.5 w-3.5" /> Soft. Safe. Rash-free.</span>
            <h1 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] font-semibold text-foreground md:text-6xl">{heroHeading.includes('every single day') ? <>Comfort that stays with you, <span className="text-primary">every single day</span></> : heroHeading}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{heroSubheading}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={heroButtonLink} className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">{heroButtonText}</a>
              <a href="#why" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">Why Pink Box</a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Star className="h-4 w-4 fill-primary text-primary" /> Ultra-soft cotton top sheet</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Dermatologist tested</span>
            </div>
            {banners.length > 1 && <div className="mt-8 flex items-center gap-2"><button type="button" aria-label="Previous banner" onClick={() => setSlide((index) => (index - 1 + banners.length) % banners.length)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground hover:border-primary hover:text-primary"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs text-muted-foreground">{slide + 1} / {banners.length}</span><button type="button" aria-label="Next banner" onClick={() => setSlide((index) => (index + 1) % banners.length)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground hover:border-primary hover:text-primary"><ChevronRight className="h-4 w-4" /></button></div>}
          </div>
          <div className="relative">
            <div className="absolute -top-8 -right-6 h-40 w-40 rounded-full bg-accent/50 blur-3xl" aria-hidden />
            <div className="relative aspect-square overflow-hidden rounded-[2rem] shadow-soft">
              <Image src={heroImage} alt={activeBanner?.title || 'Pink Box everyday comfort'} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="absolute bottom-5 left-5 rounded-2xl bg-background/90 px-5 py-3 shadow-soft backdrop-blur"><p className="font-display text-2xl font-semibold text-foreground">12 hrs</p><p className="text-xs text-muted-foreground">of dry, worry-free protection</p></div>
          </div>
        </div>
      </section>

      {/* Original ZIP coupon row; current PinkBox welcome coupon and shipping setting */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container mx-auto grid gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-background p-4">
            <div><p className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"><Tag className="h-4 w-4 text-primary" />10% off</p><p className="mt-1 text-xs text-muted-foreground">Flat 10% off on your first order</p></div>
            <button type="button" onClick={copyCoupon} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold tracking-wide text-primary uppercase">WELCOME10 {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-background p-4"><div><p className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"><Truck className="h-4 w-4 text-primary" />Free shipping</p><p className="mt-1 text-xs text-muted-foreground">{freeShippingLabel}</p></div><span className="rounded-full bg-accent/40 px-4 py-2 text-xs font-semibold text-accent-foreground">PAN INDIA</span></div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-background p-4 sm:col-span-2 lg:col-span-1"><div><p className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"><Boxes className="h-4 w-4 text-primary" />Bulk orders</p><p className="mt-1 text-xs text-muted-foreground">Retail, school & NGO supply</p></div><a href="#contact" className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Enquire</a></div>
        </div>
      </section>

      {/* Original ZIP trust badges */}
      <section className="border-b border-border bg-background">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4">
          {TRUST.map(([Icon, label]) => <div key={label} className="flex items-center justify-center gap-3 text-center"><Icon className="h-6 w-6 shrink-0 text-primary" /><span className="text-sm font-medium text-foreground">{label}</span></div>)}
        </div>
      </section>

      {/* Original ZIP product listing, backed by the current PinkBox catalog */}
      <section id="products" className="container mx-auto px-4 py-16 md:py-24 scroll-mt-24">
        <div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Our range</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Pads for every day and every flow</h2><p className="mt-3 text-muted-foreground">Explore the products currently available at PinkBox.</p></div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-soft">
            <Link href={`/products/${product.slug}`} className="block">
              <div className="relative aspect-square overflow-hidden bg-muted">{product.image_url ? <Image src={product.image_url} alt={product.title || 'PinkBox product'} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain p-5 transition-transform group-hover:scale-[1.025]" /> : <div className="grid h-full place-items-center font-display text-5xl text-primary/40">Pink Box</div>}{Number(product.compare_at_price) > Number(product.price) && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-primary-foreground">Sale</span>}</div>
              <div className="p-4"><p className="text-xs font-semibold uppercase tracking-widest text-primary">{product.brand || 'Pink Box'}</p><h3 className="mt-2 line-clamp-2 min-h-12 text-lg font-semibold text-card-foreground">{product.title}</h3><p className="mt-2 text-sm text-muted-foreground line-clamp-2">{product.short_description || product.description || ''}</p><div className="mt-4 flex items-center gap-2"><strong className="text-lg text-foreground">{money(product.price)}</strong>{Number(product.compare_at_price) > Number(product.price) && <del className="text-sm text-muted-foreground">{money(product.compare_at_price)}</del>}<span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">View <ArrowRight className="h-3.5 w-3.5" /></span></div></div>
            </Link>
            <div className="flex items-center justify-between border-t border-border px-4 py-3"><button type="button" onClick={() => toggleWishlist(product.id)} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><Heart className="h-4 w-4" fill={wish.includes(product.id) ? 'currentColor' : 'none'} />{wish.includes(product.id) ? 'Saved' : 'Save to wishlist'}</button><Link href={`/products/${product.slug}`} className="text-xs font-semibold text-primary">Product details</Link></div>
          </article>)}
        </div>
        {!displayedProducts.length && <div className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center"><p className="font-display text-xl font-semibold">No products found</p><p className="mt-2 text-sm text-muted-foreground">Try a different search term or browse the full shop.</p><Link href="/shop" className="mt-4 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground">Browse Shop</Link></div>}
        <div className="mt-10 text-center"><Link href="/shop" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3 text-sm font-semibold text-foreground hover:border-primary hover:text-primary">View all products <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      {/* Original ZIP Product Finder section */}
      <section id="finder" className="bg-secondary/40 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Product finder</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Tell us what you need</h2><p className="mt-3 text-muted-foreground">Describe your flow, comfort or skin needs — we’ll help you find matching products.</p></div>
          <form className="mx-auto mt-8 max-w-2xl space-y-3" onSubmit={(event) => { event.preventDefault(); runFinder(finderQuery); }}>
            <textarea value={finderQuery} onChange={(event) => setFinderQuery(event.target.value)} placeholder="e.g. I have a heavy flow at night and sensitive skin" maxLength={500} rows={3} className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            <div className="flex flex-wrap items-center gap-2">{FINDER_EXAMPLES.map((example) => <button key={example} type="button" onClick={() => { setFinderQuery(example); runFinder(example); }} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{example}</button>)}<button type="submit" disabled={finderQuery.trim().length < 2} className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"><Search className="h-4 w-4" />Find my match</button></div>
          </form>
        </div>
      </section>

      {/* Original ZIP About strip */}
      <section id="about" className="scroll-mt-20 bg-cream/60">
        <div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
          <Image src="/pinkbox-reference/about-strip.webp" alt="Pink Box sanitary care and cotton flowers" width={1200} height={912} className="w-full rounded-[2rem] object-cover shadow-soft" />
          <div><p className="text-xs font-semibold tracking-widest text-primary uppercase">Our promise</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Hygiene is not a luxury — it’s a right</h2><p className="mt-4 leading-relaxed text-muted-foreground">Pink Box started with one goal: make premium-quality period care affordable for every household in India. From raw cotton to the sealed pack, everything is checked so you never have to think twice.</p><ul className="mt-7 space-y-3">{['Made in an ISO-certified, hygienic facility','Lab-tested for absorbency and skin safety','Sizes for day, night and heavy flow','Bulk supply for retailers, schools and NGOs'].map((point) => <li key={point} className="flex items-start gap-3 text-sm text-foreground"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="h-3 w-3" /></span>{point}</li>)}</ul></div>
        </div>
      </section>

      {/* Original ZIP features */}
      <section id="why" className="container mx-auto px-4 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Why Pink Box</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Built on comfort, tested for safety</h2><p className="mt-4 text-muted-foreground">Every pad goes through six quality checks before it reaches you.</p></div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([Icon, title, text]) => <article key={title} className="group rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-soft"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-gradient-brand group-hover:text-primary-foreground"><Icon className="h-6 w-6" /></span><h3 className="mt-5 font-display text-xl font-semibold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
      </section>

      {/* Original ZIP testimonial block; use live approved PinkBox reviews when available */}
      <section id="reviews" className="bg-secondary/40">
        <div className="container mx-auto px-4 py-16 md:py-24"><div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Real voices</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Customer reviews</h2><p className="mt-3 text-muted-foreground">Only verified reviews from real customers will appear here.</p></div>
          {reviews.length ? <div className="mt-12 grid gap-5 md:grid-cols-3">{reviews.map((review) => <article key={review.id} className="rounded-3xl border border-border bg-card p-6 shadow-soft"><div className="flex gap-1 text-primary">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4" fill={index < Number(review.rating || 5) ? 'currentColor' : 'none'} />)}</div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{review.review_text || review.comment || ''}</p><p className="mt-4 text-sm font-semibold text-foreground">{review.customer_name || 'Verified buyer'}</p></article>)}</div> : <div className="mt-12 rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-soft/50"><MessageSquareHeart className="mx-auto h-9 w-9 text-primary/50" /><p className="mt-4 font-display text-xl font-semibold text-foreground">No reviews yet</p><div className="mt-3 flex items-center justify-center gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4 text-muted-foreground/40" />)}</div><p className="mt-3 text-sm text-muted-foreground">Be the first to share your experience after your order arrives.</p></div>}
        </div>
      </section>

      {/* Original ZIP contact area; current PinkBox B2B enquiry API retained */}
      <section id="contact" className="scroll-mt-20 bg-secondary/40 py-16 md:py-24">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div><p className="text-xs font-semibold tracking-widest text-primary uppercase">Let’s connect</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Care for every home, shop and community</h2><p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Send us a general question, become a retail partner, or ask about bulk supply for a school or NGO.</p><div className="mt-7 space-y-3 text-sm text-foreground"><p className="flex items-center gap-3"><Boxes className="text-primary" />Retail and distributor partnerships</p><p className="flex items-center gap-3"><HeartHandshake className="text-primary" />School, NGO and institutional orders</p>{phone && <p className="flex items-center gap-3"><Phone className="text-primary" />{phone}</p>}</div></div><div className="rounded-2xl border border-border bg-card p-6 shadow-soft"><BulkEnquiryForm /></div></div>
      </section>

      {/* Original ZIP newsletter section; current live newsletter API retained */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="rounded-[2rem] bg-gradient-brand px-6 py-14 text-center text-primary-foreground shadow-soft md:px-16"><Mail className="mx-auto h-8 w-8 opacity-90" /><h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Get ₹100 off your first order</h2><p className="mx-auto mt-3 max-w-lg text-sm opacity-90 md:text-base">Join our list for period care tips, new launches and subscriber-only offers. No spam, ever.</p><div className="mx-auto mt-8 flex justify-center"><NewsletterSignup /></div></div>
      </section>

      {/* Original ZIP footer structure; dynamic store information preserved */}
      <footer className="border-t border-border bg-secondary/40">
        <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2"><Link href="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5" /></span><span className="font-display text-xl font-semibold text-foreground">Pink <span className="text-primary">Box</span></span></Link><p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">Dermatologically safe, ultra-soft sanitary napkins made for everyday confidence. Trusted by families, schools and retailers across India.</p><div className="mt-5 space-y-2 text-sm text-muted-foreground">{phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{phone}</p>}{settings.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />{settings.email}</p>}{settings.address && <p className="flex items-center gap-2"><span className="text-primary">⌖</span>{settings.address}</p>}</div></div>
          {[['Shop', [['All Products', '/shop'], ['Your Cart', '/cart'], ['Track Order', '/track-order'], ['Bulk Orders', '/#contact']]], ['Company', [['About Us', '/#about'], ['Blog', '/blog'], ['FAQ', '/pages/faq'], ['Contact', '/#contact']]], ['Support', [['Shipping Policy', '/pages/shipping-policy'], ['Returns & Refunds', '/pages/refund-policy'], ['Privacy Policy', '/pages/privacy-policy'], ['Terms of Service', '/pages/terms-conditions'], ['Dealer Enquiry', '/#contact']]]].map(([title, links]) => <div key={title}><h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">{title}</h3><ul className="mt-4 space-y-2.5">{links.map(([label, href]) => <li key={label}><Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link></li>)}</ul></div>)}
        </div>
        <div className="border-t border-border"><div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row"><p>{data.footer?.copyright_text || `© ${new Date().getFullYear()} ${settings.website_name || 'Pink Box'}. All rights reserved.`}</p><p>Made with care for every woman.</p></div></div>
      </footer>
      {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Chat with PinkBox on WhatsApp" className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#168c55] px-4 py-3 text-sm font-semibold text-white shadow-lg"><Phone className="h-4 w-4" />WhatsApp</a>}
    </main>
  );
}
