export const metadata = {
  title: 'Your Cart | Pink Box',
  description: 'Review your Pink Box cart and check out securely.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Your Cart | Pink Box',
    description: 'Review your Pink Box cart and check out securely.',
    type: 'website',
  },
  twitter: { card: 'summary' },
};

export default function CartLayout({ children }) {
  return children;
}
