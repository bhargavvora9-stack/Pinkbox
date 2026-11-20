import { ChevronDown } from 'lucide-react';
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
        <div className="mt-10 border-t border-border">
          {FAQS.map((item) => (
            <details key={item.q} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-all hover:underline [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="overflow-hidden pb-4 pt-0 text-sm text-muted-foreground">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
