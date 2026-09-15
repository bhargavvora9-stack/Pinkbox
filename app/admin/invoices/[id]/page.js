import {createClient} from '@/lib/supabase-server';
import {notFound,redirect} from 'next/navigation';
import InvoiceDocument from '@/components/InvoiceDocument';

export const dynamic='force-dynamic';
export const revalidate=0;

export default async function AdminInvoicePage({params}){
 const {id}=await params;
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('company_id,role,active').eq('id',user.id).maybeSingle();
 if(!profile||profile.active===false||!['super_admin','admin'].includes(profile.role)||!profile.company_id)redirect('/login?error=not_admin');
 const {data:settings}=await supabase.from('website_settings').select('company_id,website_name,logo_url,phone,email,address,gstin,currency').eq('company_id',profile.company_id).eq('slug','pinkbox').eq('status','active').maybeSingle();
 if(!settings)return notFound();
 const {data:order}=await supabase.from('website_orders').select('*').eq('company_id',profile.company_id).eq('id',id).maybeSingle();
 if(!order)return notFound();
 const {data:items}=await supabase.from('website_order_items').select('*').eq('company_id',profile.company_id).eq('order_id',order.id).order('id');
 return <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6"><InvoiceDocument settings={settings} order={order} items={items||[]} backHref="/admin/invoices"/></main>;
}