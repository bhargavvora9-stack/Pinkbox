'use client';
import { useEffect, useState } from 'react';
const EMPTY_SETTINGS = Object.freeze({});
import Link from 'next/link';
import { Flower2, Mail, MapPin, Phone, MessageCircle } from 'lucide-react';

const LINKS = [
 {title:'Shop',items:[{label:'All Products',href:'/shop'},{label:'Sanitary Pads',href:'/collections/sanitary-pads'},{label:'Baby Diapers',href:'/collections/baby-diapers'},{label:'Tote Bags',href:'/collections/bags'},{label:'Your Cart',href:'/cart'},{label:'Track Order',href:'/track-order'},{label:'Bulk Orders',href:'/#contact'}]},
 {title:'Company',items:[{label:'About Us',href:'/about'},{label:'Blog',href:'/blog'},{label:'FAQ',href:'/faq'},{label:'Contact',href:'/#contact'}]},
 {title:'Support',items:[{label:'Shipping Policy',href:'/policies/shipping'},{label:'Returns & Refunds',href:'/policies/returns'},{label:'Privacy Policy',href:'/policies/privacy'},{label:'Terms of Service',href:'/policies/terms'},{label:'Dealer Enquiry',href:'/#contact'}]},
];

function SocialIcon({name}){
 if(name==='Instagram') return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
 if(name==='Facebook') return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.4 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.4-.1-2.7-.1-2.7 0-4.6 1.6-4.6 4.8v1.8H6.6v3.2h2.8V21h4z"/></svg>;
 return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5.2" width="19" height="13.6" rx="4" fill="currentColor"/><path d="M10 8.8v6.4l5.4-3.2L10 8.8z" fill="white"/></svg>;
}

export default function ZipReferenceFooter({settings=EMPTY_SETTINGS}){
 const [siteSettings,setSiteSettings]=useState(settings||{});
 const [footerData,setFooterData]=useState(null);
 useEffect(()=>{
  let active=true;
  fetch('/api/storefront/settings',{cache:'no-store'})
   .then(response=>response.ok?response.json():null)
   .then(data=>{if(active&&data){if(data.settings)setSiteSettings({...settings,...data.settings});setFooterData(data.footer||null)}})
   .catch(()=>{});
  return ()=>{active=false};
 },[settings]);
 const currentSettings=siteSettings||settings||{};
 const phone=currentSettings.phone||'6358218366';
 const email=currentSettings.email||'24caresurat@gmail.com';
 const address=currentSettings.address||'Surat, Gujarat, India';
 const name=currentSettings.website_name||'PinkBox';
 const whatsappRaw=String(currentSettings.whatsapp_number||currentSettings.phone||'6358218366').replace(/\D/g,'');
 const whatsappNumber=whatsappRaw.length===10?'91'+whatsappRaw:whatsappRaw;
 const whatsappUrl=whatsappNumber?'https://wa.me/'+whatsappNumber+'?text='+encodeURIComponent('Hello PinkBox, I need help with an order.') : null;
 const configuredSocial=footerData?.social_links||{};
 const socialLinks=[
  {url:configuredSocial.Instagram||configuredSocial.instagram||currentSettings.instagram_url,label:'Instagram'},
  {url:configuredSocial.Facebook||configuredSocial.facebook||currentSettings.facebook_url,label:'Facebook'},
  {url:configuredSocial.YouTube||configuredSocial.youtube||currentSettings.youtube_url,label:'YouTube'},
 ].filter((item)=>item.url);
 const footerColumns=Array.isArray(footerData?.columns)&&footerData.columns.length?footerData.columns:LINKS;
 const copyright=String(footerData?.copyright_text||'© {year} {name}. All rights reserved.').replaceAll('{year}',String(new Date().getFullYear())).replaceAll('{name}',name);
 return (
  <footer className="border-t border-border bg-secondary/40">
   <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
    <div className="lg:col-span-2">
     <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground"><Flower2 className="h-5 w-5"/></span><span className="font-display text-xl font-semibold text-foreground">PinkBox</span></div>
     <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">Dermatologically safe, ultra-soft sanitary napkins made for everyday confidence. Trusted by families, schools and retailers across India.</p>
     <div className="mt-5 space-y-2 text-sm text-muted-foreground">
      <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary"/>{phone}</p>
      <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary"/>{email}</p>
      <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary"/>{address}</p>
     </div>
     {socialLinks.length>0 && <div className="mt-5 flex items-center gap-3" aria-label="Social media links">
      {socialLinks.map(({url,label})=><a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><SocialIcon name={label}/></a>)}
     </div>}
    </div>
    {footerColumns.map((col,index)=><div key={col.id||col.title||index}><h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{col.title}</h2><ul className="mt-4 space-y-2.5">{(col.items||[]).map((item,itemIndex)=><li key={item.id||item.label||itemIndex}><Link href={item.href||item.url||'/'} className="text-sm text-muted-foreground transition-colors hover:text-primary">{item.label||item.title||'Link'}</Link></li>)}</ul></div>)}
   </div>
   <div className="border-t border-border"><div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row"><p>{copyright}</p><p>Made with care for every woman.</p></div></div>
   {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Chat with PinkBox on WhatsApp" title="Chat with PinkBox on WhatsApp" className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:bottom-6"><MessageCircle className="h-7 w-7" /></a>}
  </footer>
 );
}
