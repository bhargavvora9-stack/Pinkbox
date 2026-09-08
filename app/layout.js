import './globals.css';
import './product-modal.css';
import './product-gallery-fix.css';
import PinkBoxProductGalleryFix from '@/components/PinkBoxProductGalleryFix';

export const metadata = {
  title: 'PinkBox',
  description: 'PinkBox public storefront and secure website admin.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><PinkBoxProductGalleryFix />{children}</body></html>;
}