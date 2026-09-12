import { createAdminClient } from '@/lib/supabase-admin';

async function getStore(){
 const db=createAdminClient();
 const {data:settings}=await db.from('website_settings').select('*').eq('slug','pinkbox').eq('status','active').maybeSingle();
 return {db,settings};
}

export async function GET(request){
 try{
  const {db,settings}=await getStore();
  if(!settings)return Response.json({error:'PinkBox store is not configured.'},{status:404});
  const c=settings.company_id,now=new Date().toISOString();
  const [products,categories,banners,sections,pages,menu,theme,footer,blog,images,mappings]=await Promise.all([
   db.from('website_products').select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,gst_percent,stock_quantity,low_stock_threshold,track_inventory,allow_backorder,featured,is_active,seo_title,seo_description,cod_override,online_payment_override,shipping_charge_override').eq('company_id',c).eq('is_active',true).order('created_at',{ascending:false}),
   db.from('website_categories').select('id,name,slug,parent_id,image_url,sort_order').eq('company_id',c).eq('is_active',true).order('sort_order'),
   db.from('website_banners').select('id,title,subtitle,image_url,mobile_image_url,button_text,button_url,sort_order,starts_at,ends_at').eq('company_id',c).eq('is_active',true).order('sort_order'),
   db.from('website_homepage_sections').select('id,section_type,title,settings,sort_order').eq('company_id',c).eq('is_active',true).order('sort_order'),
   db.from('website_pages').select('id,title,slug,content,seo_title,seo_description').eq('company_id',c).eq('is_published',true).order('title'),
   db.from('website_menus').select('location,name,items').eq('company_id',c).eq('location','header').maybeSingle(),
   db.from('website_theme_settings').select('*').eq('company_id',c).maybeSingle(),
   db.from('website_footer_settings').select('*').eq('company_id',c).maybeSingle(),
   db.from('website_blog_posts').select('id,title,slug,excerpt,content,cover_image_url,published_at').eq('company_id',c).eq('is_published',true).lte('published_at',now).order('published_at',{ascending:false}).limit(20),
   db.from('website_product_images').select('id,product_id,image_url,alt_text,sort_order,is_primary').eq('company_id',c).order('sort_order'),
   db.from('website_product_categories').select('product_id,category_id').eq('company_id',c)
  ]);
  const qErr=[products,categories,banners,sections,pages,menu,theme,footer,blog,images,mappings].find(x=>x.error)?.error;
  if(qErr)return Response.json({error:qErr.message},{status:500});
  const activeBanners=(banners.data||[]).filter(x=>(!x.starts_at||x.starts_at<=now)&&(!x.ends_at||x.ends_at>=now));
  const imageMap={};
  const imageListMap={};
  (images.data||[]).forEach(x=>{ if(!imageListMap[x.product_id])imageListMap[x.product_id]=[]; imageListMap[x.product_id].push(x); if(!imageMap[x.product_id]||x.is_primary)imageMap[x.product_id]=x.image_url; });
  const catMap={};(mappings.data||[]).forEach(x=>{if(!catMap[x.product_id])catMap[x.product_id]=x.category_id});
  const productData=(products.data||[]).map(p=>({...p,image_url:imageMap[p.id]||null,images:imageListMap[p.id]||[],category_id:catMap[p.id]||null}));
  const url=new URL(request.url),slug=url.searchParams.get('product');
  const selectedProduct=slug?productData.find(p=>p.slug===slug)||null:null;
  return Response.json({settings:{website_name:settings.website_name,slug:settings.slug,logo_url:settings.logo_url,favicon_url:settings.favicon_url,whatsapp_number:settings.whatsapp_number,phone:settings.phone,email:settings.email,address:settings.address,gstin:settings.gstin,currency:settings.currency,timezone:settings.timezone,cod_enabled:settings.cod_enabled,online_payment_enabled:settings.online_payment_enabled,shipping_enabled:settings.shipping_enabled,free_shipping_threshold:settings.free_shipping_threshold,default_shipping_charge:settings.default_shipping_charge,meta_title:settings.meta_title,meta_description:settings.meta_description},products:productData,categories:categories.data||[],banners:activeBanners,sections:sections.data||[],pages:pages.data||[],menu:menu.data||null,theme:theme.data||null,footer:footer.data||null,blog:blog.data||[],selectedProduct});
 }catch(error){console.error('Storefront GET failed:',error);return Response.json({error:error instanceof Error?error.message:'Storefront is temporarily unavailable.'},{status:500})}
}

export async function POST(request){
 try{
  const {db,settings}=await getStore();
  if(!settings)return Response.json({error:'PinkBox store is not configured.'},{status:404});
  const b=await request.json().catch(()=>null);if(!b)return Response.json({error:'Invalid JSON.'},{status:400});
  const c=settings.company_id;
  if(b.action==='abandoned_cart'){
   if(!b.session_id)return Response.json({error:'session_id is required.'},{status:400});
   const payload={company_id:c,session_id:String(b.session_id).slice(0,200),customer_name:String(b.name||'').trim()||null,customer_phone:String(b.phone||'').trim()||null,customer_email:String(b.email||'').trim()||null,cart_items:Array.isArray(b.items)?b.items:[],total_amount:Number(b.subtotal||0),status:'abandoned',last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   const {data,error}=await db.from('website_abandoned_carts').upsert(payload,{onConflict:'company_id,session_id'}).select('id,status').single();
   if(error)return Response.json({error:error.message},{status:500});return Response.json({data});
  }
  if(!b.name||!b.phone||!b.address||!Array.isArray(b.items)||!b.items.length)return Response.json({error:'Name, phone, address and at least one product are required.'},{status:400});
  const address={name:String(b.name).trim(),phone:String(b.phone).trim(),email:String(b.email||'').trim()||null,address:String(b.address).trim(),pincode:String(b.pincode||'').trim(),city:String(b.city||'').trim(),state:String(b.state||'').trim()};
  const {data,error}=await db.rpc('place_website_order',{p_company_id:c,p_name:address.name,p_phone:address.phone,p_email:address.email,p_address:address,p_items:b.items,p_payment_method:b.payment_method==='online'?'ONLINE':'COD',p_note:String(b.note||'').trim()||null,p_coupon_code:String(b.coupon_code||'').trim()||null});
  if(error)return Response.json({error:error.message.replace(/^.*ERROR:\s*/,'')},{status:400});
  if(data?.order_id&&b.session_id)await db.from('website_abandoned_carts').update({status:'recovered',recovered_order_id:data.order_id,updated_at:new Date().toISOString()}).eq('company_id',c).eq('session_id',String(b.session_id));
  return Response.json(data,{status:201});
 }catch(error){console.error('Storefront POST failed:',error);return Response.json({error:error instanceof Error?error.message:'Storefront request failed.'},{status:500})}
}
