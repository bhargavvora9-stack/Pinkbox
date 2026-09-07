import {getWebsiteAdminContext,jsonError,audit} from '@/lib/website-admin';
const tableMap={roles:'website_roles',automations:'website_automations'};
const paidStatuses=['paid','captured','success'];
const allowedTriggers=new Set(['order_created','order_confirmed','order_shipped','order_delivered','low_stock','abandoned_cart']);
const allowedActions=new Set(['create_notification','update_order']);
const clean=(v,max=5000)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function GET(request){
 const r=new URL(request.url).searchParams.get('resource'),ctx=await getWebsiteAdminContext();
 if(ctx.error)return jsonError('Access denied.',403);
 const{supabase,companyId}=ctx;
 if(r==='analytics'){
  const [o,i,p,c]=await Promise.all([
   supabase.from('website_orders').select('id,total_amount,payment_status,order_status,created_at').eq('company_id',companyId).limit(5000),
   supabase.from('website_order_items').select('product_id,product_name,quantity,line_total').eq('company_id',companyId).limit(10000),
   supabase.from('website_products').select('id,stock_quantity,low_stock_threshold').eq('company_id',companyId),
   supabase.from('customers').select('id').eq('company_id',companyId)
  ]);
  if(o.error||i.error||p.error||c.error)return jsonError((o.error||i.error||p.error||c.error).message,500);
  const orders=o.data||[],items=i.data||[],products=p.data||[];
  const sales=orders.reduce((n,x)=>n+Number(x.total_amount||0),0);
  const paid=orders.filter(x=>paidStatuses.includes(String(x.payment_status||'').toLowerCase())).reduce((n,x)=>n+Number(x.total_amount||0),0);
  const dailyMap={},topMap={},orderStatus={},paymentStatus={};
  for(const x of orders){const day=String(x.created_at||'').slice(0,10);if(day)dailyMap[day]=(dailyMap[day]||0)+Number(x.total_amount||0);const os=x.order_status||'unknown';orderStatus[os]=(orderStatus[os]||0)+1;const ps=x.payment_status||'unknown';paymentStatus[ps]=(paymentStatus[ps]||0)+1;}
  for(const x of items){const key=x.product_id||x.product_name||'unknown';if(!topMap[key])topMap[key]={product_id:x.product_id||null,product_name:x.product_name||'Unknown',quantity:0,sales:0};topMap[key].quantity+=Number(x.quantity||0);topMap[key].sales+=Number(x.line_total||0);}
  const daily=Object.entries(dailyMap).sort(([a],[b])=>a.localeCompare(b)).slice(-90).map(([date,total])=>({date,total}));
  const topProducts=Object.values(topMap).sort((a,b)=>b.sales-a.sales).slice(0,20);
  return Response.json({data:{stats:{sales,orders:orders.length,aov:orders.length?sales/orders.length:0,customers:c.data?.length||0,products:products.length,lowStock:products.filter(x=>Number(x.stock_quantity||0)<=Number(x.low_stock_threshold||0)&&Number(x.stock_quantity||0)>0).length,outOfStock:products.filter(x=>Number(x.stock_quantity||0)<=0).length,paidSales:paid},daily,topProducts,orderStatus,paymentStatus}});
 }
 if(r==='reports'){
  const[o,i,p]=await Promise.all([supabase.from('website_orders').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(1000),supabase.from('website_order_items').select('*').eq('company_id',companyId).order('id').limit(5000),supabase.from('website_products').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(1000)]);
  if(o.error||i.error||p.error)return jsonError((o.error||i.error||p.error).message,500);
  return Response.json({data:{orders:o.data||[],items:i.data||[],products:p.data||[]}});
 }
 const t=tableMap[r];if(!t)return jsonError('Unknown Phase 6 resource.',404);const{data,error}=await supabase.from(t).select('*').eq('company_id',companyId).order('created_at',{ascending:false});if(error)return jsonError(error.message,500);return Response.json({data:data||[]});
}
export async function POST(request){const r=new URL(request.url).searchParams.get('resource'),ctx=await getWebsiteAdminContext();if(ctx.error)return jsonError('Access denied.',403);const{supabase,companyId,user}=ctx,b=await request.json().catch(()=>({})),t=tableMap[r];if(!t)return jsonError('Unknown Phase 6 resource.',404);if(r==='automations'){const trigger=clean(b.trigger,80),action=clean(b.action,80);if(!allowedTriggers.has(trigger)||!allowedActions.has(action))return jsonError('Invalid automation trigger or action.');}if(r==='roles'){const name=clean(b.name,80);if(!name)return jsonError('Role name is required.');b.name=name;}const p={...b,company_id:companyId};delete p.resource;delete p.id;delete p.company_id;const{data,error}=await supabase.from(t).insert({...p,company_id:companyId}).select().single();if(error)return jsonError(error.message,500);await audit(supabase,{companyId,userId:user.id,action:`phase6.${r}.create`,entityType:t,entityId:data.id,newData:data});return Response.json({data},{status:201})}
export async function DELETE(request){const r=new URL(request.url).searchParams.get('resource'),ctx=await getWebsiteAdminContext();if(ctx.error)return jsonError('Access denied.',403);const{supabase,companyId,user}=ctx,b=await request.json().catch(()=>({})),t=tableMap[r];if(!t||!b.id)return jsonError('Resource and id required.');const{error}=await supabase.from(t).delete().eq('company_id',companyId).eq('id',b.id);if(error)return jsonError(error.message,500);await audit(supabase,{companyId,userId:user.id,action:`phase6.${r}.delete`,entityType:t,entityId:b.id});return Response.json({ok:true})}
