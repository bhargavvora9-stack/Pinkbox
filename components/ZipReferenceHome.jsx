'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Flower2, Menu, X, Phone, Sparkles, Star, ShieldCheck, ChevronLeft, ChevronRight,
  Copy, Check, Tag, Award, FlaskConical, HeartHandshake, PackageCheck, Feather,
  Droplets, Wind, Leaf, Truck, MessageSquareHeart, Mail, Search, Loader2, Building2, Send
} from 'lucide-react';
import CartLink from '@/components/CartLink';

const TICKER = ['Free shipping on orders above ₹499','Ultra-soft cotton top sheet','Rash-free · Leak-proof · 12 hr protection','Dealer & bulk enquiries welcome'];
const NAV = [{label:'Home',href:'/#top'},{label:'Shop',href:'/shop'},{label:'About',href:'/about'},{label:'Blog',href:'/blog'},{label:'FAQ',href:'/faq'},{label:'Contact',href:'/#contact'}];
const TRUST = [{icon:Award,label:'ISO certified unit'},{icon:FlaskConical,label:'Lab tested quality'},{icon:PackageCheck,label:'Discreet packaging'},{icon:HeartHandshake,label:'Bulk & retail supply'}];
const FEATURES = [
 {icon:Feather,title:'Ultra-soft top sheet',text:'Cotton-feel surface that stays gentle against sensitive skin.'},
 {icon:Droplets,title:'12-hour absorbency',text:'High-capacity gel core locks moisture and prevents side leaks.'},
 {icon:Wind,title:'Breathable back sheet',text:'Air-flow layers keep you fresh and rash-free all day.'},
 {icon:ShieldCheck,title:'Anti-bacterial layer',text:'Odour control and hygiene protection you can trust.'},
 {icon:Leaf,title:'Skin-safe materials',text:'No chlorine bleaching, no harsh fragrance, dermatologist tested.'},
 {icon:Truck,title:'Discreet fast delivery',text:'Plain packaging, pan-India shipping, free above ₹499.'}
];
const ABOUT_POINTS=['Made in an ISO-certified, hygienic facility','Lab-tested for absorbency and skin safety','Sizes for day, night and heavy flow','Bulk supply for retailers, schools and NGOs'];
const EXAMPLES=['Heavy flow, overnight protection','Sensitive skin, rash-free','Light days, thin and discreet'];
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN',{maximumFractionDigits:0});

