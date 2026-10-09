import './globals.css';
import './responsive-layout.css';
import StorefrontAnalytics from '@/components/StorefrontAnalytics';
import WebsiteImageDisplayFix from '@/components/WebsiteImageDisplayFix';
import { createAdminClient } from '@/lib/supabase-admin';
import { getSiteUrl } from '@/lib/seo';

const defaultTitle = 'Sanitary Pads & Baby Diapers Online | PinkBox';
const defaultDescription = 'Shop sanitary pads, sanitary napkins and baby diapers online at PinkBox. Compare 320mm and everyday hygiene products, check current prices and order for delivery across India.';
const defaultKeywords = [
  'sanitary pads online',
  'sanitary napkins online',
  'baby diapers online',
  '320mm sanitary pads',
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

  const title = settings?.meta_title || defaultTitle;
  const description = settings?.meta_description || defaultDescription;
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
  return <html lang="en"><body><StorefrontAnalytics /><WebsiteImageDisplayFix />{children}</body></html>;
}
