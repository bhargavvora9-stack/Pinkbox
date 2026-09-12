import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import ProductPurchasePanel from '@/components/ProductPurchasePanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProduct(slug) {
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id,website_name').eq('slug', 'pinkbox').eq('status', 'active').maybeSingle();
  if (!settings) return null;

  const { data: product } = await db
    .from('website_products')
    .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,allow_backorder,seo_title,seo_description,is_active')
    .eq('company_id', settings.company_id)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (!product) return null;

  // Product id is already scoped to the active PinkBox company, so use the
  // product id as the authoritative image lookup key. This keeps the detail
  // page consistent with the storefront image loader.
  const { data: images, error: imageError } = await db
    .from('website_product_images')
    .select('image_url,alt_text,is_primary,sort_order')
    .eq('product_id', product.id)
    .order('sort_order', { ascending: true });

  if (imageError) console.error('Product detail image query failed:', imageError);

  const orderedImages = (images || [])
    .filter((x) => x?.image_url)
    .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));

  return { ...product, website_name: settings.website_name, images: orderedImages };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product | PinkBox' };
  return {
    title: p.seo_title || `${p.title} | ${p.website_name || 'PinkBox'}`,
    description: p.seo_description || p.short_description || p.description || ''
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5">
          <Link href="/" className="font-black tracking-tight">PinkBox</Link>
          <div className="flex items-center gap-3 text-xs font-semibold sm:gap-4 sm:text-sm">
            <Link href="/account">Account</Link>
            <Link href="/#products" className="text-[#d9295f]">Continue shopping →</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-5 text-xs text-gray-500 sm:px-5 sm:py-6">
        <div className="min-w-max">
          <Link href="/" className="hover:text-[#d9295f]">Home</Link><span className="mx-2">/</span><span>{p.brand || 'PinkBox'}</span><span className="mx-2">/</span><span className="text-gray-700">{p.title}</span>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-5 sm:pb-16 md:gap-10 md:grid-cols-[1.05fr_.95fr]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-[22px] bg-[#f7f4f5] sm:rounded-[28px]">
            {p.images[0]?.image_url ? <img src={p.images[0].image_url} alt={p.images[0].alt_text || p.title} className="block aspect-square w-full object-contain" /> : <div className="grid aspect-square place-items-center text-7xl font-black text-[#d9295f]/30 sm:text-8xl">PB</div>}
          </div>
          {p.images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:grid-cols-5 sm:gap-3">{p.images.slice(0, 5).map((x, i) => <div key={i} className="overflow-hidden rounded-xl border bg-[#f7f4f5] sm:rounded-2xl"><img src={x.image_url} alt={x.alt_text || `${p.title} ${i + 1}`} className="block aspect-square w-full object-contain" /></div>)}</div>}
        </section>
        <section className="flex min-w-0 flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#d9295f] sm:text-xs">{p.brand || p.sku || 'PinkBox'}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.04em] sm:mt-4 sm:text-4xl md:text-5xl">{p.title}</h1>
          {p.short_description && <p className="mt-4 text-sm leading-6 text-gray-600 sm:mt-5 sm:text-base sm:leading-7">{p.short_description}</p>}
          <div className="mt-5 sm:mt-6"><ProductPurchasePanel product={{ ...p, images: p.images }} /></div>
          <div className="mt-7 grid gap-2 sm:mt-9 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Quality checked</b><p className="mt-1 text-xs text-gray-500">Product information stays transparent.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Secure checkout</b><p className="mt-1 text-xs text-gray-500">COD and online payment supported.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Easy support</b><p className="mt-1 text-xs text-gray-500">Help is available when you need it.</p></div>
          </div>
          {p.description && <details open className="mt-6 rounded-2xl border p-4 sm:mt-8 sm:p-5"><summary className="cursor-pointer font-bold">Product details</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600 sm:mt-4 sm:text-base sm:leading-7">{p.description}</p></details>}
        </section>
      </div>
    </main>
  );
}
