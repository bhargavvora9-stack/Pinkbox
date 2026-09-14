import Link from 'next/link';
import {createAdminClient} from '@/lib/supabase-admin';
import {notFound} from 'next/navigation';
import {absoluteUrl} from '@/lib/seo';

export const dynamic='force-dynamic';
export const revalidate=0;

async function getStore(){
 const db=createAdminClient();
 const {data:settings}=await db.from('website_settings').select('company_id,website_name').eq('slug','pinkbox').eq('status','active').maybeSingle();
 return {db,settings};
}

export default async function BlogPage({params}){
 const {slug}=await params; const {db,settings}=await getStore(); if(!settings)return notFound();
 const {data:post}=await db.from('website_blog_posts').select('*').eq('company_id',settings.company_id).eq('slug',slug).eq('is_published',true).lte('published_at',new Date().toISOString()).maybeSingle();
 if(!post)return notFound();
 const image=post.cover_image_url;
 const url=absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`);
 const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
  {'@type':'ListItem',position:1,name:'Home',item:absoluteUrl('/')},{'@type':'ListItem',position:2,name:'Journal',item:absoluteUrl('/blog')},{'@type':'ListItem',position:3,name:post.title,item:url}
 ]};
 const article={'@context':'https://schema.org','@type':'Article',headline:post.title,description:post.excerpt||undefined,datePublished:post.published_at||undefined,dateModified:post.updated_at||post.published_at||undefined,image:image?[image]:undefined,url,mainEntityOfPage:{'@type':'WebPage','@id':url},publisher:{'@type':'Organization',name:settings.website_name||'PinkBox',url:absoluteUrl('/')}};
 return <main className="min-h-screen bg-[#fbf3ef] text-[#2b1620]"><script type="application/ld+json">{JSON.stringify(article)}</script><script type="application/ld+json">{JSON.stringify(crumbs)}</script><article className="mx-auto max-w-3xl px-5 py-16"><Link href="/" className="text-sm font-semibold text-[#d9295f]">← Back to {settings.website_name||'PinkBox'}</Link>{image&&<div className="mt-8 flex min-h-80 w-full items-center justify-center overflow-hidden rounded-3xl bg-white"><img src={image} alt={post.title} className="max-h-[520px] w-full object-contain"/></div>}<div className="mt-8 text-xs font-bold uppercase tracking-widest text-[#d9295f]">PinkBox Journal · {post.published_at?new Date(post.published_at).toLocaleDateString('en-IN'):''}</div><h1 className="mt-3 text-4xl font-bold md:text-5xl">{post.title}</h1>{post.excerpt&&<p className="mt-5 text-lg text-gray-600">{post.excerpt}</p>}<div className="prose prose-lg mt-10 max-w-none" dangerouslySetInnerHTML={{__html:post.content?.html||''}}/></article></main>
}

export async function generateMetadata({params}){
 const {slug}=await params; const {db,settings}=await getStore(); if(!settings)return {};
 const {data:post}=await db.from('website_blog_posts').select('title,excerpt,cover_image_url,published_at,updated_at').eq('company_id',settings.company_id).eq('slug',slug).eq('is_published',true).lte('published_at',new Date().toISOString()).maybeSingle();
 const image=post?.cover_image_url;
 const title=post?.title||settings.website_name||'PinkBox';
 const description=post?.excerpt||undefined;
 return post?{title,description,alternates:{canonical:`/blog/${encodeURIComponent(slug)}`},openGraph:{type:'article',url:`/blog/${encodeURIComponent(slug)}`,title,description,images:image?[image]:undefined},twitter:{card:'summary_large_image',title,description,images:image?[image]:undefined}}:{title:settings.website_name||'PinkBox'};
}