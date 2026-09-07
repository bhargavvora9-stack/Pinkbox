import './globals.css';

export const metadata = {
  title: 'PinkBox',
  description: 'PinkBox public storefront and secure website admin.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
