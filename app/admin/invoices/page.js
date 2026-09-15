import Link from 'next/link';
import {createClient} from '@/lib/supabase-server';
import {redirect} from 'next/navigation';

export const dynamic='force-dynamic';
export const revalidate=0;

export default async function AdminInvoicesPage(){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('company_id,role,active').eq('id',user.id).maybeSingle();
 if(!profile||profile.active===false||!['super_admin','admin'].includes(profile.role)||!profile.company_id)redirect('/login?error=not_admin');
 const {data:orders,error}=await supabase.from('website_orders').select('id,order_number,customer_name,customer_email,total_amount,payment_status,order_status,created_at').eq('company_id',profile.company_id).order('created_at',{ascending:false}).limit(200);
 return <section className="space-y-5"><div><h1 className="text-2xl font-semibold">Invoices</h1><p className="mt-1 text-sm text-gray-500">View, print and save customer invoices as PDF.</p></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Invoice</th><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{error?<tr><td colSpan="8" className="p-10 text-center text-red-600">Unable to load invoices.</td></tr>:orders?.length?orders.map(o=><tr key={o.id}><td className="p-3 font-semibold">INV-{o.order_number}</td><td className="p-3">{o.order_number}</td><td className="p-3">{o.customer_name||'—'}<div className="text-xs text-gray-500">{o.customer_email||''}</div></td><td className="p-3">₹{Number(o.total_amount||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td className="p-3">{o.payment_status||'—'}</td><td className="p-3 capitalize">{String(o.order_status||'').replaceAll('_',' ')}</td><td className="p-3">{new Date(o.created_at).toLocaleDateString('en-IN')}</td><td className="p-3"><Link href={`/admin/invoices/${o.id}`} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">View / Print</Link></td></tr>):<tr><td colSpan="8" className="p-12 text-center text-gray-500">No orders yet.</td></tr>}</tbody></table></div></section>;
}