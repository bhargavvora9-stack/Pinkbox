'use client';
import { useEffect, useState } from 'react';
const EMPTY_SETTINGS = Object.freeze({});
import Link from 'next/link';
import { Facebook, Flower2, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';

const LINKS = [
 {title:'Shop',items:[{label:'All Products',href:'/shop'},{label:'Your Cart',href:'/cart'},{label:'Track Order',href:'/track-order'},{label:'Bulk Orders',href:'/#contact'}]},
 {title:'Company',items:[{label:'About Us',href:'/about'},{label:'Blog',href:'/blog'},{label:'FAQ',href:'/faq'},{label:'Contact',href:'/#contact'}]},
 {title:'Support',items:[{label:'Shipping Policy',href:'/policies/shipping'},{label:'Returns & Refunds',href:'/policies/returns'},{label:'Privacy Policy',href:'/policies/privacy'},{label:'Terms of Service',href:'/policies/terms'},{label:'Dealer Enquiry',href:'/#contact'}]},
];

export default function ZipReferenceFooter({settings=EMPTY_SETTINGS}){
 const [siteSettings,setSiteSettings]=useState(settings||{});
 useEffect(()=>{
  if(Object.keys(settings||{}).length){setSiteSettings(settings);return;}
  let active=true;
  fetch('/api/storefront/settings',{cache:'no-store'})
   .then(response=>response.ok?response.json():null)
   .then(data=>{if(active&&data?.settings)setSiteSettings(data.settings)})
   .catch(()=>{});
  return ()=>{active=false};
 },[settings]);
 const currentSettings=siteSettings||settings||{};
 const phone=currentSettings.phone||'+91 73592 52000';
 const email=currentSettings.email||'care@sakhicare.in';
 const address=currentSettings.address||'Ahmedabad, Gujarat, India';
 const name=currentSettings.website_name||'Pink Box';
 const socialLinks=[
  {url:currentSettings.instagram_url,label:'Instagram',Icon:Instagram},
  {url:currentSettings.facebook_url,label:'Facebook',Icon:Facebook},
  {url:currentSettings.youtube_url,label:'YouTube',Icon:Youtube},
 ].filter((item)=>item.url);
 return (
  <footer className="border-t border-border bg-secondary/40">
   <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
    <div className="lg:col-span-2">
     <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5"/></span><span className="font-display text-xl font-semibold text-foreground">Pink <span className="text-primary">Box</span></span></div>
     <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">Dermatologically safe, ultra-soft sanitary napkins made for everyday confidence. Trusted by families, schools and retailers across India.</p>
     <div className="mt-5 space-y-2 text-sm text-muted-foreground">
      <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary"/>{phone}</p>
      <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary"/>{email}</p>
      <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary"/>{address}</p>
     </div>
     {socialLinks.length>0 && <div className="mt-5 flex items-center gap-3" aria-label="Social media links">
      {socialLinks.map(({url,label,Icon})=><a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Icon className="h-5 w-5" aria-hidden="true"/></a>)}
     </div>}
    </div>
    {LINKS.map((col)=><div key={col.title}><h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">{col.title}</h3><ul className="mt-4 space-y-2.5">{col.items.map((item)=><li key={item.label}><Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">{item.label}</Link></li>)}</ul></div>)}
   </div>
   <div className="border-t border-border"><div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row"><p>© {new Date().getFullYear()} {name}. All rights reserved.</p><p>Made with care for every woman.</p></div></div>
  </footer>
 );
}
