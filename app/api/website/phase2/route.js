import {getWebsiteAdminContext,jsonError,audit} from '@/lib/website-admin';
const tables={brands:'website_brands',collections:'website_collections',variants:'website_product_variants',reviews:'website_product_reviews','product-collections':'website_product_collections'};
export async function GET(request){const{supabase,companyId,error}=await getWebsiteAdminContext();if(error)return jsonError(error==='UNAUTHENTICATED'?'Please login.':'Access denied.',error==='UNAUTHENTICATED'?401:403);const{searchParams}=new URL(request.url),resource=searchParams.get('resource'),table=tables[resource];if(!table)return jsonError('Unknown phase2 resource.',404);let q=supabase.from(table).select('*').eq('company_id',companyId).limit(200);if(resource!=='product-collections')q=q.order('created_at',{ascending:false});const{data,error:dbError}=await q;if(dbError)return jsonError(dbError.message,500);return Response.json({data:data||[]})}
export async function POST(request){return write(request,false)}
export async function PATCH(request){return write(request,true)}
export async function DELETE(request){const{supabase,companyId,user,error}=await getWebsiteAdminContext();if(error)return jsonError(error==='UNAUTHENTICATED'?'Please login.':'Access denied.',error==='UNAUTHENTICATED'?401:403);const{searchParams}=new URL(request.url),resource=searchParams.get('resource'),id=searchParams.get('id'),table=tables[resource];if(!table||!id)return jsonError('Resource and id are required.');const{data:oldData}=await supabase.from(table).select('*').eq('company_id',companyId).eq('id',id).maybeSingle();if(!oldData)return jsonError('Record not found.',404);const{error:dbError}=await supabase.from(table).delete().eq('company_id',companyId).eq('id',id);if(dbError)return jsonError(dbError.message,500);await audit(supabase,{companyId,userId:user.id,action:`${resource}.delete`,entityType:table,entityId:id,oldData});return Response.json({ok:true})}
async function write(request,partial){const{supabase,companyId,user,error}=await getWebsiteAdminContext();if(error)return jsonError(error==='UNAUTHENTICATED'?'Please login.':'Access denied.',error==='UNAUTHENTICATED'?401:403);const{searchParams}=new URL(request.url),resource=searchParams.get('resource'),table=tables[resource];if(!table)return jsonError('Unknown phase2 resource.',404);const body=await request.json().catch(()=>({}));if(resource==='product-collections' && Array.isArray(body.collection_ids)){
  if(!body.product_id)return jsonError('Product is required.');
  const ids=[...new Set(body.collection_ids.map(String))];
  if(ids.length!==body.collection_ids.length)return jsonError('Duplicate collection ids are not allowed.');
  const [{data:product,error:productError},{data:collections,error:collectionError},{data:before,error:beforeError}]=await Promise.all([
    supabase.from('website_products').select('id').eq('company_id',companyId).eq('id',body.product_id).maybeSingle(),
    ids.length?supabase.from('website_collections').select('id').eq('company_id',companyId).in('id',ids):Promise.resolve({data:[],error:null}),
    supabase.from(table).select('collection_id').eq('company_id',companyId).eq('product_id',body.product_id)
  ]);
  if(productError||collectionError||beforeError)return jsonError(productError?.message||collectionError?.message||beforeError?.message||'Unable to validate collection mapping.',500);
  if(!product)return jsonError('Product not found.',404);
  if((collections||[]).length!==ids.length)return jsonError('One or more collections were not found for this company.',400);
  const currentIds=new Set((before||[]).map(row=>row.collection_id)),desiredIds=new Set(ids);
  const additions=ids.filter(id=>!currentIds.has(id));
  if(additions.length){
    const {error:insertError}=await supabase.from(table).insert(additions.map(collection_id=>({company_id:companyId,product_id:body.product_id,collection_id})));
    if(insertError)return jsonError(insertError.message,500);
  }
  const removals=[...currentIds].filter(id=>!desiredIds.has(id));
  for(const collectionId of removals){
    const {error:removeError}=await supabase.from(table).delete().eq('company_id',companyId).eq('product_id',body.product_id).eq('collection_id',collectionId);
    if(removeError)return jsonError('New collections were saved, but an old collection could not be removed. Please retry.',500);
  }
  await audit(supabase,{companyId,userId:user.id,action:'product.collections.replace',entityType:table,entityId:body.product_id,oldData:before||[],newData:ids.map(collection_id=>({collection_id}))});
  return Response.json({ok:true});
}if(resource==='brands'||resource==='collections'||resource==='variants'||resource==='reviews'){if(body.option_values&&typeof body.option_values==='string')body.option_values=JSON.parse(body.option_values||'{}')}const payload={...body,company_id:companyId};delete payload.resource;delete payload.id;delete payload.created_at;let result;if(partial){result=await supabase.from(table).update(payload).eq('company_id',companyId).eq('id',body.id).select().single()}else{result=await supabase.from(table).insert(payload).select().single()}if(result.error)return jsonError(result.error.message,500);await audit(supabase,{companyId,userId:user.id,action:`${resource}.${partial?'update':'create'}`,entityType:table,entityId:result.data.id,newData:result.data});return Response.json({data:result.data},{status:partial?200:201})}
