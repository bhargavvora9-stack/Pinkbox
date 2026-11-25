import './globals.css';
import StorefrontAnalytics from '@/components/StorefrontAnalytics';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { createAdminClient } from '@/lib/supabase-admin';
import { getSiteUrl, limitMetaText } from '@/lib/seo';
import { Fraunces, Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

const defaultTitle = 'Sanitary Pads & Baby Diapers Online | PinkBox';
const defaultDescription = 'Shop sanitary pads, sanitary napkins, baby diapers and cotton tote bags online at PinkBox. Browse everyday essentials and bag designs across India.';
const defaultKeywords = [
  'sanitary pads online',
  'sanitary napkins online',
  'baby diapers online',
  '320mm sanitary pads',
  'cotton tote bags',
  'personalized tote bags',
  'menstrual care products',
  'PinkBox',
];

export async function generateMetadata() {
  let settings = null;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('website_settings')
      .select('website_name,meta_title,meta_description')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    settings = data;
  } catch {
    // Use safe site-level metadata if the store settings are temporarily unavailable.
  }

  const title = limitMetaText(settings?.meta_title || defaultTitle, 60);
  const description = limitMetaText(settings?.meta_description || defaultDescription, 160);
  const siteName = settings?.website_name || 'PinkBox';

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    applicationName: siteName,
    keywords: defaultKeywords,
    openGraph: {
      type: 'website',
      url: '/',
      siteName,
      title,
      description,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body><StorefrontAnalytics />{children}<ExitIntentPopup /><Analytics /></body>
    </html>
  );
}
