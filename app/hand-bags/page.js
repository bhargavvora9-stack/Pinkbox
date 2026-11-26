import { permanentRedirect } from 'next/navigation';

export const metadata = {
  title: 'Bags Collection | PinkBox',
  description: 'Explore all PinkBox bag designs in one collection.',
  alternates: { canonical: '/collections/bags' },
};

export default function HandBagsPage() {
  permanentRedirect('/collections/bags');
}
