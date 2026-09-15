import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {createAdminClient} from '@/lib/supabase-admin';
import {notFound,redirect} from 'next/navigation';
import InvoiceDocument from '@/components/InvoiceDocument';

export const dynamic='force-dynamic';
export const revalidate=0;

export default async function CustomerInvoicePage({params}){
 const {id}=await params;
 const jar=await cookies();
 const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll(){return jar.getAll()},setAll(){}}});
 const {data:{user}}=await auth.auth.getUser();
 if(!user?.email)redirect(`/account/login?next=/orders/${id}/invoice`);
 const db=createAdminClient();
 const {data:settings}=await db.from('website_settings').select('company_id,website_name,logo_url,phone,email,address,gstin,currency').eq('slug','pinkbox').eq('status','active').maybeSingle();
 if(!settings)return notFound();
 const {data:order}=await db.from('website_orders').select('*').eq('id',id).eq('company_id',settings.company_id).eq('customer_email',user.email).maybeSingle();
 if(!order)return notFound();
 const {data:items}=await db.from('website_order_items').select('*').eq('company_id',settings.company_id).eq('order_id',order.id).order('id');
 return <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6"><InvoiceDocument settings={settings} order={order} items={items||[]} backHref={`/orders/${order.id}`}/></main>;
}