export function ZipHeader(){
 const [open,setOpen]=useState(false);
 return <header className="sticky top-0 z-50 w-full">
  <div className="overflow-hidden bg-gradient-brand text-primary-foreground"><div className="flex w-max animate-marquee gap-12 py-2 text-xs font-medium tracking-wide whitespace-nowrap">
   {[...TICKER,...TICKER,...TICKER,...TICKER].map((t,i)=><span key={i} className="flex items-center gap-2"><Flower2 className="h-3.5 w-3.5" aria-hidden/>{t}</span>)}
  </div></div>
  <div className="border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
   <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
    <Link href="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5"/></span><span className="font-display text-xl leading-none font-semibold text-foreground">Pink <span className="text-primary">Box</span></span></Link>
    <nav className="hidden items-center gap-7 md:flex">{NAV.map(item=><Link key={item.label} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">{item.label}</Link>)}</nav>
    <div className="flex items-center gap-1">
     <a href="tel:+917359252000" className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary lg:inline-flex"><Phone className="h-4 w-4"/>+91 73592 52000</a>
     <CartLink className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background text-foreground hover:border-primary hover:text-primary" iconSize={20}/>
     <button type="button" aria-label="Toggle menu" onClick={()=>setOpen(v=>!v)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground md:hidden">{open?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button>
    </div>
   </div>
   {open&&<nav className="border-t border-border bg-background px-4 py-3 md:hidden">{NAV.map(item=><Link key={item.label} href={item.href} onClick={()=>setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">{item.label}</Link>)}</nav>}
  </div>
 </header>;
}

function ZipHero({banners=[]}){
 const [index,setIndex]=useState(0);
 const count=banners.length;
 const slide=count?banners[Math.min(index,count-1)]:null;
 const heading=slide?.title||'Comfort that stays with you, every single day';
 const subheading=slide?.subtitle||'Ultra-soft cotton sanitary napkins with 12-hour leak protection, anti-bacterial core and a breathable back sheet — designed for Indian skin and Indian weather.';
 const image=slide?.image_url||'/banners/hero-woman.jpg';
 return <section id="top" className="relative overflow-hidden bg-gradient-soft">
  <div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
   <div>
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase"><Sparkles className="h-3.5 w-3.5"/>Soft. Safe. Rash-free.</span>
    <h1 className="mt-6 font-display text-4xl leading-[1.05] font-semibold text-foreground md:text-6xl">{heading}</h1>
    <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{subheading}</p>
    <div className="mt-8 flex flex-wrap items-center gap-3">
     <Link href={slide?.button_url||'/shop'} className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">{slide?.button_text||'Shop Now'}</Link>
     {count>1&&<div className="flex items-center gap-2">
      <button type="button" aria-label="Previous slide" onClick={()=>setIndex(i=>(i-1+count)%count)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"><ChevronLeft className="h-4 w-4"/></button>
      <button type="button" aria-label="Next slide" onClick={()=>setIndex(i=>(i+1)%count)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"><ChevronRight className="h-4 w-4"/></button>
     </div>}
    </div>
    {count>1&&<div className="mt-8 flex gap-2">{banners.map((b,i)=><button key={b.id} type="button" aria-label={'Go to slide '+(i+1)} onClick={()=>setIndex(i)} className={'h-1.5 rounded-full transition-all '+(i===index?'w-8 bg-primary':'w-3 bg-border')}/>)}</div>}
   </div>
   <div className="relative"><div className="absolute -top-8 -right-6 h-40 w-40 rounded-full bg-accent/50 blur-3xl" aria-hidden/><img src={image} alt={heading} width="1280" height="1280" className="relative w-full rounded-[2rem] object-cover shadow-soft"/></div>
  </div>
 </section>;
}

function ZipCouponStrip(){
 const [copied,setCopied]=useState(false);
 return <section className="border-y border-border bg-secondary/40">
  <div className="container mx-auto grid gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
   <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-background p-4">
    <div><p className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"><Tag className="h-4 w-4 text-primary"/>₹100 off</p><p className="mt-1 text-xs text-muted-foreground">On your first order</p></div>
    <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText('WELCOME10');setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{}}} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold tracking-wide text-primary uppercase">WELCOME10 {copied?<Check className="h-3.5 w-3.5"/>:<Copy className="h-3.5 w-3.5"/>}</button>
   </div>
  </div>
 </section>;
}

function ZipTrustBadges(){
 return <section className="border-y border-border bg-background"><div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4">
  {TRUST.map(({icon:Icon,label})=><div key={label} className="flex items-center justify-center gap-3 text-center"><Icon className="h-6 w-6 shrink-0 text-primary"/><span className="text-sm font-medium text-foreground">{label}</span></div>)}
 </div></section>;
}

export function ZipProductCard({product}){
 const price=Number(product.price||0),mrp=Number(product.compare_at_price||0);
 const image=product.image_url||product.images?.[0]?.image_url;
 const off=mrp>price?Math.round((1-price/mrp)*100):0;
 return <div className="group overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
  <Link href={'/products/'+product.slug}>
   <div className="aspect-square overflow-hidden bg-muted">{image?<img src={image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105"/>:<div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>}</div>
   <div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="line-clamp-1 text-lg font-semibold text-card-foreground">{product.title}</h3>{off>0&&<span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{off}% off</span>}</div>
    {product.short_description&&<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description}</p>}
    <p className="mt-2 text-lg font-bold text-foreground">{money(price)}{mrp>price&&<del className="ml-2 text-sm font-normal text-muted-foreground">{money(mrp)}</del>}</p>
   </div>
  </Link>
  <div className="px-4 pb-4"><Link href={'/products/'+product.slug} className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">View product</Link></div>
 </div>;
}

export function ZipProductGrid({products}){
 if(!products.length)return <div className="py-20 text-center"><h3 className="text-xl font-semibold text-foreground">No products found</h3><p className="mt-2 text-muted-foreground">Tell me what you want to sell and I&apos;ll add it to your store.</p></div>;
 return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map(p=><ZipProductCard key={p.id} product={p}/>)}</div>;
}

function ZipAboutStrip(){
 return <section className="bg-cream/60">
  <div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
   <img src="/banners/about-strip.jpg" alt="Soft pink and cream sanitary napkin packs arranged with cotton flowers" width="1200" height="912" loading="lazy" className="w-full rounded-[2rem] object-cover shadow-soft"/>
   <div><p className="text-xs font-semibold tracking-widest text-primary uppercase">Our promise</p>
    <h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Hygiene is not a luxury — it&apos;s a right</h2>
    <p className="mt-4 leading-relaxed text-muted-foreground">Pink Box started with one goal: make premium-quality period care affordable for every household in India. From raw cotton to the sealed pack, everything is checked so you never have to think twice.</p>
    <ul className="mt-7 space-y-3">{ABOUT_POINTS.map(p=><li key={p} className="flex items-start gap-3 text-sm text-foreground"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="h-3 w-3"/></span>{p}</li>)}</ul>
   </div>
  </div>
 </section>;
}

function ZipFeatures(){
 return <section id="why" className="container mx-auto px-4 py-16 md:py-24">
  <div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Why Pink Box</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Built on comfort, tested for safety</h2><p className="mt-4 text-muted-foreground">Every pad goes through six quality checks before it reaches you.</p></div>
  <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(({icon:Icon,title,text})=><article key={title} className="group rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-soft"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-gradient-brand group-hover:text-primary-foreground"><Icon className="h-6 w-6"/></span><h3 className="mt-5 font-display text-xl font-semibold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
 </section>;
}

function ZipTestimonials(){
 return <section id="reviews" className="bg-secondary/40"><div className="container mx-auto px-4 py-16 md:py-24">
  <div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Real voices</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Customer reviews</h2><p className="mt-3 text-muted-foreground">Only verified reviews from real customers will appear here.</p></div>
  <div className="mt-12 rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-soft/50"><MessageSquareHeart className="mx-auto h-9 w-9 text-primary/50"/><p className="mt-4 font-display text-xl font-semibold text-foreground">No reviews yet</p><div className="mt-3 flex items-center justify-center gap-1">{Array.from({length:5}).map((_,i)=><Star key={i} className="h-4 w-4 text-muted-foreground/40"/>)}</div><p className="mt-3 text-sm text-muted-foreground">Be the first to share your experience after your order arrives.</p></div>
 </div></section>;
}

function ZipProductFinder({products}){
 const [query,setQuery]=useState(''),[results,setResults]=useState(null),[busy,setBusy]=useState(false);
 const submit=value=>{const q=String(value||'').trim();if(q.length<3||busy)return;setQuery(q);setBusy(true);const terms=q.toLowerCase().split(/\s+/).filter(Boolean);const found=products.filter(p=>terms.some(t=>[p.title,p.description,p.short_description,p.brand].some(v=>String(v||'').toLowerCase().includes(t)))).slice(0,6);setResults({message:found.length?'Here are products that may match your needs.':'No close matches found. Browse all products or contact our team for help.',products:found});setBusy(false);};
 return <section id="finder" className="bg-secondary/40 py-16 md:py-24"><div className="container mx-auto px-4">
  <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold tracking-widest text-primary uppercase">AI-powered product finder</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Tell us what you need</h2><p className="mt-3 text-muted-foreground">Describe your flow, comfort or skin needs — we&apos;ll suggest the right pads.</p></div>
  <form className="mx-auto mt-8 max-w-2xl space-y-3" onSubmit={e=>{e.preventDefault();submit(query)}}>
   <textarea value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. I have a heavy flow at night and sensitive skin" maxLength={500} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"/>
   <div className="flex flex-wrap items-center gap-2">{EXAMPLES.map(ex=><button key={ex} type="button" onClick={()=>submit(ex)} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{ex}</button>)}<button type="submit" className="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={busy||query.trim().length<3}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}Find my match</button></div>
  </form>
  {results&&<div className="mt-10"><p className="mx-auto max-w-2xl text-center text-foreground">{results.message}</p>{results.products.length>0&&<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{results.products.map(p=><ZipProductCard key={p.id} product={p}/>)}</div>}</div>}
 </div></section>;
}

function ZipContactForm(){
 const [type,setType]=useState('contact'),[form,setForm]=useState({name:'',phone:'',email:'',city:'',message:''}),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setStatus('');try{const response=await fetch('/api/storefront/bulk-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,company_name:'',phone:form.phone,email:form.email,organisation_type:type,quantity:'',message:[form.city?'City: '+form.city:'',form.message].filter(Boolean).join('\n')})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Your enquiry could not be sent. Please try again.');setForm({name:'',phone:'',email:'',city:'',message:''});setStatus('Thank you. Our team will contact you shortly.');}catch(error){setStatus(error.message||'Your enquiry could not be sent. Please try again.')}finally{setBusy(false)}}
 return <section id="contact" className="bg-secondary/40 py-16 md:py-24"><div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
  <div><p className="text-xs font-semibold tracking-widest text-primary uppercase">Let&apos;s connect</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Care for every home, shop and community</h2><p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Send us a general question, become a retail partner, or ask about bulk supply for a school or NGO.</p><div className="mt-7 space-y-3 text-sm text-foreground"><p className="flex items-center gap-3"><Building2 className="text-primary"/>Retail and distributor partnerships</p><p className="flex items-center gap-3"><HeartHandshake className="text-primary"/>School, NGO and institutional orders</p></div></div>
  <form className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:grid-cols-2" onSubmit={submit}>
   <div className="sm:col-span-2"><label htmlFor="enquiry-type" className="mb-1 block text-sm font-medium text-foreground">I am interested in</label><select id="enquiry-type" value={type} onChange={e=>setType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="contact">General enquiry</option><option value="dealer">Dealer / distributor partnership</option><option value="bulk">School / NGO bulk order</option></select></div>
   <div><label htmlFor="lead-name" className="mb-1 block text-sm font-medium">Name</label><input id="lead-name" required minLength={2} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
   <div><label htmlFor="lead-phone" className="mb-1 block text-sm font-medium">Phone</label><input id="lead-phone" required inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
   <div><label htmlFor="lead-email" className="mb-1 block text-sm font-medium">Email</label><input id="lead-email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
   <div><label htmlFor="lead-city" className="mb-1 block text-sm font-medium">City</label><input id="lead-city" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></div>
   <div className="sm:col-span-2"><label htmlFor="lead-message" className="mb-1 block text-sm font-medium">Message</label><textarea id="lead-message" rows={4} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"/></div>
   <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send/>{busy?'Sending…':'Send enquiry'}</button>{status&&<p className="text-sm text-muted-foreground">{status}</p>}</div>
  </form>
 </div></section>;
}

function ZipNewsletter(){
 const [email,setEmail]=useState(''),[phone,setPhone]=useState(''),[whatsappOptIn,setWhatsappOptIn]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function submit(e){e.preventDefault();if(!email)return;setBusy(true);setStatus('');try{const response=await fetch('/api/storefront/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,phone,whatsapp_opt_in:whatsappOptIn,source:'homepage'})});const result=await response.json();if(!response.ok)throw new Error(result.error||'We couldn’t subscribe you. Please try again.');setEmail('');setPhone('');setWhatsappOptIn(false);setStatus(result.message||'Thanks! You’re on the Pink Box list.');}catch(error){setStatus(error.message||'We couldn’t subscribe you. Please try again.')}finally{setBusy(false)}}
 return <section className="container mx-auto px-4 py-16 md:py-20"><div className="rounded-[2rem] bg-gradient-brand px-6 py-14 text-center text-primary-foreground shadow-soft md:px-16">
  <Mail className="mx-auto h-8 w-8 opacity-90"/><h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Get ₹100 off your first order</h2><p className="mx-auto mt-3 max-w-lg text-sm opacity-90 md:text-base">Join our list for period care tips, new launches and subscriber-only offers. No spam, ever.</p>
  <form className="mx-auto mt-8 max-w-md" onSubmit={submit}><div className="flex flex-col gap-3 sm:flex-row"><input type="email" required aria-label="Email address" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" className="h-12 flex-1 rounded-full bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground"/><button type="submit" disabled={busy} className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-7 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-50">{busy?'Joining…':'Subscribe'}</button></div>
   <label className="mt-4 flex cursor-pointer items-start justify-center gap-2 text-xs opacity-90"><input type="checkbox" className="mt-0.5" checked={whatsappOptIn} onChange={e=>setWhatsappOptIn(e.target.checked)}/>Send me occasional WhatsApp offers too</label>
   {whatsappOptIn&&<input type="tel" required aria-label="WhatsApp number" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp number with country code" className="mt-3 h-12 w-full rounded-full bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground"/>}
   {status&&<p className="mt-3 text-xs opacity-90">{status}</p>}
  </form>
 </div></section>;
}

export function ZipFooter(){
 const links=[
  {title:'Shop',items:[['All Products','/shop'],['Your Cart','/cart'],['Track Order','/track-order'],['Bulk Orders','/#contact']]},
  {title:'Company',items:[['About Us','/about'],['Blog','/blog'],['FAQ','/faq'],['Contact','/#contact']]},
  {title:'Support',items:[['Shipping Policy','/pages/shipping-policy'],['Returns & Refunds','/pages/refund-policy'],['Privacy Policy','/pages/privacy-policy'],['Terms of Service','/pages/terms-conditions'],['Dealer Enquiry','/#contact']]}
 ];
 return <footer className="border-t border-border bg-secondary/40"><div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
  <div className="lg:col-span-2"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5"/></span><span className="font-display text-xl font-semibold text-foreground">Pink <span className="text-primary">Box</span></span></div>
   <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">Dermatologically safe, ultra-soft sanitary napkins made for everyday confidence. Trusted by families, schools and retailers across India.</p>
   <div className="mt-5 space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary"/>+91 73592 52000</p><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary"/>care@sakhicare.in</p><p className="flex items-center gap-2"><span className="text-primary">⌖</span>Ahmedabad, Gujarat, India</p></div>
  </div>
  {links.map(col=><div key={col.title}><h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">{col.title}</h3><ul className="mt-4 space-y-2.5">{col.items.map(([label,href])=><li key={label}><Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link></li>)}</ul></div>)}
 </div><div className="border-t border-border"><div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row"><p>© {new Date().getFullYear()} Pink Box. All rights reserved.</p><p>Made with care for every woman.</p></div></div></footer>;
}

export default function ZipReferenceHome({initialData}){
 const products=initialData?.products||[];
 const banners=initialData?.banners||[];
 return <div className="min-h-screen bg-background"><ZipHeader/><main>
  <ZipHero banners={banners}/><ZipCouponStrip/><ZipTrustBadges/>
  <section id="products" className="container mx-auto px-4 py-16 md:py-24"><div className="max-w-2xl"><p className="text-xs font-semibold tracking-widest text-primary uppercase">Our range</p><h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Pads for every day and every flow</h2></div><div className="mt-12"><ZipProductGrid products={products}/></div></section>
  <ZipProductFinder products={products}/><ZipAboutStrip/><ZipFeatures/><ZipTestimonials/><ZipContactForm/><ZipNewsletter/>
 </main><ZipFooter/></div>;
}
