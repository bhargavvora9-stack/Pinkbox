import './pinkbox-home.css';
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
  </>;
}
