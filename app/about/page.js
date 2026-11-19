import Link from 'next/link';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';

const VALUES = [
  { t: 'Comfort first', d: 'Soft, breathable layers designed for all-day wear.' },
  { t: 'Honest care', d: 'Clear information about what goes into every pad.' },
  { t: 'For everyone', d: 'Affordable packs plus bulk supply for schools and NGOs.' },
];

export const metadata = {
  title: 'About Pink Box — Comfort for every cycle',
  description: 'Pink Box makes soft, rash-free sanitary pads so every woman can feel comfortable and confident.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader />
      <main>
        <section className="container mx-auto grid items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Our story</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-5xl">Comfort for every cycle</h1>
            <p className="mt-5 leading-relaxed text-muted-foreground">Pink Box was started to make periods a little easier — with pads that feel soft, stay put and are kind to skin. We believe every woman deserves reliable protection without compromise.</p>
            <Link href="/shop" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Shop our range</Link>
          </div>
          <img src="/zip-reference/about-strip.jpg" alt="Pink Box comfort" width="1024" height="1024" loading="lazy" className="rounded-2xl object-cover" />
        </section>
        <section className="bg-secondary/40 py-16">
          <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
            {VALUES.map((value) => <div key={value.t} className="rounded-xl bg-background p-6"><h2 className="font-display text-xl font-semibold text-foreground">{value.t}</h2><p className="mt-2 text-muted-foreground">{value.d}</p></div>)}
          </div>
        </section>
      </main>
      <ZipReferenceFooter />
    </div>
  );
}
