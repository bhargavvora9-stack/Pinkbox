'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { zipHeroImage, zipAboutImage } from '@/lib/zip-reference-artwork';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import ZipReferenceProductCard from '@/components/ZipReferenceProductCard';
import Image from 'next/image';
import Link from 'next/link';
import {
  Award, BadgeCheck, Building2, Check, ChevronLeft, ChevronRight,
  Copy, Droplets, Feather, HeartHandshake, Leaf, Loader2, Tag,
  Mail, MessageSquareHeart, PackageCheck, Search, Send, ShieldCheck,
  Sparkles, Star, Truck, Wind
} from 'lucide-react';

const shouldUnoptimizeImage = (src) => {
  if (typeof src !== 'string') return true;
  return !(src.startsWith('/') || /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(src));
};

const EXAMPLES = [
  'Heavy flow, overnight protection',
  'Sensitive skin, rash-free',
  'Light days, thin and discreet',
];

const FEATURES = [
  { icon: Feather, title: 'Ultra-soft top sheet', text: 'Cotton-feel surface that stays gentle against sensitive skin.' },
  { icon: Droplets, title: '12-hour absorbency', text: 'High-capacity gel core locks moisture and prevents side leaks.' },
  { icon: Wind, title: 'Breathable back sheet', text: 'Air-flow layers keep you fresh and rash-free all day.' },
  { icon: ShieldCheck, title: 'Anti-bacterial layer', text: 'Odour control and hygiene protection you can trust.' },
  { icon: Leaf, title: 'Skin-safe materials', text: 'No chlorine bleaching, no harsh fragrance, dermatologist tested.' },
  { icon: Truck, title: 'Discreet fast delivery', text: 'Plain packaging, pan-India shipping, free above ₹499.' },
];

const TRUST = [
  { icon: PackageCheck, label: 'Discreet packaging' },
  { icon: Truck, label: 'Shipping across India' },
  { icon: HeartHandshake, label: 'Retail & bulk enquiries' },
  { icon: BadgeCheck, label: 'Product details upfront' },
];

