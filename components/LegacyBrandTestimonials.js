import { Star } from 'lucide-react';

const LEGACY_24CARE_TESTIMONIALS = [
  {
    name: 'Neha K.',
    productUse: 'XL (280mm) · Day Use',
    quote: "Finally found a pad that is comfortable AND affordable. Highly recommend 24Care to all girls!",
  },
  {
    name: 'Priya R.',
    productUse: 'XXL (320mm) · Night Use',
    quote: 'I use XXL at night and it gives me the extra coverage I need. It feels comfortable throughout the night.',
  },
  {
    name: 'Anjali S.',
    productUse: 'XL (280mm) · Day Use',
    quote: 'Super soft and comfortable. It has become my go-to choice for everyday period care.',
  },
  {
    name: 'Riya M.',
    productUse: 'XL (280mm) · Day Use',
    quote: 'The wings stay in place really well and the pad feels comfortable while moving.',
  },
  {
    name: 'Sneha P.',
    productUse: 'XXL (320mm) · Night Use',
    quote: 'The XXL size gives me the additional coverage I prefer during heavier-flow and night-time use.',
  },
];

export default function LegacyBrandTestimonials() {
  return (
    <section
      className="mt-16 border-t border-border pt-10"
      aria-labelledby="legacy-24care-testimonials-title"
    >
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          From our previous 24care.in website
        </p>
        <h2
          id="legacy-24care-testimonials-title"
          className="mt-2 text-2xl font-bold text-foreground sm:text-3xl"
        >
          24 Care Customer Stories
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Earlier customer testimonials, kept with their original size and usage labels.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEGACY_24CARE_TESTIMONIALS.map((testimonial) => (
          <li
            key={testimonial.name}
            className="flex h-full flex-col rounded-2xl border border-primary/20 bg-card p-5 shadow-sm"
          >
            <div
              className="flex gap-1 text-primary"
              aria-label="5 out of 5 stars"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-sm font-medium leading-relaxed text-foreground">
              “{testimonial.quote}”
            </blockquote>
            <div className="mt-5 border-t border-border pt-3">
              <p className="font-semibold text-foreground">{testimonial.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{testimonial.productUse}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        These testimonials were carried over from the previous 24care.in website. They are not marked as PinkBox verified purchases.
      </p>
    </section>
  );
}
