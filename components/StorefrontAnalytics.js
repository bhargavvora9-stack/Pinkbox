'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Script from 'next/script';

export default function StorefrontAnalytics(){
  const pathname=usePathname();
  const [ids,setIds]=useState(null);
  const isAdmin=pathname?.startsWith('/admin')||pathname?.startsWith('/website')||pathname?.startsWith('/login');
  useEffect(()=>{
    if(isAdmin)return;
    fetch('/api/storefront',{cache:'no-store'}).then(r=>r.json()).then(j=>{
      const s=j?.settings||{};
      setIds({ga4:s.ga4_measurement_id||'',pixel:s.meta_pixel_id||''});
    }).catch(()=>{});
  },[isAdmin]);
  if(isAdmin||!ids||(!ids.ga4&&!ids.pixel))return null;
  return <>
    {ids.ga4&&<>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids.ga4}`} strategy="afterInteractive"/>
      <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ids.ga4}');`}</Script>
    </>}
    {ids.pixel&&<Script id="meta-pixel-init" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ids.pixel}');fbq('track','PageView');`}</Script>}
  </>;
}
