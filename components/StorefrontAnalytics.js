'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const PRODUCTION_HOST = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app'
    ).hostname.toLowerCase();
  } catch {
    return 'mypinkbox.vercel.app';
  }
})();

export default function StorefrontAnalytics() {
  const pathname = usePathname();
  const previousPath = useRef(null);
  const [ids, setIds] = useState(null);
  const isAdmin = pathname?.startsWith('/admin')
    || pathname?.startsWith('/website')
    || pathname?.startsWith('/login');
  const isProductionHost = typeof window !== 'undefined'
    && window.location.hostname.toLowerCase() === PRODUCTION_HOST;

  useEffect(() => {
    // Never send local development or Vercel preview activity to production
    // analytics. This also avoids loading store settings solely for tracking.
    if (isAdmin || !isProductionHost) return;

    fetch('/api/storefront', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const s = j?.settings || {};
        setIds({ ga4: s.ga4_measurement_id || '', pixel: s.meta_pixel_id || '' });
      })
      .catch(() => {});
  }, [isAdmin, isProductionHost]);

  useEffect(() => {
    if (isAdmin || !isProductionHost || !ids?.ga4 || !pathname) return;

    if (previousPath.current === null) {
      previousPath.current = pathname;
      return;
    }

    if (previousPath.current !== pathname) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_location: window.location.href,
          page_path: pathname,
        });
      }
      previousPath.current = pathname;
    }
  }, [isAdmin, isProductionHost, ids?.ga4, pathname]);

  if (isAdmin || !isProductionHost || !ids || (!ids.ga4 && !ids.pixel)) return null;

  return (
    <>
      {ids.ga4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.ga4)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ids.ga4}');`}
          </Script>
        </>
      )}
      {ids.pixel && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ids.pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
