import Link from 'next/link';
import ZipReferenceProductGrid from '@/components/ZipReferenceProductGrid';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import { absoluteUrl, safeJsonLd, sanitizePublicProductText } from '@/lib/seo';
import { filterAvailableProducts } from '@/lib/product-availability';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCollection(slug) {
  const db = createAdminClient();
  const { data: settings } = await db.from('website_settings').select('company_id,website_name').eq('slug','pinkbox').eq('status','active').maybeSingle();
  if (!settings) return null;
  const { data: category } = await db.from('website_categories').select('id,name,slug,description,seo_title,seo_description,seo_keywords,image_url').eq('company_id',settings.company_id).eq('slug',slug).eq('is_active',true).maybeSingle();
  if (!category) return null;
  const { data: mappings } = await db.from('website_product_categories').select('product_id').eq('company_id',settings.company_id).eq('category_id',category.id);
  const ids = (mappings || []).map(x => x.product_id);
  const { data: products, error: productsError } = ids.length ? await db.from('website_products')
    .select('id,sku,title,slug,short_description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,featured,is_active')
    .eq('company_id',settings.company_id).in('id',ids).eq('is_active',true)
    .or('sku.like.MDH-%,sku.like.BAG-%').gt('price',0).order('created_at',{ascending:false}) : {data:[],error:null};
  if (productsError) throw new Error(productsError.message);
  const { data: variants, error: variantsError } = ids.length ? await db.from('website_product_variants')
    .select('id,product_id,title,sku,price,compare_at_price,stock_quantity,image_url,is_active')
    .eq('company_id',settings.company_id).in('product_id',ids).eq('is_active',true) : {data:[],error:null};
  if (variantsError) throw new Error(variantsError.message);
  const availableProducts = filterAvailableProducts(products || [], variants || [], { includeOutOfStock: true });
  const { data: images, error: imagesError } = ids.length ? await db.from('website_product_images')
    .select('product_id,image_url,alt_text,is_primary,sort_order')
    .eq('company_id',settings.company_id).in('product_id',ids).order('sort_order') : {data:[],error:null};
  if (imagesError) throw new Error(imagesError.message);
  const imageMap = {};
  (images || []).forEach((image) => {
    const productImages = imageMap[image.product_id] || [];
    productImages.push(image);
    imageMap[image.product_id] = productImages;
  });
  const variantsByProduct = {};
  (variants || []).forEach((variant) => {
    const productVariants = variantsByProduct[variant.product_id] || [];
    productVariants.push(variant);
    variantsByProduct[variant.product_id] = productVariants;
  });
  const collectionProducts = availableProducts.map((product) => {
    const productImages = (imageMap[product.id] || []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order || 0) - Number(b.sort_order || 0),
    );
    const fallback = {
      image_url: `/catalog-products/${product.sku.toLowerCase()}.webp`,
      alt_text: product.title,
      is_primary: true,
      sort_order: 0,
    };
    const resolvedImages = productImages.length ? productImages : [fallback];
    return {
      ...product,
      short_description: sanitizePublicProductText(product.short_description),
      variants: variantsByProduct[product.id] || [],
      images: resolvedImages,
      image_url: resolvedImages[0]?.image_url || fallback.image_url,
    };
  });
  return {category, products:collectionProducts};
}

export async function generateMetadata({params}) {
  const {slug} = await params; const c = await getCollection(slug);
  if (!c) return { title: 'Collection | PinkBox' };
  const isSanitary = c.category.slug === 'sanitary-pads';
  const isBabyDiapers = c.category.slug === 'baby-diapers';
  const isBags = c.category.slug === 'bags';
  const title = c.category.seo_title || (isSanitary
    ? 'Sanitary Pads & Sanitary Napkins | PinkBox'
    : isBabyDiapers
      ? 'Buy 7 Soft Baby Diaper Pants Online | PinkBox'
      : isBags
        ? 'Bags Online | PinkBox'
        : `${c.category.name} | PinkBox`);
  const description = c.category.seo_description || c.category.description || (isSanitary
    ? 'Shop sanitary pads and sanitary napkins online at PinkBox. Explore 320mm, heavy-flow, cottony-surface and anti-bacterial sanitary pad options.'
    : isBabyDiapers
      ? 'Shop 7 Soft baby diaper pants online at PinkBox. Compare available S, M, L and XL sizes, pack counts and current prices, with delivery across India.'
      : isBags
        ? 'Explore all PinkBox bag designs, including tote bags, handbags and office bags, together in one collection.'
        : `Shop ${c.category.name} products at PinkBox. Explore product options, sizes, prices and everyday essentials.`);
  return {
    title,
    description,
    keywords: c.category.seo_keywords ? c.category.seo_keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean) : undefined,
    alternates: { canonical: `/collections/${encodeURIComponent(c.category.slug)}` },
    openGraph: { title, description, url: absoluteUrl(`/collections/${encodeURIComponent(c.category.slug)}`), type: 'website', images: c.category.image_url ? [c.category.image_url] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: c.category.image_url ? [c.category.image_url] : undefined },
  };
}

