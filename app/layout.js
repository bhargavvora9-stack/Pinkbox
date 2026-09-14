import './globals.css';
import './responsive-layout.css';
import StorefrontAnalytics from '@/components/StorefrontAnalytics';

export const metadata = {
  title: 'PinkBox',
  description: 'PinkBox public storefront and secure website admin.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><StorefrontAnalytics />{children}</body></html>;
}
