import Link from 'next/link';
import Image from 'next/image';
import {createAdminClient} from '@/lib/supabase-admin';
import {absoluteUrl, safeJsonLd} from '@/lib/seo';
import {isContentLiveForAvailableCategory} from '@/lib/available-content';

export const dynamic='force-dynamic';
export const revalidate=0;

async function getBlogStore(){
 const db=createAdminClient();
 const {data:s}=await db.from('website_settings').select('company_id,website_name,meta_title,meta_description,logo_url').eq('slug','pinkbox').eq('status','active').maybeSingle();
 return {db,s,now:Date.now()};
}

export async function generateMetadata(){
 const {s}=await getBlogStore();
 if(!s)return {title:'Journal | PinkBox'};
 const title=`Journal & Guides | ${s.website_name||'PinkBox'}`;
 const description=`Ideas, practical product guides and updates from ${s.website_name||'PinkBox'}.`;
 return {
  title,
  description,
  keywords:['PinkBox journal','product guides','shopping guides','product updates','baby diaper size guide','sanitary pad guides'],
  alternates:{canonical:'/blog'},
  openGraph:{title,description,url:absoluteUrl('/blog'),type:'website',images:s.logo_url?[s.logo_url]:undefined},
  twitter:{card:'summary_large_image',title,description,images:s.logo_url?[s.logo_url]:undefined}
 };
}

export default async function BlogIndex(){
 const {db,s,now}=await getBlogStore();
 if(!s)return <main className="p-10">PinkBox is not configured.</main>;
 const [postsResult,categoriesResult,productsResult,mappingsResult]=await Promise.all([
  db.from('website_blog_posts').select('id,title,slug,excerpt,content,seo_title,seo_description,seo_keywords,cover_image_url,published_at').eq('company_id',s.company_id).eq('is_published',true).order('published_at',{ascending:false}).limit(50),
  db.from('website_categories').select('id,name,slug').eq('company_id',s.company_id).eq('is_active',true),
  db.from('website_products').select('id,slug,is_active,price').eq('company_id',s.company_id).eq('is_active',true).gt('price',0),
  db.from('website_product_categories').select('product_id,category_id').eq('company_id',s.company_id),
 ]);
 if(postsResult.error) throw new Error(postsResult.error.message);
 if(categoriesResult.error||productsResult.error||mappingsResult.error) throw new Error('Unable to load live category information.');
 const context={categories:categoriesResult.data||[],products:productsResult.data||[],mappings:mappingsResult.data||[]};
 const posts=(postsResult.data||[])
  .filter(post=>!post.published_at || new Date(post.published_at).getTime()<=now)
  .filter(post=>isContentLiveForAvailableCategory(post,context,{keepUncategorized:false}));
 const blogSchema={
  '@context':'https://schema.org',
  '@type':'Blog',
  name:`PinkBox Journal | ${s.website_name||'PinkBox'}`,
  url:absoluteUrl('/blog'),
  description:`Product guides, useful shopping information and updates from ${s.website_name||'PinkBox'}.`,
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
  <header className="mx-auto max-w-6xl px-5 py-10">
   <Link href="/" className="font-semibold text-[#d9295f]">← {s.website_name||'PinkBox'}</Link>
   <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-[#d9295f]">FROM THE JOURNAL</p>
   <h1 className="mt-3 text-4xl font-bold md:text-5xl">Ideas, guides &amp; updates</h1>
  </header>
  <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 md:grid-cols-3">{(posts||[]).map(p=><Link key={p.id} href={`/blog/${p.slug}`} className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="h-52 bg-[#f4dbe4] relative">{p.cover_image_url&&<Image src={p.cover_image_url} alt={p.title} fill sizes="(max-width:768px) 100vw, 33vw" style={{objectFit:'cover'}}/>}</div><div className="p-6"><span className="text-xs font-semibold uppercase tracking-widest text-[#d9295f]">{p.published_at?new Date(p.published_at).toLocaleDateString('en-IN'):''}</span><h2 className="mt-2 text-xl font-bold">{p.title}</h2><p className="mt-2 text-sm text-gray-600">{p.excerpt||''}</p></div></Link>)}</section>
 </main>
}
