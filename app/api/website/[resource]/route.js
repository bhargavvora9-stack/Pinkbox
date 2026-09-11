import { getWebsiteAdminContext, cleanString, slugify, audit, jsonError } from '@/lib/website-admin';

const TABLES = { settings:'website_settings', categories:'website_categories', products:'website_products', images:'website_product_images', orders:'website_orders', pages:'website_pages', banners:'website_banners', 'homepage-sections':'website_homepage_sections', navigation:'website_menus', discounts:'website_discounts' };
const SAFE_LIMIT = 200;
const DEFAULT_STORE_NAME = 'PinkBox';
const DEFAULT_STORE_SLUG = 'pinkbox';
const tableFor = resource => TABLES[resource];

export async function GET(request,{params}){
  const {resource}=await params;
  const {supabase,companyId,error}=await getWebsiteAdminContext();
  if(error)return jsonError(error==='UNAUTHENTICATED'?'Please login.':'Access denied.',error==='UNAUTHENTICATED'?401:403);
  if(resource==='dashboard'){
    const [statsResult,orders,products,categories,settings]=await Promise.all([
      supabase.rpc('get_website_dashboard_stats',{p_company_id:companyId}),
      supabase.from('website_orders').select('id,total_amount,order_status,created_at,order_number').eq('company_id',companyId).order('created_at',{ascending:false}).limit(8),
      supabase.from('website_products').select('id,title,sku,price,stock_quantity,low_stock_threshold,is_active').eq('company_id',companyId).order('created_at',{ascending:false}).limit(SAFE_LIMIT),
      supabase.from('website_categories').select('id,name,parent_id,is_active').eq('company_id',companyId).order('sort_order').limit(SAFE_LIMIT),
      supabase.from('website_settings').select('*').eq('company_id',companyId).maybeSingle()
    ]);
    if(statsResult.error)return jsonError(statsResult.error.message,500);
    return Response.json({stats:statsResult.data||{sales:0,orders:0,products:0,customers:0},recentOrders:orders.data||[],lowStock:(products.data||[]).filter(p=>Number(p.stock_quantity||0)<=Number(p.low_stock_threshold||0)).slice(0,8),categories:categories.data||[],settings:settings.data||null});
  }
  if(resource==='customers'){
    const {data,error:dbError}=await supabase.from('customers').select('id,client_name,phone1,email,address,pincode,city,state,gstin,created_at,updated_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(SAFE_LIMIT);
    if(dbError)return jsonError(dbError.message,500); return Response.json({data:data||[]});
  }
  if(resource==='inventory'){
    const [products,tx]=await Promise.all([
      supabase.from('website_products').select('id,title,sku,stock_quantity,low_stock_threshold,track_inventory,allow_backorder,is_active').eq('company_id',companyId).order('title').limit(SAFE_LIMIT),
      supabase.from('website_inventory_transactions').select('id,product_id,change_quantity,quantity_before,quantity_after,reason,reference_type,reference_id,created_by,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100)
    ]); return Response.json({products:products.data||[],transactions:tx.data||[]});
  }
  const table=tableFor(resource); if(!table)return jsonError('Unknown website resource.',404);
  let query=supabase.from(table).select('*').eq('company_id',companyId);
  if(resource==='settings')query=query.maybeSingle(); else if(['products','orders'].includes(resource))query=query.order('created_at',{ascending:false}).limit(SAFE_LIMIT); else if(resource==='images')query=query.order('product_id').order('is_primary',{ascending:false}).order('sort_order').limit(SAFE_LIMIT); else query=query.order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(SAFE_LIMIT);
  const {data,error:dbError}=await query; if(dbError)return jsonError(dbError.message,500); return Response.json({data:data||null});
}

export async function POST(request,{params}){
  const {resource}=await params; const ctx=await getWebsiteAdminContext();
  if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);
  const {supabase,companyId,user}=ctx; let body; try{body=await request.json()}catch{return jsonError('Invalid JSON.')}
  if(resource==='inventory'){
    const productId=cleanString(body.product_id,100), change=Number(body.change_quantity);
    if(!productId||!Number.isFinite(change)||change===0)return jsonError('Product and a non-zero stock adjustment are required.');
    const {data:product}=await supabase.from('website_products').select('id,stock_quantity,title,sku').eq('company_id',companyId).eq('id',productId).maybeSingle();
    if(!product)return jsonError('Product not found.',404); const before=Number(product.stock_quantity||0),after=before+change; if(after<0)return jsonError('Stock cannot go below zero.');
    const {error:uErr}=await supabase.from('website_products').update({stock_quantity:after,updated_at:new Date().toISOString()}).eq('company_id',companyId).eq('id',productId); if(uErr)return jsonError(uErr.message,500);
    const {data:tx,error:tErr}=await supabase.from('website_inventory_transactions').insert({company_id:companyId,product_id:productId,change_quantity:change,quantity_before:before,quantity_after:after,reason:cleanString(body.reason,500)||'Manual adjustment',reference_type:cleanString(body.reference_type,60)||null,reference_id:body.reference_id||null,created_by:user.id}).select().single(); if(tErr)return jsonError(tErr.message,500);
    await audit(supabase,{companyId,userId:user.id,action:'inventory.adjust',entityType:'website_product',entityId:productId,oldData:{stock_quantity:before},newData:{stock_quantity:after,reason:body.reason||'Manual adjustment'}}); return Response.json({data:tx},{status:201});
  }
  const table=tableFor(resource); if(!table||resource==='customers')return jsonError('This resource is not writable here.',405);
  if(resource==='settings'){
    const payload={company_id:companyId,website_name:cleanString(body.website_name,120)||DEFAULT_STORE_NAME,slug:slugify(body.slug||body.website_name||DEFAULT_STORE_SLUG),logo_url:cleanString(body.logo_url,1000)||null,favicon_url:cleanString(body.favicon_url,1000)||null,whatsapp_number:cleanString(body.whatsapp_number,30)||null,phone:cleanString(body.phone,30)||null,email:cleanString(body.email,160)||null,address:cleanString(body.address,2000)||null,gstin:cleanString(body.gstin,30)||null,currency:cleanString(body.currency,10)||'INR',timezone:cleanString(body.timezone,80)||'Asia/Kolkata',cod_enabled:body.cod_enabled!==false,online_payment_enabled:body.online_payment_enabled===true,shipping_enabled:body.shipping_enabled!==false,free_shipping_threshold:Number(body.free_shipping_threshold||0),default_shipping_charge:Number(body.default_shipping_charge||0),meta_title:cleanString(body.meta_title,180)||null,meta_description:cleanString(body.meta_description,320)||null,status:cleanString(body.status,30)||'active',updated_at:new Date().toISOString()};
    const {data,error:dbError}=await supabase.from(table).upsert(payload,{onConflict:'company_id'}).select().single(); if(dbError)return jsonError(dbError.message,500); await audit(supabase,{companyId,userId:user.id,action:'settings.upsert',entityType:'website_settings',entityId:data.id,newData:data}); return Response.json({data},{status:201});
  }
  const payload=sanitizePayload(resource,body,companyId); if(resource==='orders')payload.order_number=payload.order_number||`PB-${Date.now().toString().slice(-9)}`; if(resource==='products'&&!payload.sku)payload.sku=`PB-${Date.now().toString().slice(-8)}`; if(resource==='products'&&!payload.slug)payload.slug=slugify(payload.title); if(resource==='categories'&&!payload.slug)payload.slug=slugify(payload.name); if(resource==='pages'&&!payload.slug)payload.slug=slugify(payload.title); if(resource==='discounts'&&payload.code)payload.code=payload.code.toUpperCase();
  if(resource==='images'&&payload.is_primary===true){await supabase.from('website_product_images').update({is_primary:false}).eq('company_id',companyId).eq('product_id',payload.product_id)}
  const {data,error:dbError}=await supabase.from(table).insert(payload).select().single(); if(dbError)return jsonError(dbError.message,500); await audit(supabase,{companyId,userId:user.id,action:`${resource}.create`,entityType:table,entityId:data.id,newData:data}); return Response.json({data},{status:201});
}

export async function PATCH(request,{params}){
  const {resource}=await params,ctx=await getWebsiteAdminContext(); if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403); const {supabase,companyId,user}=ctx; const body=await request.json().catch(()=>null); if(!body?.id)return jsonError('Record id is required.'); if(resource==='customers')return jsonError('Customer master is read-only from Website admin.',405); const table=tableFor(resource); if(!table||resource==='settings')return jsonError('Invalid update resource.',405); const {data:oldData}=await supabase.from(table).select('*').eq('company_id',companyId).eq('id',body.id).maybeSingle(); if(!oldData)return jsonError('Record not found.',404); const payload=sanitizePayload(resource,body,companyId,true); delete payload.id; delete payload.company_id; delete payload.created_at; payload.updated_at=new Date().toISOString(); if(resource==='images'&&payload.is_primary===true){await supabase.from('website_product_images').update({is_primary:false}).eq('company_id',companyId).eq('product_id',body.product_id||oldData.product_id).neq('id',body.id)} const {data,error:dbError}=await supabase.from(table).update(payload).eq('company_id',companyId).eq('id',body.id).select().single(); if(dbError)return jsonError(dbError.message,500); if(resource==='orders'&&body.order_status&&body.order_status!==oldData.order_status)await supabase.from('website_order_status_history').insert({company_id:companyId,order_id:data.id,status:data.order_status,note:cleanString(body.status_note,500)||null,created_by:user.id}); await audit(supabase,{companyId,userId:user.id,action:`${resource}.update`,entityType:table,entityId:data.id,oldData,newData:data}); return Response.json({data});
}

