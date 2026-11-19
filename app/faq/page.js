import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';

const FAQS = [
  { q: 'Which pad should I choose?', a: 'Liners for light days, Day Pads for regular flow and XL Overnight Pads for heavy flow or nights. You can also use the product finder on our homepage.' },
  { q: 'How often should I change my pad?', a: 'Every 4–6 hours is a good rule, or sooner on heavy days.' },
  { q: 'Are your pads safe for sensitive skin?', a: 'Our pads use a soft, breathable top sheet designed to be gentle on skin.' },
  { q: 'Is delivery discreet?', a: 'Yes — every order ships in plain packaging.' },
  { q: 'Do you offer bulk or dealer pricing?', a: 'Yes. Send us a dealer or bulk enquiry from the contact form and our team will reach out.' },
  { q: 'When is delivery free?', a: 'Delivery is free on orders above ₹499.' },
];

export const metadata = {
  title: 'FAQ — Pads, Delivery & Orders | Pink Box',
  description: 'Answers to common questions about Pink Box pads, delivery and bulk orders.',
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="font-display text-3xl font-semibold text-foreground md:text-5xl">Frequently asked questions</h1>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQS.map((item, index) => (
            <details key={item.q} className="group p-5" open={index === 0}>
              <summary className="cursor-pointer list-none pr-8 text-left text-base font-semibold text-foreground marker:hidden">{item.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
