import { getWebsiteAdminContext, cleanString, slugify, jsonError, audit } from '@/lib/website-admin';

const MAX_ROWS = 1000;
const columns = ['sku','title','slug','brand','short_description','description','price','compare_at_price','cost_price','gst_percent','hsn_code','barcode','weight','stock_quantity','low_stock_threshold','track_inventory','allow_backorder','featured','is_active','seo_title','seo_description','seo_keywords'];
const moneyFields = new Set(['price','compare_at_price','cost_price','gst_percent','weight','stock_quantity','low_stock_threshold']);
const boolFields = new Set(['track_inventory','allow_backorder','featured','is_active','delete']);
const optionalText = new Set(['slug','brand','short_description','description','hsn_code','barcode','seo_title','seo_description','seo_keywords']);

function csvEscape(value){const s=String(value ?? ''); return /[",\n\r]/.test(s) ? `"${s.replaceAll('"','""')}"` : s;}
function normalizeRow(row){
  const out={};
  for(const key of columns){
    const v=row?.[key];
    if(moneyFields.has(key)){ if(v===''||v===null||v===undefined) continue; const n=Number(v); if(!Number.isFinite(n)) throw Error(`${key} must be numeric.`); out[key]=n; continue; }
    if(boolFields.has(key)){ if(v===undefined||v==='') continue; out[key]=v===true||String(v).toLowerCase()==='true'||String(v)==='1'; continue; }
    if(v!==undefined&&v!==null&&String(v).trim()!=='') out[key]=cleanString(String(v), key==='description'?10000:key.startsWith('seo_')?1000:2000);
  }
  if(!out.sku) throw Error('SKU is required.');
  if(!out.title) throw Error(`Title is required for SKU ${out.sku}.`);
  out.sku=cleanString(out.sku,100);
  out.title=cleanString(out.title,180);
  out.slug=slugify(out.slug||out.title);
  return out;
}

export async function GET(){
  const ctx=await getWebsiteAdminContext();
  if(ctx.error)return jsonError('Access denied.',403);
  const {supabase,companyId}=ctx;
  const {data,error}=await supabase.from('website_products').select(columns.join(',')).eq('company_id',companyId).order('created_at',{ascending:false}).limit(5000);
  if(error)return jsonError(error.message,500);
  const header=columns.join(',');
  const body=(data||[]).map(row=>columns.map(k=>csvEscape(row[k])).join(',')).join('\n');
  return new Response(`${header}\n${body}`,{status:200,headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="pinkbox-products.csv"','Cache-Control':'no-store'}});
}

export async function POST(request){
  const ctx=await getWebsiteAdminContext();
  if(ctx.error)return jsonError('Access denied.',403);
  const {supabase,companyId,user}=ctx;
  const body=await request.json().catch(()=>null);
  if(!body||!Array.isArray(body.rows))return jsonError('rows array is required.');
  if(body.rows.length>MAX_ROWS)return jsonError(`Maximum ${MAX_ROWS} rows per import.`);
  const normalized=[];
  const deleteSkus=[];
  const seenSkus=new Set();
  try{
    for(const row of body.rows){
      const item=normalizeRow(row);
      const key=String(item.sku||'').trim().toLowerCase();
      if(seenSkus.has(key)) throw Error(`Duplicate SKU in import: ${item.sku}.`);
      seenSkus.add(key);
      if(item.delete===true) deleteSkus.push(item.sku);
      else {
        delete item.delete;
        normalized.push({...item,company_id:companyId});
      }
    }
  }catch(e){return jsonError(e.message||'Invalid CSV row.');}

  let deleted=[];
  if(deleteSkus.length){
    const {data,error}=await supabase
      .from('website_products')
      .delete()
      .eq('company_id',companyId)
      .in('sku',deleteSkus)
      .select('sku');
    if(error)return jsonError(error.message,500);
    deleted=data||[];
    await audit(supabase,{
      companyId,userId:user.id,action:'products.bulk_delete',entityType:'website_products',entityId:null,
      newData:{count:deleted.length,skus:deleted.map(x=>x.sku)}
    });
  }

  let imported=[];
  if(normalized.length){
    const {data,error}=await supabase.from('website_products').upsert(normalized,{onConflict:'company_id,sku'}).select('id,sku');
    if(error)return jsonError(error.message,500);
    imported=data||[];
    await audit(supabase,{
      companyId,userId:user.id,action:'products.bulk_import',entityType:'website_products',entityId:null,
      newData:{count:imported.length}
    });
  }

  const deletedSet=new Set(deleted.map(x=>String(x.sku).toLowerCase()));
  const missingDeleteSkus=deleteSkus.filter(s=>!deletedSet.has(String(s).toLowerCase()));
  return Response.json({
    count:imported.length+deleted.length,
    imported:imported.length,
    deleted:deleted.length,
    missing_delete_skus:missingDeleteSkus
  });
}