export async function DELETE(request,{params}){const {resource}=await params,ctx=await getWebsiteAdminContext(); if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403); const {supabase,companyId,user}=ctx; const id=new URL(request.url).searchParams.get('id'); if(!id)return jsonError('Record id is required.'); const table=tableFor(resource); if(!table||['settings','orders'].includes(resource))return jsonError('Delete is disabled for this resource.',405); const {data:oldData}=await supabase.from(table).select('*').eq('company_id',companyId).eq('id',id).maybeSingle(); if(!oldData)return jsonError('Record not found.',404); const {error:dbError}=await supabase.from(table).delete().eq('company_id',companyId).eq('id',id); if(dbError)return jsonError(dbError.message,500); await audit(supabase,{companyId,userId:user.id,action:`${resource}.delete`,entityType:table,entityId:id,oldData}); return Response.json({ok:true});}

function sanitizePayload(resource,b,companyId,partial=false){const payload={company_id:companyId}; const text=(k,max=5000)=>{if(!partial||b[k]!==undefined)payload[k]=cleanString(b[k],max)||null}; const num=(k,f=0)=>{if(!partial||b[k]!==undefined)payload[k]=Number.isFinite(Number(b[k]))?Number(b[k]):f}; const bool=(k,f=false)=>{if(!partial||b[k]!==undefined)payload[k]=b[k]===true||b[k]==='true'};
  if(resource==='categories'){text('name',120);text('slug',180);text('description',2000);text('image_url',1000);num('sort_order');bool('is_active',true);text('seo_title',180);text('seo_description',320)}
  if(resource==='products'){text('sku',100);text('title',180);text('slug',180);text('short_description',1000);text('description',10000);text('brand',120);num('price');num('compare_at_price');num('cost_price');num('gst_percent');text('hsn_code',30);text('barcode',100);num('weight');num('stock_quantity');num('low_stock_threshold');bool('track_inventory',true);bool('allow_backorder',false);bool('featured',false);bool('is_active',true);text('seo_title',180);text('seo_description',320);text('seo_keywords',1000)}
  if(resource==='images'){text('product_id',100);text('image_url',1500);text('alt_text',300);num('sort_order');bool('is_primary',false)}
  if(resource==='pages'){text('title',180);text('slug',180);payload.content=b.content&&typeof b.content==='object'?b.content:{html:cleanString(b.content,20000)};text('seo_title',180);text('seo_description',320);bool('is_published',false)}
  if(resource==='banners'){text('title',180);text('subtitle',500);text('image_url',1500);text('mobile_image_url',1500);text('button_text',100);text('button_url',1000);num('sort_order');bool('is_active',true);if(!partial||b.starts_at!==undefined)payload.starts_at=b.starts_at||null;if(!partial||b.ends_at!==undefined)payload.ends_at=b.ends_at||null}
  if(resource==='homepage-sections'){text('section_type',80);text('title',180);payload.settings=b.settings&&typeof b.settings==='object'?b.settings:{};num('sort_order');bool('is_active',true)}
  if(resource==='navigation'){text('location',60);text('name',120);payload.items=Array.isArray(b.items)?b.items:[]}
  if(resource==='discounts'){text('name',180);text('code',60);text('discount_type',40);num('value');num('minimum_order_amount');num('maximum_discount_amount');num('usage_limit');if(!partial||b.starts_at!==undefined)payload.starts_at=b.starts_at||null;if(!partial||b.ends_at!==undefined)payload.ends_at=b.ends_at||null;bool('is_active',true)}
  if(resource==='orders'){text('order_number',80);text('customer_id',100);text('customer_name',180);text('customer_phone',40);text('customer_email',160);payload.shipping_address=b.shipping_address&&typeof b.shipping_address==='object'?b.shipping_address:{};payload.billing_address=b.billing_address&&typeof b.billing_address==='object'?b.billing_address:{};num('subtotal');num('discount_amount');num('shipping_amount');num('tax_amount');num('total_amount');text('payment_method',50);text('payment_status',40);text('order_status',40);text('notes',3000)}
  return payload;
}