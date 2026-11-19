import { notFound } from 'next/navigation';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';

const INFO_PAGES = {
  shipping: {
    title: 'Shipping Policy',
    description: 'How and when Pink Box orders are delivered.',
    sections: [
      { heading: 'Delivery areas', body: 'We currently ship across India.' },
      { heading: 'Delivery time', body: 'Orders are dispatched within 1–2 working days and usually arrive in 3–7 working days.' },
      { heading: 'Shipping charges', body: 'Free delivery on orders above ₹499. A small delivery fee is shown at checkout for smaller orders.' },
      { heading: 'Discreet packaging', body: 'Every order ships in plain, discreet packaging.' },
    ],
  },
  returns: {
    title: 'Returns & Refunds',
    description: 'Our policy on returns, replacements and refunds.',
    sections: [
      { heading: 'Hygiene products', body: 'For hygiene reasons, opened packs cannot be returned.' },
      { heading: 'Damaged or wrong items', body: 'If your order arrives damaged or incorrect, contact us within 7 days of delivery with a photo and we will replace it or refund you.' },
      { heading: 'Refund timeline', body: 'Approved refunds are processed to the original payment method within 5–7 working days.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'How Pink Box collects and uses your information.',
    sections: [
      { heading: 'What we collect', body: 'Your name, contact details and order information when you shop, subscribe or send an enquiry.' },
      { heading: 'How we use it', body: 'To process orders, reply to enquiries and — only if you opt in — send offers by email or WhatsApp.' },
      { heading: 'Your choices', body: 'You can unsubscribe at any time or ask us to delete your data by contacting us.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description: 'Terms for using the Pink Box website.',
    sections: [
      { heading: 'Orders', body: 'All orders are subject to availability and confirmation of payment.' },
      { heading: 'Pricing', body: 'Prices are in INR and include applicable taxes unless stated otherwise.' },
      { heading: 'Health note', body: 'Our products are for personal hygiene. For medical concerns, please consult a doctor.' },
    ],
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) return { title: 'Not found | Pink Box', robots: { index: false } };
  return { title: page.title + ' | Pink Box', description: page.description };
}

export default async function PolicyPage({ params }) {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) notFound();
  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="font-display text-3xl font-semibold text-foreground md:text-5xl">{page.title}</h1>
        <p className="mt-3 text-muted-foreground">{page.description}</p>
        <div className="mt-10 space-y-8">
          {page.sections.map((section) => <section key={section.heading}><h2 className="font-display text-xl font-semibold text-foreground">{section.heading}</h2><p className="mt-2 leading-relaxed text-muted-foreground">{section.body}</p></section>)}
        </div>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
