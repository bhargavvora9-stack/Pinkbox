import { permanentRedirect } from 'next/navigation';

export const metadata = {
  title: 'Hand Bags Collection | PinkBox',
  description: 'Explore EcoCarry hand bags at PinkBox.',
  alternates: { canonical: '/collections/hand-bags' },
};

export default function HandBagsPage() {
  permanentRedirect('/collections/hand-bags');
}
