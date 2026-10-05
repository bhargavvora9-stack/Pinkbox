import Link from 'next/link';
import Image from 'next/image';
import {createAdminClient} from '@/lib/supabase-admin';
import {notFound} from 'next/navigation';
import { absoluteUrl, safeJsonLd } from '@/lib/seo';
import { sanitizeCmsHtml } from '@/lib/sanitize-html';

export const dynamic='force-dynamic';
export const revalidate=0;

async function getStore(){
 const db=createAdminClient();
 const {data:settings}=await db.from('website_settings').select('company_id,website_name,meta_title,meta_description').eq('slug','pinkbox').eq('status','active').maybeSingle();
 return {db,settings};
}

export default async function BlogPage({params}){
 const {slug}=await params; const {db,settings}=await getStore(); if(!settings)return notFound();
 const {data:post}=await db.from('website_blog_posts').select('*').eq('company_id',settings.company_id).eq('slug',slug).eq('is_published',true).lte('published_at',new Date().toISOString()).maybeSingle();
 if(!post)return notFound();
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
 return <main className="min-h-screen bg-[#fbf3ef] text-[#2b1620]"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(articleSchema)}} /><article className="mx-auto max-w-3xl px-5 py-16"><Link href="/" className="text-sm font-semibold text-[#d9295f]">← Back to {settings.website_name||'PinkBox'}</Link>{image&&<div className="relative mt-8 h-80 w-full overflow-hidden rounded-3xl"><Image src={image} alt={post.title} fill sizes="(max-width:768px) 100vw, 768px" style={{objectFit:'cover'}} priority/></div>}<div className="mt-8 text-xs font-bold uppercase tracking-widest text-[#d9295f]">{post.category||'PinkBox Journal'} · {post.published_at?new Date(post.published_at).toLocaleDateString('en-IN'):''}</div><h1 className="mt-3 text-4xl font-bold md:text-5xl">{post.title}</h1>{post.excerpt&&<p className="mt-5 text-lg text-gray-600">{post.excerpt}</p>}<div className="prose prose-lg mt-10 max-w-none" dangerouslySetInnerHTML={{__html:sanitizeCmsHtml(post.content?.html||'')}}/></article></main>
}

export async function generateMetadata({params}){
 const {slug}=await params; const {db,settings}=await getStore(); if(!settings)return {};
 const {data:post}=await db.from('website_blog_posts').select('title,excerpt,published_at,updated_at,slug,cover_image_url').eq('company_id',settings.company_id).eq('slug',slug).eq('is_published',true).maybeSingle();
 const image=post?.cover_image_url||post?.featured_image_url;
 return post?{
  title:post.title,
  description:post.excerpt||undefined,
  alternates:{canonical:`/blog/${encodeURIComponent(post.slug)}`},
  openGraph:{title:post.title,description:post.excerpt||undefined,url:absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`),type:'article',images:image?[image]:undefined},
  twitter:{card:'summary_large_image',title:post.title,description:post.excerpt||undefined,images:image?[image]:undefined}
 }:{title:settings.website_name||'PinkBox'};
}