function Hero({ banner }) {
  const [index, setIndex] = useState(0);
  const banners = Array.isArray(banner) ? banner : [];
  const count = banners.length;
  useEffect(() => {
    if (count < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [count]);
  const active = banners.length ? banners[index % banners.length] : null;
  const title = active?.title || 'Comfort that stays with you, every single day';
  const description = active?.subtitle || 'Ultra-soft cotton sanitary napkins with 12-hour leak protection, anti-bacterial core and a breathable back sheet — designed for Indian skin and Indian weather.';
  const image = active?.image_url || zipHeroImage;
  const buttonText = active?.button_text || 'Shop Now';
  const buttonHref = active?.button_url || '/shop';

  return (
    <section id="top" className="relative overflow-hidden bg-gradient-soft">
      <div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <Sparkles className="h-3.5 w-3.5" /> Soft. Safe. Rash-free.
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.05] font-semibold text-foreground md:text-6xl">
            {active ? title : <>Comfort that stays with you, <span className="text-primary">every single day</span></>}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={buttonHref} className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">{buttonText}</a>
            <a href="#why" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">Why PinkBox</a>
            {banners.length > 1 && (
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Previous slide" onClick={() => setIndex((v) => (v - 1 + banners.length) % banners.length)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" aria-label="Next slide" onClick={() => setIndex((v) => (v + 1) % banners.length)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          {banners.length > 1 && <div className="mt-8 flex gap-2">{banners.map((item, i) => <button key={item.id || i} type="button" aria-label={'Go to slide ' + (i + 1)} onClick={() => setIndex(i)} className={'h-1.5 rounded-full transition-all ' + (i === index ? 'w-8 bg-primary' : 'w-3 bg-border')} />)}</div>}
          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Star className="h-4 w-4 fill-primary text-primary" /> Ultra-soft cotton top sheet</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Dermatologist tested</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-8 -right-6 h-40 w-40 rounded-full bg-accent/50 blur-3xl" aria-hidden />
          <picture>
            {active?.mobile_image_url && <source media="(max-width: 767px)" srcSet={active.mobile_image_url}/>}
            <Image src={image} alt={title} width={1280} height={1280} priority sizes="(max-width: 1024px) 100vw, 50vw" unoptimized={shouldUnoptimizeImage(image)} className="relative w-full rounded-[2rem] object-cover shadow-soft"/>
          </picture>
          <div className="absolute bottom-5 left-5 rounded-2xl bg-background/90 px-5 py-3 shadow-soft backdrop-blur">
            <p className="font-display text-2xl font-semibold text-foreground">12 hrs</p>
            <p className="text-xs text-muted-foreground">of dry, worry-free protection</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CouponStrip({ coupons = [] }) {
  const [copied, setCopied] = useState(null);
  if (!coupons.length) return null;
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="container mx-auto grid gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-background p-4">
            <div>
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                <Tag className="h-4 w-4 text-primary" />
                {['percent', 'percentage'].includes(String(coupon.discount_type || '').toLowerCase()) ? coupon.discount_value + '% off' : '₹' + coupon.discount_value + ' off'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{coupon.description || (Number(coupon.min_order_amount || 0) > 0 ? 'On orders above ₹' + coupon.min_order_amount : 'Sitewide')}</p>
            </div>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(coupon.code); setCopied(coupon.id); setTimeout(() => setCopied(null), 2000); } catch {} }} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold tracking-wide text-primary uppercase">
              {coupon.code}{copied === coupon.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustBadges({ section }) {
  if (section && section.is_active === false) return null;
  const configured = section?.settings?.items;
  const items = Array.isArray(configured) && configured.length ? configured : TRUST.map((item) => item.label);
  return (
    <section className="border-y border-border bg-background">
      <div className="container mx-auto px-4 py-10">
        {(section?.settings?.eyebrow || section?.title) && <div className="mb-5 text-center">{section?.settings?.eyebrow && <p className="text-xs font-semibold tracking-widest text-primary uppercase">{section.settings.eyebrow}</p>}{section?.title && <h2 className="mt-2 font-display text-xl font-semibold text-foreground">{section.title}</h2>}</div>}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map((item,index)=>{const Icon=TRUST[index%TRUST.length]?.icon||Award;const label=typeof item==='string'?item:item?.label||item?.title||'';return <div key={label||index} className="flex items-center justify-center gap-3 text-center"><Icon className="h-6 w-6 shrink-0 text-primary"/><span className="text-sm font-medium text-foreground">{label}</span></div>})}
        </div>
      </div>
    </section>
  );
}function ProductsSection({ categories = [], section }) {
  if (section && section.is_active === false) return null;
  return (
    <section id="products" className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">{section?.settings?.eyebrow || 'Our range'}</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">{section?.title || 'Explore our collections'}</h2>{section?.settings?.description && <p className="mt-4 text-muted-foreground">{section.settings.description}</p>}</div>
      {categories.length ? <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category)=><article key={category.id} className="group overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-soft"><Link href={`/collections/${encodeURIComponent(category.slug)}`} className="block"><div className="relative aspect-square overflow-hidden bg-muted">{category.image_url?<Image src={category.image_url} alt={category.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized={shouldUnoptimizeImage(category.image_url)} className="h-full w-full object-contain p-3"/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-[#fff4f7] to-[#fce4ec] p-6"><span className="font-display text-2xl font-semibold text-primary">{category.name}</span></div>}</div><div className="flex items-center justify-between gap-4 p-5"><div><p className="text-xs font-semibold tracking-widest text-primary uppercase">PinkBox Collection</p><h3 className="mt-2 font-display text-xl font-semibold text-foreground">{category.name}</h3></div><span className="shrink-0 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">Explore</span></div></Link></article>)}</div>:<p className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Collections will appear here soon.</p>}
    </section>
  );
}function FeaturedProducts({ products = [] }) {
  if (!products.length) return null;
  return (
    <section id="featured-products" className="container mx-auto px-4 py-14 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Picked for you</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Featured Products</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Explore selected PinkBox products, pack details and current prices. Choose a product to see all available options.</p>
        </div>
        <Link href="/shop" className="text-sm font-semibold text-primary underline underline-offset-4">View all products</Link>
      </div>
      <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => <ZipReferenceProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

function ProductFinder({ section }) {
  const eyebrow=section?.settings?.eyebrow||'AI-powered product finder';
  const title=section?.title||'Tell us what you need';
  const description=section?.settings?.description||'Describe your flow, comfort or skin needs — we’ll suggest the right pads.';
  const [query,setQuery]=useState(''),[result,setResult]=useState(null),[error,setError]=useState(''),[isPending,setIsPending]=useState(false);
  async function submit(value){
    const text=String(value||'').trim();if(text.length<3||text.length>500||isPending)return;
    setQuery(text);setError('');setResult(null);setIsPending(true);
    try{const response=await fetch('/api/storefront/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:text})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Couldn’t get suggestions right now. Please try again.');setResult(data)}
    catch(requestError){setError(requestError instanceof Error?requestError.message:'Couldn’t get suggestions right now. Please try again.')}
    finally{setIsPending(false)}
  }
  return <section id="finder" className="bg-secondary/40 py-16 md:py-24"><div className="container mx-auto px-4"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">{title}</h2><p className="mt-3 text-muted-foreground">{description}</p></div><form className="mx-auto mt-8 max-w-2xl space-y-3" onSubmit={event=>{event.preventDefault();submit(query)}}><textarea value={query} onChange={event=>setQuery(event.target.value)} placeholder="e.g. I have a heavy flow at night and sensitive skin" maxLength={500} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/><div className="flex flex-wrap items-center gap-2">{EXAMPLES.map(example=><button key={example} type="button" onClick={()=>submit(example)} disabled={isPending} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">{example}</button>)}<button type="submit" className="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={isPending||query.trim().length<3}>{isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}Find my match</button></div></form>{error&&<p className="mx-auto mt-6 max-w-2xl text-center text-sm text-destructive">{error}</p>}{result&&<div className="mt-10"><p className="mx-auto max-w-2xl text-center text-foreground">{result.message}</p>{result.products?.length>0&&<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{result.products.map(product=><div key={product.id} className="space-y-2"><ZipReferenceProductCard product={product}/>{result.reasons?.[product.slug]&&<p className="px-1 text-sm text-muted-foreground">{result.reasons[product.slug]}</p>}</div>)}</div>}</div>}</div></section>;
}function AboutStrip({ section }) {
  if (section && section.is_active === false) return null;
  const eyebrow=section?.settings?.eyebrow||'Our promise';
  const title=section?.title||'Hygiene is not a luxury — it’s a right';
  const description=section?.settings?.description||'Pink Box started with one goal: make premium-quality period care affordable for every household in India. From raw cotton to the sealed pack, everything is checked so you never have to think twice.';
  const points=Array.isArray(section?.settings?.items)&&section.settings.items.length?section.settings.items:['Made in an ISO-certified, hygienic facility','Lab-tested for absorbency and skin safety','Sizes for day, night and heavy flow','Bulk supply for retailers, schools and NGOs'];
  const image=section?.settings?.image_url||zipAboutImage;
  return <section className="bg-cream/60"><div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2"><Image src={image} alt={section?.settings?.image_alt||'PinkBox sanitary care and cotton flowers'} width={1200} height={912} unoptimized loading="lazy" className="w-full rounded-[2rem] object-cover shadow-soft"/><div><p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">{title}</h2><p className="mt-4 leading-relaxed text-muted-foreground">{description}</p><ul className="mt-7 space-y-3">{points.map((point,index)=><li key={String(point)+index} className="flex items-start gap-3 text-sm text-foreground"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="h-3 w-3"/></span>{typeof point==='string'?point:point?.title}</li>)}</ul></div></div></section>;
}function Features({ section }) {
  if(section&&section.is_active===false)return null;
  const items=Array.isArray(section?.settings?.items)&&section.settings.items.length?section.settings.items:FEATURES;
  return <section id="why" className="container mx-auto px-4 py-16 md:py-24"><div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">{section?.settings?.eyebrow||'Why PinkBox'}</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">{section?.title||'Built on comfort, tested for safety'}</h2><p className="mt-4 text-muted-foreground">{section?.settings?.description||'Every pad goes through six quality checks before it reaches you.'}</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item,index)=>{const Icon=FEATURES[index%FEATURES.length]?.icon||Leaf;const title=typeof item==='string'?item:item?.title||'';const text=typeof item==='string'?'':item?.text||item?.description||'';return <article key={title||index} className="group rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-soft"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-gradient-brand group-hover:text-primary-foreground"><Icon className="h-6 w-6"/></span><h3 className="mt-5 font-display text-xl font-semibold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>})}</div></section>;
}function Testimonials({ section, reviews = [] }) {
  if (section && section.is_active === false) return null;
  const visibleReviews = reviews.filter((review) => review?.review_text).slice(0, 3);
  return (
    <section id="reviews" className="bg-secondary/40">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">{section?.settings?.eyebrow || 'Real voices'}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">{section?.title || 'Customer reviews'}</h2>
          <p className="mt-3 text-muted-foreground">Feedback shared by customers about their PinkBox orders.</p>
        </div>
        {visibleReviews.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleReviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-1" aria-label={Number(review.rating || 0) + ' out of 5 stars'}>
                  {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={'h-4 w-4 ' + (index < Number(review.rating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground/30')} />)}
                </div>
                {review.title && <h3 className="mt-4 font-semibold text-foreground">{review.title}</h3>}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.review_text}</p>
                <p className="mt-5 text-sm font-semibold text-foreground">{review.customer_name || 'PinkBox customer'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <MessageSquareHeart className="mx-auto h-9 w-9 text-primary/50" />
            <p className="mt-4 font-display text-xl font-semibold text-foreground">Customer feedback is being collected</p>
            <p className="mt-2 text-sm text-muted-foreground">Have purchased from PinkBox? Open a product page and share your honest experience. Approved reviews will appear here.</p>
            <Link href="/shop" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Explore products</Link>
          </div>
        )}
      </div>
    </section>
  );
}
function BrandReelSection() {
  const reelUrl = 'https://www.instagram.com/reel/De9YTwLtSmB/';
  return (
    <section className="bg-secondary/40 py-16 md:py-24" aria-labelledby="brand-reel-heading">
      <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">From 24 CARE</p>
          <h2 id="brand-reel-heading" className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">See more from our brand</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
            Explore this video from the official 24 CARE Instagram profile. The original video stays on Instagram, with its source and creator attribution intact.
          </p>
          <a href={reelUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Watch on Instagram
          </a>
        </div>
        <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-border bg-background shadow-soft">
          <iframe
            src="https://www.instagram.com/reel/De9YTwLtSmB/embed"
            title="24 CARE Instagram Reel"
            className="block h-[620px] w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="encrypted-media; picture-in-picture; clipboard-write"
          />
        </div>
      </div>
    </section>
  );
}

function ContactForm({ section }) {
  const [type, setType] = useState('contact');
  const [form, setForm] = useState({ name:'', phone:'', email:'', city:'', message:'' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/storefront/bulk-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        name:form.name,phone:form.phone,email:form.email,city:form.city,lead_type:type,
        organisation_type:type==='dealer'?'Dealer / distributor partnership':type==='bulk'?'School / NGO bulk order':'General enquiry',
        source:'Homepage contact form',message:form.message,
      })});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || 'Your enquiry could not be sent. Please try again.');
      setForm({name:'',phone:'',email:'',city:'',message:''});
      setStatus(data.message || 'Thank you. Our team will contact you shortly.');
    } catch(error) {
      setStatus(error instanceof Error ? error.message : 'Your enquiry could not be sent. Please try again.');
    } finally { setBusy(false); }
  }
  if(section && section.is_active === false) return null;
  return (
    <section id="contact" className="bg-secondary/40 py-16 md:py-24">
      <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">{section?.settings?.eyebrow || 'Let’s connect'}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">{section?.title || 'Care for every home, shop and community'}</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">{section?.settings?.description || 'Send us a general question, become a retail partner, or ask about bulk supply for a school or NGO.'}</p>
          <div className="mt-7 space-y-3 text-sm text-foreground"><p className="flex items-center gap-3"><Building2 className="text-primary"/>Retail and distributor partnerships</p><p className="flex items-center gap-3"><HeartHandshake className="text-primary"/>School, NGO and institutional orders</p></div>
        </div>
        <form className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:grid-cols-2" onSubmit={submit}>
          <div className="sm:col-span-2"><label htmlFor="enquiry-type" className="text-sm font-medium">I am interested in</label><select id="enquiry-type" value={type} onChange={event=>setType(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="contact">General enquiry</option><option value="dealer">Dealer / distributor partnership</option><option value="bulk">School / NGO bulk order</option></select></div>
          <div><label htmlFor="lead-name" className="text-sm font-medium">Name</label><input id="lead-name" required minLength={2} value={form.name} onChange={event=>setForm({...form,name:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
          <div><label htmlFor="lead-phone" className="text-sm font-medium">Phone</label><input id="lead-phone" required inputMode="tel" value={form.phone} onChange={event=>setForm({...form,phone:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
          <div><label htmlFor="lead-email" className="text-sm font-medium">Email</label><input id="lead-email" type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
          <div><label htmlFor="lead-city" className="text-sm font-medium">City</label><input id="lead-city" value={form.city} onChange={event=>setForm({...form,city:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
          <div className="sm:col-span-2"><label htmlFor="lead-message" className="text-sm font-medium">Message</label><textarea id="lead-message" rows={4} value={form.message} onChange={event=>setForm({...form,message:event.target.value})} className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"/></div>
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send className="h-4 w-4"/>{busy?'Sending…':'Send enquiry'}</button>{status && <p role="status" className="mt-3 text-sm text-muted-foreground">{status}</p>}</div>
        </form>
      </div>
    </section>
  );
}
function Newsletter({ section }) {
  const [email,setEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [whatsappOptIn,setWhatsappOptIn] = useState(false);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/storefront/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,phone:whatsappOptIn?phone:'',whatsapp_opt_in:whatsappOptIn})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || 'We could not subscribe you. Please try again.');
      setEmail('');setPhone('');setWhatsappOptIn(false);setStatus(data.message || 'Thanks! You are on the Pink Box list.');
    } catch(error) {
      setStatus(error instanceof Error?error.message:'We could not subscribe you. Please try again.');
    } finally {setBusy(false);}
  }
  if(section && section.is_active === false) return null;
  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      <div className="rounded-[2rem] bg-gradient-brand px-6 py-14 text-center text-primary-foreground shadow-soft md:px-16">
        <Mail className="mx-auto h-8 w-8 opacity-90"/>
        <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">{section?.title || 'Get exclusive offers on your first order'}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm opacity-90 md:text-base">{section?.settings?.description || 'Join our list for period care tips, new launches and subscriber-only offers. No spam, ever.'}</p>
        <form className="mx-auto mt-8 max-w-md" onSubmit={submit}>
          <div className="flex flex-col gap-3 sm:flex-row"><input type="email" required aria-label="Email address" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Enter your email" className="h-12 flex-1 rounded-full bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground"/><button type="submit" disabled={busy} className="h-12 rounded-full bg-foreground px-7 text-sm font-semibold text-background hover:bg-foreground/90">{busy?'Joining…':'Subscribe'}</button></div>
          <label className="mt-4 flex cursor-pointer items-start justify-center gap-2 text-xs opacity-90"><input type="checkbox" className="mt-0.5" checked={whatsappOptIn} onChange={event=>{const checked=event.target.checked;setWhatsappOptIn(checked);if(!checked)setPhone('')}}/>Send me occasional WhatsApp offers too</label>
          {whatsappOptIn && <input type="tel" required aria-label="WhatsApp number" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="WhatsApp number with country code" className="mt-3 h-12 w-full rounded-full bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground"/>}
          {status && <p role="status" className="mt-3 text-xs opacity-90">{status}</p>}
        </form>
      </div>
    </section>
  );
}

export default function PinkBoxHome({ initialData }) {
  const data = initialData || {};
  const banners = (data.banners || []).filter((banner) => banner?.is_active !== false);
  const coupons = data.coupons || [];
  const settings = data.settings || {};
  const homepageSections = [...(data.homepageSections || [])].sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  const sectionMap = Object.fromEntries(homepageSections.map((item) => [item.section_type, item]));
  const section = (type) => sectionMap[type] || null;
  const defaultOrder = ['trust','collections','product-finder','about','features','reviews','contact','newsletter'];
  const orderedSections = homepageSections.length ? homepageSections : defaultOrder.map((section_type)=>({section_type}));
  const sectionNodes = {
    trust: <TrustBadges section={section('trust')}/>,
    collections: <ProductsSection categories={data.categories || []} section={section('collections')}/>,
    'product-finder': <ProductFinder section={section('product-finder')}/>,
    about: <AboutStrip section={section('about')}/>,
    features: <Features section={section('features')}/>,
    reviews: <Testimonials section={section('reviews')} reviews={data.reviews || []}/>,
    contact: <ContactForm section={section('contact')}/>,
    newsletter: <Newsletter section={section('newsletter')}/>,
  };
  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader settings={settings}/>
      <main>
        <Hero banner={banners}/>
        <CouponStrip coupons={coupons}/>
        <FeaturedProducts products={data.featuredProducts || []}/>
        {orderedSections.map((row,index)=><Fragment key={row.id||row.section_type||index}>{sectionNodes[row.section_type]||null}</Fragment>)}
        <BrandReelSection />
      </main>
      <ZipReferenceFooter settings={settings}/>
    </div>
  );
}
