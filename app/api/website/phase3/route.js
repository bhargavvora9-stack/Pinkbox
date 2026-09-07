import { getWebsiteAdminContext, cleanString, audit, jsonError } from '@/lib/website-admin';

const tables = { orders:'website_orders', 'shipping-methods':'website_shipping_methods', 'shipping-zones':'website_shipping_zones', 'shipping-rules':'website_shipping_rules', payments:'website_payment_methods', 'abandoned-carts':'website_abandoned_carts' };
const ctxOrError = async () => { const c = await getWebsiteAdminContext(); return c; };

export async function GET(request) {
  const u = new URL(request.url); const resource = u.searchParams.get('resource'); const ctx = await ctxOrError();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId } = ctx;
  if (resource === 'order') {
    const id = u.searchParams.get('id'); if (!id) return jsonError('Order id is required.');
    const [order, items, history] = await Promise.all([
      supabase.from('website_orders').select('*').eq('company_id',companyId).eq('id',id).maybeSingle(),
      supabase.from('website_order_items').select('*').eq('company_id',companyId).eq('order_id',id).order('id'),
      supabase.from('website_order_status_history').select('*').eq('company_id',companyId).eq('order_id',id).order('created_at')
    ]);
    if (order.error) return jsonError(order.error.message,500); return Response.json({order:order.data,items:items.data||[],history:history.data||[]});
  }
  const table = tables[resource]; if (!table) return jsonError('Unknown Phase 3 resource.',404);
  let q = supabase.from(table).select('*').eq('company_id',companyId).limit(500);
  if (resource === 'orders') { q=q.order('created_at',{ascending:false}); const status=u.searchParams.get('status'); if(status&&status!=='all') q=q.eq('order_status',status); }
  else q=q.order('created_at',{ascending:false});
  const {data,error}=await q; if(error)return jsonError(error.message,500); return Response.json({data:data||[]});
}

export async function POST(request) {
  const ctx = await ctxOrError(); if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);
  const {supabase,companyId,user}=ctx; const b=await request.json().catch(()=>({}));
  if(b.resource==='order-status'){
    if(!b.id||!b.order_status)return jsonError('Order and status are required.');
    const {data,error}=await supabase.from('website_orders').update({order_status:cleanString(b.order_status,40),updated_at:new Date().toISOString()}).eq('company_id',companyId).eq('id',b.id).select().single();
    if(error)return jsonError(error.message,500);
    await supabase.from('website_order_status_history').insert({company_id:companyId,order_id:b.id,status:data.order_status,note:cleanString(b.note,1000)||null,created_by:user.id});
    await audit(supabase,{companyId,userId:user.id,action:'order.status',entityType:'website_order',entityId:b.id,newData:data}); return Response.json({data});
  }
  const resource=b.resource,table=tables[resource]; if(!table)return jsonError('Unknown Phase 3 resource.',404); delete b.resource; delete b.id;
  const payload={...b,company_id:companyId};
  if(resource==='payments' && payload.config && typeof payload.config==='string'){try{payload.config=JSON.parse(payload.config)}catch{return jsonError('Payment configuration must be valid JSON.')}}
  if(resource==='shipping-zones'){if(typeof payload.states==='string')try{payload.states=JSON.parse(payload.states)}catch{return jsonError('States must be valid JSON.')};if(typeof payload.pincodes==='string')try{payload.pincodes=JSON.parse(payload.pincodes)}catch{return jsonError('Pincodes must be valid JSON.')}}
  if(resource==='shipping-rules'){for(const k of ['zone_id','method_id'])if(payload[k]==='')payload[k]=null;}
  const {data,error}=await supabase.from(table).insert(payload).select().single(); if(error)return jsonError(error.message,500); await audit(supabase,{companyId,userId:user.id,action:`phase3.${resource}.create`,entityType:table,entityId:data.id,newData:data}); return Response.json({data},{status:201});
}

export async function PATCH(request) {
  const ctx=await ctxOrError();if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);const{supabase,companyId,user}=ctx;const b=await request.json().catch(()=>null);if(!b?.id||!b.resource)return jsonError('Resource and record id are required.');const table=tables[b.resource];if(!table)return jsonError('Unknown Phase 3 resource.',404);const{data:oldData}=await supabase.from(table).select('*').eq('company_id',companyId).eq('id',b.id).maybeSingle();if(!oldData)return jsonError('Record not found.',404);const p={...b,company_id:companyId};delete p.id;delete p.resource;delete p.created_at;p.updated_at=new Date().toISOString();if(p.config&&typeof p.config==='string')try{p.config=JSON.parse(p.config)}catch{return jsonError('Configuration must be valid JSON.')};const{data,error}=await supabase.from(table).update(p).eq('company_id',companyId).eq('id',b.id).select().single();if(error)return jsonError(error.message,500);await audit(supabase,{companyId,userId:user.id,action:`phase3.${b.resource}.update`,entityType:table,entityId:data.id,oldData,newData:data});return Response.json({data});
}

export async function DELETE(request) { const u=new URL(request.url);const resource=u.searchParams.get('resource');const id=u.searchParams.get('id');const ctx=await ctxOrError();if(ctx.error)return jsonError('Access denied.',403);const{supabase,companyId,user}=ctx;const table=tables[resource];if(!table||!id)return jsonError('Resource and id are required.');const{data:oldData}=await supabase.from(table).select('*').eq('company_id',companyId).eq('id',id).maybeSingle();if(!oldData)return jsonError('Record not found.',404);const{error}=await supabase.from(table).delete().eq('company_id',companyId).eq('id',id);if(error)return jsonError(error.message,500);await audit(supabase,{companyId,userId:user.id,action:`phase3.${resource}.delete`,entityType:table,entityId:id,oldData});return Response.json({ok:true}); }
