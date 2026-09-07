import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#24141b]">
      <header className="sticky top-0 z-20 border-b border-[#eadbe2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#d9295f]">
            PinkBox
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#shop" className="hover:text-[#d9295f]">Shop</a>
            <a href="#why-us" className="hover:text-[#d9295f]">Why PinkBox</a>
            <a href="#contact" className="hover:text-[#d9295f]">Contact</a>
          </nav>
          <Link href="/login" className="rounded-full bg-[#24141b] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            Admin Login
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 lg:grid-cols-2 lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <span className="inline-flex rounded-full bg-[#fde5ee] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b61f50]">
            Care made simple
          </span>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.03] tracking-tight sm:text-6xl">
            Everyday care products, delivered with confidence.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#725e66]">
            Welcome to PinkBox — a clean, modern storefront for discovering reliable personal-care essentials at the right price.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#shop" className="rounded-full bg-[#d9295f] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
              Explore Products
            </a>
            <a href="#why-us" className="rounded-full border border-[#dccbd3] bg-white px-6 py-3.5 text-sm font-bold transition hover:border-[#d9295f] hover:text-[#d9295f]">
              Why PinkBox?
            </a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-[#eadbe2] pt-6">
            <Stat value="100%" label="Care focused" />
            <Stat value="24/7" label="Online access" />
            <Stat value="Easy" label="Shopping" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 rounded-[3rem] bg-[#fbdce8] blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#ead5de] bg-white p-6 shadow-xl">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-[#d9295f] to-[#ef7fa5] p-7 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">PinkBox</p>
                  <h2 className="mt-2 text-3xl font-black">Feel fresh.<br />Feel confident.</h2>
                </div>
                <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">New</div>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3">
                <MiniCard title="Daily Care" text="Comfort-first essentials" />
                <MiniCard title="Smart Value" text="Quality without fuss" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-5 text-center text-xs font-semibold text-[#725e66]">
              <div className="rounded-xl bg-[#fff4f7] p-3">Quality</div>
              <div className="rounded-xl bg-[#fff4f7] p-3">Comfort</div>
              <div className="rounded-xl bg-[#fff4f7] p-3">Trust</div>
            </div>
          </div>
        </div>
      </section>

      <section id="shop" className="border-y border-[#eadbe2] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9295f]">Shop</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Popular categories</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#725e66]">The storefront is public. Product catalogue, inventory, orders and website content are managed securely from the admin side.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <CategoryCard title="Daily Essentials" text="Comfortable products for everyday routines." />
            <CategoryCard title="Personal Care" text="Thoughtful care choices for you and your family." />
            <CategoryCard title="Value Picks" text="Practical products at prices that make sense." />
          </div>
        </div>
      </section>

      <section id="why-us" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9295f]">Why PinkBox</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">A storefront built around simplicity.</h2>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          <Feature title="Clean experience" text="Simple navigation and clear product discovery across desktop and mobile." />
          <Feature title="Trusted operations" text="Admin tools handle inventory, orders, customers and website settings behind login." />
          <Feature title="Ready to grow" text="The storefront can expand into richer catalog, checkout, content and marketing features." />
        </div>
      </section>

      <section id="contact" className="bg-[#24141b] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-14 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold text-[#ffadc6]">PinkBox</p>
            <h2 className="mt-2 text-3xl font-black">Your public website is live separately from admin.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Customers stay on the public storefront. Your team enters the protected backend through the login page.</p>
          </div>
          <Link href="/login" className="shrink-0 rounded-full bg-white px-6 py-3 font-bold text-[#24141b]">Open Admin Login</Link>
        </div>
      </section>

      <footer className="border-t border-[#eadbe2] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-[#725e66] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} PinkBox. All rights reserved.</span>
          <span>Public Website · Secure Admin</span>
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label }) {
  return <div><div className="text-xl font-black">{value}</div><div className="mt-1 text-xs text-[#8a747d]">{label}</div></div>;
}

function MiniCard({ title, text }) {
  return <div className="rounded-2xl bg-white/12 p-4"><div className="text-sm font-bold">{title}</div><div className="mt-1 text-xs leading-5 text-white/75">{text}</div></div>;
}

function CategoryCard({ title, text }) {
  return <div className="rounded-3xl border border-[#eadbe2] bg-[#fff8fb] p-6 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fde5ee] text-lg font-black text-[#d9295f]">P</div><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#725e66]">{text}</p><a href="#contact" className="mt-5 inline-flex text-sm font-bold text-[#d9295f]">Learn more →</a></div>;
}

function Feature({ title, text }) {
  return <div className="rounded-3xl border border-[#eadbe2] bg-white p-6"><h3 className="text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#725e66]">{text}</p></div>;
}
