import Link from 'next/link';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase-admin';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function getProducts() {
  const db = createAdminClient();
  const { data: settings, error: settingsError } = await db
    .from('website_settings')
    .select('company_id')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (settingsError) throw new Error(settingsError.message);
  if (!settings?.company_id) return [];

  const { data: products, error: productsError } = await db
    .from('website_products')
    .select('id,sku,title,slug,brand,price,compare_at_price,is_active')
    .eq('company_id', settings.company_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (productsError) throw new Error(productsError.message);

  const ids = (products || []).map((product) => product.id);
  const { data: images, error: imagesError } = ids.length
    ? await db.from('website_product_images')
        .select('product_id,image_url,is_primary,sort_order')
        .eq('company_id', settings.company_id)
        .in('product_id', ids)
        .order('sort_order')
    : { data: [], error: null };

  if (imagesError) throw new Error(imagesError.message);

  const imageMap = {};
  for (const image of images || []) {
    if (!imageMap[image.product_id] || image.is_primary) {
      imageMap[image.product_id] = image.image_url;
    }
  }

  return (products || []).filter((product) => Number(product.price || 0) > 0).map((product) => ({
    ...product,
    image_url: imageMap[product.id] || null,
  }));
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-10 text-[#6a4b4e]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[#c36f83]">← PinkBox</Link>
          <div className="flex items-center gap-4">
            <Link href="/account" className="text-sm font-semibold">Account</Link>
            <Link href="/cart" aria-label="Cart" className="inline-flex items-center gap-2 text-sm font-semibold">Cart</Link>
          </div>
        </div>

        <header className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#c36f83]">PinkBox</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-tight">Our products</h1>
          <p className="mt-3 max-w-2xl text-[#846f70]">Browse the current PinkBox range. Select a product to view details, images and ordering options.</p>
        </header>

        {!products.length ? (
          <div className="mt-10 rounded-3xl border border-dashed border-[#eadfd9] bg-white p-12 text-center text-[#846f70]">
            No active products are available yet.
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
            {products.map((product) => (
              <Link
                href={`/products/${product.slug}`}
                key={product.id}
                className="group rounded-3xl border border-[#eadfd9] bg-white p-3 shadow-sm transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f6eeeb]">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.title}
                      fill
                      sizes="(max-width:768px) 50vw, 25vw"
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-6xl font-black text-[#d8899d]/35">PB</div>
                  )}
                </div>
                <p className="mt-3 text-xs text-[#a08488]">{product.brand || product.sku || 'PinkBox'}</p>
                <h2 className="mt-1 font-bold text-[#5f4649]">{product.title}</h2>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-black">
                    {money(product.price)}
                    {Number(product.compare_at_price) > Number(product.price || 0) && (
                      <del className="ml-1 text-xs font-normal text-gray-400">{money(product.compare_at_price)}</del>
                    )}
                  </div>
                  <span className="rounded-full bg-[#fff0f5] p-2 text-[#d9295f]">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
