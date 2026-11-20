import Link from 'next/link';
import { Flower2, Mail, MapPin, Phone, Instagram, Facebook, Youtube } from 'lucide-react';
const LINKS = [
 {title:'Shop',items:[{label:'All Products',href:'/shop'},{label:'Your Cart',href:'/cart'},{label:'Track Order',href:'/track-order'},{label:'Bulk Orders',href:'/#contact'}]},
 {title:'Company',items:[{label:'About Us',href:'/about'},{label:'Blog',href:'/blog'},{label:'FAQ',href:'/faq'},{label:'Contact',href:'/#contact'}]},
 {title:'Support',items:[{label:'Shipping Policy',href:'/policies/shipping'},{label:'Returns & Refunds',href:'/policies/returns'},{label:'Privacy Policy',href:'/policies/privacy'},{label:'Terms of Service',href:'/policies/terms'},{label:'Dealer Enquiry',href:'/#contact'}]},
];
export default function ZipReferenceFooter({settings={}}){
 const phone=settings.phone||'+91 73592 52000';
 const email=settings.email||'care@sakhicare.in';
 const address=settings.address||'Ahmedabad, Gujarat, India';
 const name=settings.website_name||'Pink Box';
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
     {(settings.instagram_url || settings.facebook_url || settings.youtube_url) && <div className="mt-5 flex flex-wrap items-center gap-4">
      {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary"><Instagram className="h-5 w-5"/></a>}
      {settings.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook className="h-5 w-5"/></a>}
      {settings.youtube_url && <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-muted-foreground hover:text-primary"><Youtube className="h-5 w-5"/></a>}
     </div>}
    </div>
    {LINKS.map((col)=><div key={col.title}><h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">{col.title}</h3><ul className="mt-4 space-y-2.5">{col.items.map((item)=><li key={item.label}><Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">{item.label}</Link></li>)}</ul></div>)}
   </div>
   <div className="border-t border-border"><div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row"><p>© {new Date().getFullYear()} {name}. All rights reserved.</p><p>Made with care for every woman.</p></div></div>
  </footer>
 );
}
