import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import HandBagsCatalog from '@/components/HandBagsCatalog';
import { HAND_BAGS } from '@/lib/handbags-catalog';

export const metadata = {
  title: 'Hand Bags Collection | PinkBox',
  description: 'Explore 35 tote, office and mini hand bag designs at PinkBox.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/hand-bags' },
};

export default function HandBagsPage() {
  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader />
      <main>
        <section className="border-b border-primary/20 bg-gradient-soft">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-primary">PinkBox Collection</p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">Hand Bags</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Explore tote bags, office bags and mini designs. Open any design to view its photos and PinkBox price.</p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Online ordering for this collection will open soon.</p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <HandBagsCatalog products={HAND_BAGS} />
        </section>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
