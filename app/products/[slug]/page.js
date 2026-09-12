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
  const { data: product } = await db.from('website_products').select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,allow_backorder,seo_title,seo_description,is_active,cod_override,online_payment_override,shipping_charge_override').eq('company_id', settings.company_id).eq('slug', slug).eq('is_active', true).maybeSingle();
  if (!product) return null;
  const { data: images } = await db.from('website_product_images').select('image_url,alt_text,is_primary,sort_order').eq('company_id', settings.company_id).eq('product_id', product.id).order('sort_order');
  return { ...product, website_name: settings.website_name, images: images || [] };
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-black tracking-tight">PinkBox</Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/account">Account</Link>
            <Link href="/#products" className="text-[#d9295f]">Continue shopping →</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-[#d9295f]">Home</Link><span className="mx-2">/</span><span>{p.brand || 'PinkBox'}</span><span className="mx-2">/</span><span className="text-gray-700">{p.title}</span>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 md:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="overflow-hidden rounded-[28px] bg-[#f7f4f5]">
            {p.images[0]?.image_url ? <img src={p.images[0].image_url} alt={p.images[0].alt_text || p.title} className="aspect-square w-full object-contain" /> : <div className="grid aspect-square place-items-center text-8xl font-black text-[#d9295f]/30">PB</div>}
          </div>
          {p.images.length > 1 && <div className="mt-4 grid grid-cols-5 gap-3">{p.images.slice(0, 5).map((x, i) => <div key={i} className="overflow-hidden rounded-2xl border bg-[#f7f4f5]"><img src={x.image_url} alt={x.alt_text || `${p.title} ${i + 1}`} className="aspect-square w-full object-contain" /></div>)}</div>}
        </section>
        <section className="flex flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">{p.brand || p.sku || 'PinkBox'}</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] md:text-5xl">{p.title}</h1>
          {p.short_description && <p className="mt-5 text-base leading-7 text-gray-600">{p.short_description}</p>}
          <div className="mt-6"><ProductPurchasePanel product={{ ...p, images: p.images }} /></div>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Quality checked</b><p className="mt-1 text-xs text-gray-500">Product information stays transparent.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Secure checkout</b><p className="mt-1 text-xs text-gray-500">COD and online payment supported.</p></div>
            <div className="rounded-2xl border bg-[#fff9fb] p-4"><b className="text-sm">Easy support</b><p className="mt-1 text-xs text-gray-500">Help is available when you need it.</p></div>
          </div>
          {p.description && <details open className="mt-8 rounded-2xl border p-5"><summary className="cursor-pointer font-bold">Product details</summary><p className="mt-4 whitespace-pre-line leading-7 text-gray-600">{p.description}</p></details>}
        </section>
      </div>
    </main>
  );
}
