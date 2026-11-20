export const metadata = {
  title: 'Track Your Order | Pink Box',
  description: 'Enter your Pink Box order number and checkout mobile number to check your order status and delivery updates.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Track Your Order | Pink Box',
    description: 'Enter your Pink Box order number and checkout mobile number to check your order status and delivery updates.',
    type: 'website',
  },
  twitter: { card: 'summary' },
};

export default function TrackOrderLayout({ children }) {
  return children;
}
