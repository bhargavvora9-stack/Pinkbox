import './globals.css';
import './responsive-layout.css';
import StorefrontAnalytics from '@/components/StorefrontAnalytics';
import WebsiteImageDisplayFix from '@/components/WebsiteImageDisplayFix';
import { getSiteUrl } from '@/lib/seo';

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'PinkBox',
  description: 'PinkBox public storefront and secure website admin.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><StorefrontAnalytics /><WebsiteImageDisplayFix />{children}</body></html>;
}
