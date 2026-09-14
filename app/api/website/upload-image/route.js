import { getWebsiteAdminContext, cleanString, jsonError, audit } from '@/lib/website-admin';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/gif','gif'],['image/svg+xml','svg']]);

export async function POST(request){
  const ctx=await getWebsiteAdminContext();
  if(ctx.error)return jsonError(ctx.error==='UNAUTHENTICATED'?'Please login.':'Access denied.',ctx.error==='UNAUTHENTICATED'?401:403);
  const {supabase,companyId,user}=ctx;
  const form=await request.formData().catch(()=>null);
  const file=form?.get('file');
  const folder=cleanString(form?.get('folder'),60).replace(/[^a-zA-Z0-9_-]/g,'-')||'general';
  if(!file||typeof file.arrayBuffer!=='function')return jsonError('Image file is required.');
  const ext=TYPES.get(file.type); if(!ext)return jsonError('Unsupported image type. Use JPG, PNG, WEBP, GIF or SVG.');
  if(file.size>MAX_BYTES)return jsonError('Image must be 5 MB or smaller.');
  const path=`${companyId}/${folder}/${randomUUID()}.${ext}`;
  const bytes=await file.arrayBuffer();
  const {error}=await supabase.storage.from('website-images').upload(path,bytes,{contentType:file.type,cacheControl:'31536000',upsert:false});
  if(error)return jsonError(error.message,500);
  const {data}=supabase.storage.from('website-images').getPublicUrl(path);
  await audit(supabase,{companyId,userId:user.id,action:'image.upload',entityType:'storage_object',newData:{bucket:'website-images',path,url:data.publicUrl,folder}});
  return Response.json({url:data.publicUrl,path},{status:201});
}