export default async function CollectionPage({params}) {
  const {slug} = await params; const c = await getCollection(slug); if (!c || !c.products?.length) notFound();
  const isSanitary = c.category.slug === 'sanitary-pads';
  const isBabyDiapers = c.category.slug === 'baby-diapers';
  const isBags = c.category.slug === 'bags';
  const isHandBags = c.category.slug === 'hand-bags';
  const guideLinks = isSanitary
    ? [
        ['/pages/sanitary-pads', 'Sanitary Pads Guide'],
        ['/pages/320mm-sanitary-pads', '320mm Sanitary Pads'],
        ['/pages/sanitary-pads-for-heavy-flow', 'Sanitary Pads for Heavy Flow'],
        ['/pages/anti-bacterial-sanitary-pads', 'Anti-Bacterial Sanitary Pads'],
        ['/pages/24-care-sanitary-pads', '24 Care Sanitary Pads'],
        ['/pages/7-soft-sanitary-pads', '7 Soft Sanitary Pads']
      ]
    : isBabyDiapers
      ? [
          ['/pages/baby-diaper-size-guide', 'Baby Diaper Size Guide'],
          ['/pages/shipping-policy', 'Shipping & Delivery'],
          ['/pages/refund-policy', 'Returns & Refunds'],
          ['/pages/contact-us', 'Customer Support']
        ]
      : [];
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isSanitary ? 'Sanitary Pads & Sanitary Napkins' : isBabyDiapers ? '7 Soft Baby Diaper Pants' : isBags ? 'Bags' : c.category.name,
    url: absoluteUrl(`/collections/${encodeURIComponent(c.category.slug)}`),
    mainEntity: { '@type': 'ItemList', itemListElement: c.products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(`/products/${encodeURIComponent(p.slug)}`), name: p.title })) }
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: isHandBags ? 'EcoCarry Hand Bags' : isSanitary ? 'Sanitary Pads & Sanitary Napkins' : isBabyDiapers ? '7 Soft Baby Diaper Pants' : isBags ? 'Personalized Cotton Tote Bags' : c.category.name, item: absoluteUrl(`/collections/${encodeURIComponent(c.category.slug)}`) }
    ]
  };
  return <>
  <main className="min-h-screen bg-white text-[#171717]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
    <header className="border-b"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="font-black tracking-tight">PinkBox</Link><nav aria-label="Shop collections" className="flex max-w-[72%] flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs font-semibold sm:gap-4 sm:text-sm"><Link href="/collections/sanitary-pads">Sanitary Pads</Link><Link href="/collections/baby-diapers">Baby Diapers</Link><Link href="/collections/bags">Bags</Link><Link href="/shop">All products</Link><Link href="/account">Account</Link></nav></div></header>
    <section className="mx-auto max-w-6xl px-5 py-12"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">{isSanitary ? 'Sanitary Care' : isBags ? 'Bags' : 'Collection'}</p><h1 className="mt-3 text-5xl font-black tracking-tight">{isSanitary ? 'Sanitary Pads & Sanitary Napkins' : isBabyDiapers ? '7 Soft Baby Diaper Pants' : isBags ? 'Bags' : c.category.name}</h1><p className="mt-3 max-w-2xl text-gray-600">{isSanitary ? 'Shop sanitary pads and sanitary napkins online from PinkBox. Compare 320mm sanitary pads, heavy-flow protection, cottony surfaces and anti-bacterial options for everyday menstrual care.' : isBabyDiapers ? 'Shop 7 Soft baby diaper pants online at PinkBox. Compare sizes S, M, L and XL and pack counts across Jumbo, Maha Jumbo and Premium packs, then check product details and current prices before choosing a pack.' : isBags ? 'Browse all PinkBox bag designs together in one collection, including tote bags, handbags and office bag styles.' : `Explore the PinkBox ${c.category.name} collection with product details, current prices and related guides.`}</p>
<div className="mt-10"><ZipReferenceProductGrid products={c.products} /></div>
      {isSanitary && <div className="mt-14 rounded-3xl border bg-[#fff9fb] p-6"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Explore sanitary care</p><h2 className="mt-2 text-2xl font-black">Sanitary pads for everyday, night and heavy flow</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">PinkBox covers common sanitary pad searches including sanitary pads, sanitary napkins, 320mm sanitary pads, heavy-flow sanitary pads, cottony-surface pads and anti-bacterial sanitary pads. Use the guides below to compare the right type for your needs.</p><div className="mt-4 flex flex-wrap gap-3">{guideLinks.map(([href,label])=><Link key={href} href={href} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">{label}</Link>)}<Link href="/blog" className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">Sanitary Pad Journal</Link></div></div>}
      {isBabyDiapers && <div className="mt-14 rounded-3xl border bg-[#fff9fb] p-6"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Baby care</p><h2 className="mt-2 text-2xl font-black">Compare 7 Soft Baby Diaper Pants by Size and Pack</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">Browse 7 Soft baby diaper pants in sizes S, M, L and XL. Compare Jumbo, Maha Jumbo and Premium packs by the listed size, piece count and current price before ordering.</p><div className="mt-4 flex flex-wrap gap-3">{guideLinks.map(([href,label])=><Link key={href} href={href} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">{label}</Link>)}</div></div>}
      {!isSanitary && !isBabyDiapers && <div className="mt-14 rounded-3xl border bg-[#fff9fb] p-6"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d9295f]">Related guide</p><h2 className="mt-2 text-2xl font-black">Explore PinkBox guides</h2><div className="mt-4 flex flex-wrap gap-3">{guideLinks.map(([href,label])=><Link key={href} href={href} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">{label}</Link>)}<Link href="/blog" className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:border-[#d9295f] hover:text-[#d9295f]">View all articles</Link></div></div>}
    </section>
  </main>
  <ZipReferenceFooter />
  </>;
}
