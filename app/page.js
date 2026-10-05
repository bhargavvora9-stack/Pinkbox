import './pinkbox-home.css';
import Link from 'next/link';
import PinkBoxHome from '../components/PinkBoxHome';
import { createAdminClient } from '@/lib/supabase-admin';
import { safeJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStoreData() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('*')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (!settings) return null;

  const companyId = settings.company_id;
  const now = new Date().toISOString();

  const [products, categories, banners, sections, menu, theme, footer, blog, images, mappings, reviews] = await Promise.all([
    db.from('website_products')
      .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,gst_percent,stock_quantity,low_stock_threshold,track_inventory,allow_backorder,featured,is_active,seo_title,seo_description,cod_override,online_payment_override,shipping_charge_override')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    db.from('website_categories')
      .select('id,name,slug,parent_id,image_url,sort_order')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_banners')
      .select('id,title,subtitle,image_url,mobile_image_url,button_text,button_url,sort_order,starts_at,ends_at,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_homepage_sections')
      .select('id,section_type,title,settings,sort_order,is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order'),
    db.from('website_menus')
      .select('location,name,items')
      .eq('company_id', companyId)
      .eq('location', 'header')
      .maybeSingle(),
    db.from('website_theme_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle(),
    db.from('website_footer_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle(),
    db.from('website_blog_posts')
      .select('id,title,slug,excerpt,content,cover_image_url,published_at')
      .eq('company_id', companyId)
      .eq('is_published', true)
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .limit(20),
    db.from('website_product_images')
      .select('id,product_id,image_url,alt_text,sort_order,is_primary')
      .eq('company_id', companyId)
      .order('sort_order'),
    db.from('website_product_categories')
      .select('product_id,category_id')
      .eq('company_id', companyId),
    db.from('website_product_reviews')
      .select('id,product_id,customer_name,rating,title,review_text,is_featured,created_at')
      .eq('company_id', companyId)
      .eq('is_approved', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const results = { products, categories, banners, sections, menu, theme, footer, blog, images, mappings, reviews };
  const failed = Object.values(results).find((result) => result?.error);
  if (failed) throw new Error(failed.error.message);

  const activeBanners = (banners.data || []).filter(
    (banner) => (!banner.starts_at || banner.starts_at <= now) && (!banner.ends_at || banner.ends_at >= now)
  );

  const imageMap = {};
  const imageListMap = {};
  for (const image of images.data || []) {
    if (!imageListMap[image.product_id]) imageListMap[image.product_id] = [];
    imageListMap[image.product_id].push(image);
    if (!imageMap[image.product_id] || image.is_primary) imageMap[image.product_id] = image.image_url;
  }

  const catMap = {};
  for (const mapping of mappings.data || []) {
    if (!catMap[mapping.product_id]) catMap[mapping.product_id] = mapping.category_id;
  }

  const productData = (products.data || []).map((product) => ({
    ...product,
    image_url: imageMap[product.id] || null,
    images: imageListMap[product.id] || [],
    category_id: catMap[product.id] || null,
  }));

  return {
    settings: {
      ...settings,
      meta_title: settings.meta_title || null,
      meta_description: settings.meta_description || null,
    },
    products: productData,
    categories: categories.data || [],
    banners: activeBanners,
    sections: sections.data || [],
    menu: menu.data || null,
    theme: theme.data || null,
    footer: footer.data || null,
    blog: blog.data || [],
    reviews: reviews.data || [],
  };
}

async function getStoreMeta() {
  const db = createAdminClient();
  const { data } = await db
    .from('website_settings')
    .select('website_name,meta_title,meta_description,logo_url')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();
  return data;
}

export async function generateMetadata() {
  const data = await getStoreData();
  const s = data?.settings || null;
  const name = s?.website_name || 'PinkBox';
  const title = s?.meta_title || `${name} — Soft, Safe & Skin-Friendly Sanitary Pads`;
  const description = s?.meta_description || 'PinkBox offers ultra-soft, dermatologist-friendly sanitary pads with long-lasting protection. ISO-certified, lab-tested and delivered discreetly across India.';
  return {
    title,
    description,
    openGraph: { title, description, images: s?.logo_url ? [s.logo_url] : undefined, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') || undefined },
  };
}

export default async function HomePage(){
  const data = await getStoreData();
  const s = data?.settings || null;
  const name = s?.website_name || 'PinkBox';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description: s?.meta_description || undefined,
    logo: s?.logo_url || undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://mypinkbox.vercel.app',
    description: s?.meta_description || undefined,
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />
    <PinkBoxHome initialData={data} />
    <section aria-labelledby="sanitary-care-seo" className="pb-home-seo-footer">
      <div className="pb-home-seo-footer-inner">
        <p className="pb-home-seo-eyebrow">PINKBOX SANITARY CARE</p>
        <h2 id="sanitary-care-seo">Sanitary Pads & Sanitary Napkins Online</h2>
        <p>Shop sanitary pads and sanitary napkins online at PinkBox. Explore 320mm sanitary pads, heavy-flow sanitary pads, cottony-surface pads, anti-bacterial sanitary pads and trusted 24 Care and 7 Soft options.</p>
        <nav aria-label="Sanitary care links" className="pb-home-seo-links">
          <Link href="/pages/sanitary-pads">Sanitary Pads</Link>
          <Link href="/pages/320mm-sanitary-pads">320mm Sanitary Pads</Link>
          <Link href="/pages/sanitary-pads-for-heavy-flow">Sanitary Pads for Heavy Flow</Link>
          <Link href="/pages/anti-bacterial-sanitary-pads">Anti-Bacterial Sanitary Pads</Link>
          <Link href="/pages/24-care-sanitary-pads">24 Care Sanitary Pads</Link>
          <Link href="/pages/7-soft-sanitary-pads">7 Soft Sanitary Pads</Link>
          <Link href="/collections/sanitary-pads">Shop Sanitary Pads</Link>
          <Link href="/blog">Sanitary Pad Guides</Link>
        </nav>
      </div>
    </section>
    <style dangerouslySetInnerHTML={{__html:`
      .pb-home-hero-art>img,.pb-category-card img,.pb-journal-thumb img,.pb-home-custom img{object-fit:contain!important}
      .pb-home-hero-art>img,.pb-category-card img,.pb-journal-thumb img{background:#f7f1ee}
      .pb-home-seo-footer{width:min(1260px,100%);margin:0 auto;padding:10px 28px 54px;color:#6a4b4e}
      .pb-home-seo-footer-inner{padding:28px 30px;border:1px solid #eadfd9;border-radius:22px;background:#fffaf8}
      .pb-home-seo-eyebrow{margin:0 0 7px;font-size:10px;font-weight:800;letter-spacing:.12em;color:#c36f83}
      .pb-home-seo-footer h2{margin:0;font:500 clamp(1.35rem,3vw,2rem)/1.2 Georgia,"Times New Roman",serif}
      .pb-home-seo-footer p:not(.pb-home-seo-eyebrow){max-width:900px;margin:10px 0 0;color:#846f70;font-size:13px;line-height:1.7}
      .pb-home-seo-links{display:flex;flex-wrap:wrap;gap:9px;margin-top:17px}
      .pb-home-seo-links a{padding:8px 12px;border:1px solid #ead0d6;border-radius:999px;background:#fff;color:#815d65;font-size:11px;font-weight:700}
      .pb-home-seo-links a:hover{border-color:#d8899d;color:#c36f83}
    `}} />
  </>;
}
