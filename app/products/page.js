import ProductsCatalogClient from '@/components/ProductsCatalogClient';

export const metadata = {
  title: 'Sanitary Pads & Baby Diapers | PinkBox Products',
  description: 'Shop PinkBox sanitary pads, baby diapers and everyday hygiene products with soft materials, reliable protection and discreet delivery across India.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'Sanitary Pads & Baby Diapers | PinkBox Products',
    description: 'Shop PinkBox sanitary pads, baby diapers and everyday hygiene products across India.',
    type: 'website',
    url: '/products',
  },
};

export default function ProductsPage() {
  return <ProductsCatalogClient />;
}
