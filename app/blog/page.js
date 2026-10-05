import Link from 'next/link';
import Image from 'next/image';
import {createAdminClient} from '@/lib/supabase-admin';
import {absoluteUrl, safeJsonLd} from '@/lib/seo';

export const dynamic='force-dynamic';
export const revalidate=0;

async function getBlogStore(){
 const db=createAdminClient();
 const {data:s}=await db.from('website_settings').select('company_id,website_name,meta_title,meta_description,logo_url').eq('slug','pinkbox').eq('status','active').maybeSingle();
 return {db,s};
}

export async function generateMetadata(){
 const {s}=await getBlogStore();
 if(!s)return {title:'Journal | PinkBox'};
 const title=`Sanitary Pad Guides & Journal | ${s.website_name||'PinkBox'}`;
 const description=`Read sanitary pad guides, menstrual care education and product updates from ${s.website_name||'PinkBox'}.`;
 return {
  title,
  description,
  alternates:{canonical:'/blog'},
  openGraph:{title,description,url:absoluteUrl('/blog'),type:'website',images:s.logo_url?[s.logo_url]:undefined},
  twitter:{card:'summary_large_image',title,description,images:s.logo_url?[s.logo_url]:undefined}
 };
}

export default async function BlogIndex(){
 const {db,s}=await getBlogStore();
 if(!s)return <main className="p-10">PinkBox is not configured.</main>;
 const {data:rawPosts,error:postsError}=await db.from('website_blog_posts').select('id,title,slug,excerpt,cover_image_url,featured_image_url,published_at').eq('company_id',s.company_id).eq('is_published',true).order('published_at',{ascending:false}).limit(50);
 if(postsError) throw new Error(postsError.message);
 const now=Date.now();
 const posts=(rawPosts||[]).filter(post=>!post.published_at || new Date(post.published_at).getTime()<=now);
 const blogSchema={
  '@context':'https://schema.org',
  '@type':'Blog',
  name:`Sanitary Pad Guides & Journal | ${s.website_name||'PinkBox'}`,
  url:absoluteUrl('/blog'),
  description:`Sanitary pad guides, product education and updates from ${s.website_name||'PinkBox'}.`,
  publisher:{'@type':'Organization',name:s.website_name||'PinkBox',url:absoluteUrl('/'),...(s.logo_url?{logo:{'@type':'ImageObject',url:s.logo_url}}:{})}
 };
 const crumbs={
  '@context':'https://schema.org',
  '@type':'BreadcrumbList',
  itemListElement:[
   {'@type':'ListItem',position:1,name:'Home',item:absoluteUrl('/')},
   {'@type':'ListItem',position:2,name:'Journal',item:absoluteUrl('/blog')}
  ]
 };
 return <main className="min-h-screen bg-[#fbf3ef] text-[#2b1620]">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(blogSchema)}}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(crumbs)}}/>
  <header className="mx-auto max-w-6xl px-5 py-10"><Link href="/" className="font-semibold text-[#d9295f]">← {s.website_name||'PinkBox'}</Link><h1 className="mt-10 text-5xl font-bold">Journal</h1><p className="mt-3 max-w-2xl text-gray-600">Stories, guides and updates from {s.website_name||'PinkBox'}.</p></header>
  <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 md:grid-cols-3">{(posts||[]).map(p=><Link key={p.id} href={`/blog/${p.slug}`} className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="h-52 bg-[#f4dbe4] relative">{(p.cover_image_url||p.featured_image_url)&&<Image src={p.cover_image_url||p.featured_image_url} alt={p.title} fill sizes="(max-width:768px) 100vw, 33vw" style={{objectFit:'cover'}}/>}</div><div className="p-6"><span className="text-xs font-semibold uppercase tracking-widest text-[#d9295f]">{p.published_at?new Date(p.published_at).toLocaleDateString('en-IN'):''}</span><h2 className="mt-2 text-xl font-bold">{p.title}</h2><p className="mt-2 text-sm text-gray-600">{p.excerpt||''}</p></div></Link>)}</section>
 </main>
}