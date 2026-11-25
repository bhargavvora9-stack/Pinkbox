import { cache } from 'react';
import Link from 'next/link';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import Image from 'next/image';
import {createAdminClient} from '@/lib/supabase-admin';
import {notFound} from 'next/navigation';
import { absoluteUrl, limitMetaText, safeJsonLd } from '@/lib/seo';
import { sanitizeCmsHtml } from '@/lib/sanitize-html';
import { isContentLiveForAvailableCategory } from '@/lib/available-content';

export const dynamic='force-dynamic';
export const revalidate=0;

// React request-cache deduplicates the shared layout/metadata/page data reads
// for one render without keeping inventory or published-content data stale across requests.
const getStore = cache(async function getStore() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id,website_name,meta_title,meta_description,logo_url,phone,email,address,instagram_url,facebook_url,youtube_url,announcement_text')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();
  return { db, settings };
});

const getBlogData = cache(async function getBlogData(slug) {
  const { db, settings } = await getStore();
  if (!settings) return { db, settings, post: null };
  const { data: post } = await db
    .from('website_blog_posts')
    .select('*')
    .eq('company_id', settings.company_id)
    .eq('slug', slug)
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  return { db, settings, post };
});

const getContentContext = cache(async function getContentContext(companyId) {
  const { db } = await getStore();
  const [categories, products, mappings] = await Promise.all([
    db.from('website_categories')
      .select('id,name,slug')
      .eq('company_id', companyId)
      .eq('is_active', true),
    db.from('website_products')
      .select('id,slug,is_active,price')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .or('sku.like.MDH-%,sku.like.BAG-%')
      .gt('price', 0),
    db.from('website_product_categories')
      .select('product_id,category_id')
      .eq('company_id', companyId),
  ]);
  if (categories.error || products.error || mappings.error) return null;
  return {
    categories: categories.data || [],
    products: products.data || [],
    mappings: mappings.data || [],
  };
});

const isPostLive = cache(async function isPostLive(companyId, slug) {
  const { post } = await getBlogData(slug);
  const context = await getContentContext(companyId);
  if (!post || !context) return false;
  return isContentLiveForAvailableCategory(post, context, { keepUncategorized: false });
});

export default async function BlogPage({params}) {
 const { slug } = await params;
 const { settings, post } = await getBlogData(slug);
 if (!settings || !post || !(await isPostLive(settings.company_id, slug))) return notFound();
 const image=post.cover_image_url||post.featured_image_url;
 const articleUrl=absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`);
 const articleSchema={
  '@context':'https://schema.org',
  '@type':'Article',
  headline:post.title,
  description:post.excerpt||undefined,
  image:image?[image]:undefined,
  datePublished:post.published_at||undefined,
  dateModified:post.updated_at||post.published_at||undefined,
  mainEntityOfPage:{'@type':'WebPage','@id':articleUrl},
  author:{'@type':'Organization',name:settings.website_name||'PinkBox',url:absoluteUrl('/')},
  publisher:{'@type':'Organization',name:settings.website_name||'PinkBox',url:absoluteUrl('/'),logo:settings.logo_url?{'@type':'ImageObject',url:settings.logo_url}:undefined},
 };
 return <div className="min-h-screen bg-background text-foreground"><ZipReferenceHeader settings={settings}/><main className="min-h-screen bg-background text-foreground"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(articleSchema)}} /><article className="mx-auto max-w-3xl px-5 py-16"><Link href="/" className="text-sm font-semibold text-primary">← Back to {settings.website_name||'PinkBox'}</Link>{image&&<div className="relative mt-8 flex h-[360px] w-full items-center justify-center overflow-hidden rounded-3xl bg-gray-50 sm:h-[480px]"><Image src={image} alt={post.title} fill sizes="(max-width:768px) 100vw, 768px" style={{objectFit:'contain'}} priority/></div>}<div className="mt-8 text-xs font-bold uppercase tracking-widest text-[#d9295f]">{post.category||'PinkBox Journal'} · {post.published_at?new Date(post.published_at).toLocaleDateString('en-IN'):''}</div><h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{post.title}</h1>{post.excerpt&&<p className="mt-5 text-lg text-muted-foreground">{post.excerpt}</p>}<div className="prose prose-lg mt-10 max-w-none" dangerouslySetInnerHTML={{__html:sanitizeCmsHtml(post.content?.html||'')}}/>{slug==='320mm-sanitary-pads-length-guide'&&<section className="mt-10 rounded-2xl border border-border bg-muted/40 p-6"><h2 className="text-2xl font-semibold">Shop 320mm Sanitary Pads</h2><p className="mt-2 text-sm text-muted-foreground">Looking to shop? View the 320mm sanitary pads buying page on PinkBox.</p><Link href="/pages/320mm-sanitary-pads" className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">View 320mm Sanitary Pads</Link></section>}</article></main><ZipReferenceFooter settings={settings}/></div>
}

export async function generateMetadata({ params }) {
 const { slug } = await params;
 const { settings, post } = await getBlogData(slug);
 if (!settings) return {};
 const live = post ? await isPostLive(settings.company_id, slug) : false;
 const image=post?.cover_image_url||post?.featured_image_url;
 const title=limitMetaText(post?.seo_title||post?.title, 60);
 const description=limitMetaText(post?.seo_description||post?.excerpt||'', 160) || undefined;
 return post&&live?{
  title,
  description,
  keywords:post.seo_keywords?post.seo_keywords.split(',').map(keyword=>keyword.trim()).filter(Boolean):undefined,
  alternates:{canonical:`/blog/${encodeURIComponent(post.slug)}`},
  openGraph:{title,description,url:absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`),type:'article',images:image?[image]:undefined},
  twitter:{card:'summary_large_image',title,description,images:image?[image]:undefined}
 }:{title:settings.website_name||'PinkBox'};
}