import './pinkbox-home.css';
import Link from 'next/link';
import PinkBoxHome from '../components/PinkBoxHome';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStoreMeta() {
  const db = createAdminClient();
  const { data } = await db.from('website_settings').select('website_name,meta_title,meta_description,logo_url').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  return data;
}

export async function generateMetadata() {
  const s = await getStoreMeta();
  const name = s?.website_name || 'PinkBox';
  const title = s?.meta_title || `${name} — Soft, Safe & Skin-Friendly Sanitary Pads`;
  const description = s?.meta_description || 'PinkBox offers ultra-soft, dermatologist-friendly sanitary pads with long-lasting protection. ISO-certified, lab-tested and delivered discreetly across India.';
  return {
    title,
    description,
    openGraph: { title, description, images: s?.logo_url ? [s.logo_url] : undefined, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') || undefined },
  };
}

export default async function HomePage(){
  const s = await getStoreMeta();
  const name = s?.website_name || 'PinkBox';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description: s?.meta_description || undefined,
    logo: s?.logo_url || undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <PinkBoxHome />
    <section aria-labelledby="sanitary-care-seo" className="pb-home-seo-footer">
      <div className="pb-home-seo-footer-inner">
        <p className="pb-home-seo-eyebrow">PINKBOX SANITARY CARE</p>
        <h2 id="sanitary-care-seo">Sanitary Pads & Sanitary Napkins Online</h2>
        <p>Shop sanitary pads and sanitary napkins online at PinkBox. Explore 320mm sanitary pads, heavy-flow sanitary pads, cottony-surface pads, anti-bacterial sanitary pads and trusted 24 Care and 7 Soft options.</p>
        <nav aria-label="Sanitary care links" className="pb-home-seo-links">
          <Link href="/pages/sanitary-pads">Sanitary Pads</Link>
          <Link href="/pages/320mm-sanitary-pads">320mm Sanitary Pads</Link>
          <Link href="/pages/sanitary-pads-for-heavy-flow">Sanitary Pads for Heavy Flow</Link>
          <Link href="/pages/anti-bacterial-sanitary-pads">Anti-Bacterial Sanitary Pads</Link>
          <Link href="/pages/24-care-sanitary-pads">24 Care Sanitary Pads</Link>
          <Link href="/pages/7-soft-sanitary-pads">7 Soft Sanitary Pads</Link>
          <Link href="/collections/sanitary-pads">Shop Sanitary Pads</Link>
          <Link href="/blog">Sanitary Pad Guides</Link>
        </nav>
      </div>
    </section>
    <style dangerouslySetInnerHTML={{__html:`
      .pb-home-hero-art>img,.pb-category-card img,.pb-journal-thumb img,.pb-home-custom img{object-fit:contain!important}
      .pb-home-hero-art>img,.pb-category-card img,.pb-journal-thumb img{background:#f7f1ee}
      .pb-home-seo-footer{width:min(1260px,100%);margin:0 auto;padding:10px 28px 54px;color:#6a4b4e}
      .pb-home-seo-footer-inner{padding:28px 30px;border:1px solid #eadfd9;border-radius:22px;background:#fffaf8}
      .pb-home-seo-eyebrow{margin:0 0 7px;font-size:10px;font-weight:800;letter-spacing:.12em;color:#c36f83}
      .pb-home-seo-footer h2{margin:0;font:500 clamp(1.35rem,3vw,2rem)/1.2 Georgia,"Times New Roman",serif}
      .pb-home-seo-footer p:not(.pb-home-seo-eyebrow){max-width:900px;margin:10px 0 0;color:#846f70;font-size:13px;line-height:1.7}
      .pb-home-seo-links{display:flex;flex-wrap:wrap;gap:9px;margin-top:17px}
      .pb-home-seo-links a{padding:8px 12px;border:1px solid #ead0d6;border-radius:999px;background:#fff;color:#815d65;font-size:11px;font-weight:700}
      .pb-home-seo-links a:hover{border-color:#d8899d;color:#c36f83}
    `}} />
  </>;
}
