import {getWebsiteAdminContext,jsonError,audit} from '@/lib/website-admin';
const tableMap={roles:'website_roles',automations:'website_automations'};
const allowedTriggers=new Set(['order_created','order_confirmed','order_shipped','order_delivered','low_stock','abandoned_cart']);
const allowedActions=new Set(['create_notification','update_order']);
const orderTriggers=new Set(['order_created','order_confirmed','order_shipped','order_delivered']);
const clean=(v,max=5000)=>typeof v==='string'?v.trim().slice(0,max):'';
const getAnalytics=async(supabase,companyId)=>{
 const{data,error}=await supabase.rpc('get_website_analytics',{p_company_id:companyId});
 if(error)throw new Error(error.message);return data||{};
};
export async function GET(request){
 const r=new URL(request.url).searchParams.get('resource'),ctx=await getWebsiteAdminContext();
 if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);
 const{supabase,companyId}=ctx;
 if(r==='analytics'){
  try{return Response.json({data:await getAnalytics(supabase,companyId)});}catch(e){return jsonError(e.message,500);}
 }
 if(r==='reports'){
  const summary=await getAnalytics(supabase,companyId).catch(e=>null);
  const[o,i,p]=await Promise.all([supabase.from('website_orders').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(5000),supabase.from('website_order_items').select('*').eq('company_id',companyId).order('id').limit(20000),supabase.from('website_products').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(2000)]);
  if(o.error||i.error||p.error)return jsonError((o.error||i.error||p.error).message,500);
  return Response.json({data:{summary,orders:o.data||[],items:i.data||[],products:p.data||[]}});
 }
 if(r==='health'){
  const tables=['website_settings','website_products','website_categories','website_orders','website_order_items','customers','website_product_reviews','website_discounts'];
  const checks=await Promise.all(tables.map(async t=>{const{count,error}=await supabase.from(t).select('id',{count:'exact',head:true}).eq('company_id',companyId);return{table:t,ok:!error,count:count||0,error:error?.message||null}}));
  const status=checks.every(c=>c.ok)?'healthy':checks.some(c=>c.ok)?'degraded':'down';
  return Response.json({data:{status,checks,checkedAt:new Date().toISOString()}});
 }
 const t=tableMap[r];if(!t)return jsonError('Unknown Phase 6 resource.',404);
 const{data,error}=await supabase.from(t).select('*').eq('company_id',companyId).order('created_at',{ascending:false});
 if(error)return jsonError(error.message,500);return Response.json({data:data||[]});
}
export async function POST(request){
 const r=new URL(request.url).searchParams.get('resource'),ctx=await getWebsiteAdminContext();
 if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);
 const{supabase,companyId,user}=ctx,b=await request.json().catch(()=>({})),t=tableMap[r];
 if(!t)return jsonError('Unknown Phase 6 resource.',404);
 if(r==='automations'){
  const trigger=clean(b.trigger_type,80),action=clean(b.action_type,80);
  if(!allowedTriggers.has(trigger)||!allowedActions.has(action))return jsonError('Invalid automation trigger or action.');
  if(action==='update_order'&&!orderTriggers.has(trigger))return jsonError('Update order is only available for order-related triggers.');
  if(!clean(b.name,120))return jsonError('Automation name is required.');
 }
 if(r==='roles'){
  const name=clean(b.name,80);if(!name)return jsonError('Role name is required.');
  b.name=name;b.description=clean(b.description,500)||null;b.permissions=b.permissions&&typeof b.permissions==='object'?b.permissions:{view:true,create:false,update:false,delete:false};
 }
 const p={...b,company_id:companyId};delete p.resource;delete p.id;delete p.company_id;
 if(r==='automations'){
  p.name=clean(p.name,120);p.trigger_type=clean(p.trigger_type,80);p.action_type=clean(p.action_type,80);p.config=p.config&&typeof p.config==='object'?p.config:{};p.is_active=p.is_active!==false;
 }
 const{data,error}=await supabase.from(t).insert({...p,company_id:companyId}).select().single();if(error)return jsonError(error.message,500);
 await audit(supabase,{companyId,userId:user.id,action:`phase6.${r}.create`,entityType:t,entityId:data.id,newData:data});return Response.json({data},{status:201});
}
export async function DELETE(request){const r=new URL(request.url).searchParams.get('resource'),ctx=await getWebsiteAdminContext();if(ctx.error)return jsonError('Access denied.',403);const{supabase,companyId,user}=ctx,b=await request.json().catch(()=>({})),t=tableMap[r];if(!t||!b.id)return jsonError('Resource and id required.');const{data:oldData}=await supabase.from(t).select('*').eq('company_id',companyId).eq('id',b.id).maybeSingle();if(!oldData)return jsonError('Record not found.',404);const{error}=await supabase.from(t).delete().eq('company_id',companyId).eq('id',b.id);if(error)return jsonError(error.message,500);await audit(supabase,{companyId,userId:user.id,action:`phase6.${r}.delete`,entityType:t,entityId:b.id,oldData});return Response.json({ok:true})}

export async function PATCH(request){
 const r=new URL(request.url).searchParams.get('resource');
 const ctx=await getWebsiteAdminContext();
 if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);
 const{supabase,companyId,user}=ctx;
 const b=await request.json().catch(()=>null);
 const t=tableMap[r];
 if(!t||!b?.id)return jsonError('Resource and record id are required.');
 const{data:oldData,error:readError}=await supabase.from(t).select('*').eq('company_id',companyId).eq('id',b.id).maybeSingle();
 if(readError)return jsonError(readError.message,500);
 if(!oldData)return jsonError('Record not found.',404);
 const nextTrigger=b.trigger_type!==undefined?clean(b.trigger_type,80):oldData.trigger_type;
 const nextAction=b.action_type!==undefined?clean(b.action_type,80):oldData.action_type;
 if(nextAction==='update_order'&&!orderTriggers.has(nextTrigger))return jsonError('Update order is only available for order-related triggers.');
 const p={};
 if(r==='automations'){
  if(b.name!==undefined){const name=clean(b.name,120);if(!name)return jsonError('Automation name is required.');p.name=name;}
  if(b.trigger_type!==undefined){const trigger=clean(b.trigger_type,80);if(!allowedTriggers.has(trigger))return jsonError('Invalid automation trigger.');p.trigger_type=trigger;}
  if(b.action_type!==undefined){const action=clean(b.action_type,80);if(!allowedActions.has(action))return jsonError('Invalid automation action.');p.action_type=action;}
  if(b.config!==undefined){if(!b.config||typeof b.config!=='object'||Array.isArray(b.config))return jsonError('Automation config must be an object.');p.config=b.config;}
  if(b.is_active!==undefined){if(typeof b.is_active!=='boolean')return jsonError('is_active must be boolean.');p.is_active=b.is_active;}
 }else{
  return jsonError('This resource does not support updates.',405);
 }
 if(!Object.keys(p).length)return jsonError('No changes supplied.');
 const{data,error}=await supabase.from(t).update(p).eq('company_id',companyId).eq('id',b.id).select().single();
 if(error)return jsonError(error.message,500);
 await audit(supabase,{companyId,userId:user.id,action:`phase6.${r}.update`,entityType:t,entityId:b.id,oldData,newData:data});
 return Response.json({data});
}
