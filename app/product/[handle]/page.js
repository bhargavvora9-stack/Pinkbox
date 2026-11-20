import { permanentRedirect } from 'next/navigation';

export default async function LegacyProductPage({ params }) {
  const { handle } = await params;
  permanentRedirect(`/products/${encodeURIComponent(handle)}`);
}
