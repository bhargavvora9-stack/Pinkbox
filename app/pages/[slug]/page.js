import {createAdminClient} from '@/lib/supabase-admin';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter'; import {notFound} from 'next/navigation'; import Link from 'next/link';
import {absoluteUrl, safeJsonLd} from '@/lib/seo';
import {sanitizeCmsHtml} from '@/lib/sanitize-html';
import {isContentLiveForAvailableCategory} from '@/lib/available-content';
import {filterAvailableProducts} from '@/lib/product-availability';
import Image from 'next/image';
export const dynamic='force-dynamic'; export const revalidate=0;
async function isPageLive(db, companyId, page){
 const [categories,products,mappings]=await Promise.all([
  db.from('website_categories').select('id,name,slug').eq('company_id',companyId).eq('is_active',true),
  db.from('website_products').select('id,slug,is_active,price,stock_quantity,track_inventory,allow_backorder').eq('company_id',companyId).eq('is_active',true).gt('price',0),
  db.from('website_product_categories').select('product_id,category_id').eq('company_id',companyId),
 ]);
 if(categories.error||products.error||mappings.error) return false;
 const productIds=(products.data||[]).map(product=>product.id);
 const {data:variants,error:variantsError}=productIds.length
  ? await db.from('website_product_variants').select('product_id,stock_quantity,is_active').eq('company_id',companyId).in('product_id',productIds).eq('is_active',true)
  : {data:[],error:null};
 if(variantsError) return false;
 const saleableProducts=filterAvailableProducts(products.data||[],variants||[]);
 return isContentLiveForAvailableCategory(page,{
  categories:categories.data||[],products:saleableProducts,mappings:mappings.data||[]
 },{keepUncategorized:true});
}
export default async function CmsPage({params}){const {slug}=await params;const db=createAdminClient();const {data:s}=await db.from('website_settings').select('company_id,website_name').eq('slug','pinkbox').eq('status','active').maybeSingle();if(!s)return notFound();const {data:p}=await db.from('website_pages').select('title,slug,content,image_url,seo_title,seo_description').eq('company_id',s.company_id).eq('slug',slug).eq('is_published',true).maybeSingle();if(!p || !(await isPageLive(db,s.company_id,p)))return notFound();const html=sanitizeCmsHtml(p.content?.html||p.content?.body||'');const url=absoluteUrl(`/pages/${encodeURIComponent(p.slug)}`);const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:absoluteUrl('/')},{'@type':'ListItem',position:2,name:p.title,item:url}]};const webpage={'@context':'https://schema.org','@type':'WebPage',name:p.title,url,description:p.seo_description||undefined,image:p.image_url?[p.image_url]:undefined};return <div className="min-h-screen bg-background text-foreground"><ZipReferenceHeader settings={s}/><main className="min-h-screen bg-background text-foreground"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(webpage)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(crumbs)}}/><article className="mx-auto max-w-4xl px-5 py-14"><Link href="/" className="font-semibold text-primary">← {s.website_name||'PinkBox'}</Link>{p.image_url&&<div className="mt-8 overflow-hidden rounded-3xl border border-border bg-muted p-3"><Image src={p.image_url} alt={p.title} width={1120} height={840} unoptimized className="block max-h-[560px] w-full object-contain"/></div>}<h1 className="mt-10 font-display text-4xl font-semibold md:text-5xl">{p.title}</h1><div className="prose prose-lg mt-8 max-w-none" dangerouslySetInnerHTML={{__html:html}}/></article></main><ZipReferenceFooter settings={s}/></div>}
export async function generateMetadata({params}){const {slug}=await params;const db=createAdminClient();const {data:s}=await db.from('website_settings').select('company_id,website_name').eq('slug','pinkbox').eq('status','active').maybeSingle();if(!s)return {};const {data:p}=await db.from('website_pages').select('title,slug,content,seo_title,seo_description,seo_keywords,image_url').eq('company_id',s.company_id).eq('slug',slug).eq('is_published',true).maybeSingle();if(!p || !(await isPageLive(db,s.company_id,p)))return {title:s.website_name||'PinkBox',robots:{index:false,follow:false}};const canonical=`/pages/${encodeURIComponent(slug)}`;const title=p.seo_title||p.title;return {title,description:p.seo_description||undefined,keywords:p.seo_keywords?p.seo_keywords.split(',').map(keyword=>keyword.trim()).filter(Boolean):undefined,alternates:{canonical},openGraph:{title,description:p.seo_description||undefined,url:canonical,type:'website',images:p.image_url?[p.image_url]:undefined},twitter:{card:'summary_large_image',title,description:p.seo_description||undefined,images:p.image_url?[p.image_url]:undefined}}}
