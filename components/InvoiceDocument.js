import InvoiceActions from './InvoiceActions';

const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateText=v=>v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
const line=v=>String(v||'').trim();

export default function InvoiceDocument({settings,order,items,backHref}){
 const ship=order.shipping_address||{};
 const bill=order.billing_address||ship;
 const invoiceNo=`INV-${order.order_number}`;
 const tax=Number(order.tax_amount||0);
 const discount=Number(order.discount_amount||0);
 return <>
  <InvoiceActions backHref={backHref}/>
  <article className="invoice-sheet mx-auto w-full max-w-4xl bg-white text-gray-900 shadow-xl">
   <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-gray-900 p-8 pb-6">
    <div className="flex items-start gap-4">
      {settings.logo_url?<img src={settings.logo_url} alt={settings.website_name||'Logo'} className="h-16 w-16 rounded-xl object-contain"/>:null}
      <div><h1 className="text-2xl font-black tracking-tight">{settings.website_name||'PinkBox'}</h1>{line(settings.address)&&<p className="mt-1 max-w-md whitespace-pre-line text-xs leading-5 text-gray-600">{settings.address}</p>}{line(settings.phone)&&<p className="mt-1 text-xs text-gray-600">Phone: {settings.phone}</p>}{line(settings.email)&&<p className="text-xs text-gray-600">Email: {settings.email}</p>}{line(settings.gstin)&&<p className="mt-1 text-xs font-semibold">GSTIN: {settings.gstin}</p>}</div>
    </div>
    <div className="text-right"><p className="text-xs font-bold uppercase tracking-[.2em] text-gray-500">Tax Invoice</p><h2 className="mt-1 text-xl font-black">{invoiceNo}</h2><p className="mt-1 text-xs text-gray-600">Order: {order.order_number}</p><p className="text-xs text-gray-600">Date: {dateText(order.created_at)}</p><p className="mt-2 text-xs font-semibold capitalize">Payment: {String(order.payment_method||'').replaceAll('_',' ')} · {String(order.payment_status||'').replaceAll('_',' ')}</p></div>
   </header>
   <section className="grid gap-4 p-8 pb-5 sm:grid-cols-2">
    <div className="rounded-xl border p-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gray-500">Bill To</p><p className="mt-2 font-bold">{order.customer_name||'—'}</p><p className="text-sm text-gray-600">{order.customer_phone||'—'}</p>{order.customer_email&&<p className="text-sm text-gray-600">{order.customer_email}</p>}<p className="mt-2 whitespace-pre-line text-sm leading-5 text-gray-600">{line(bill.address)||'—'}{bill.city?`\n${bill.city}`:''}{bill.state?`, ${bill.state}`:''}{bill.pincode?` - ${bill.pincode}`:''}</p></div>
    <div className="rounded-xl border p-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gray-500">Ship To</p><p className="mt-2 font-bold">{ship.name||order.customer_name||'—'}</p><p className="text-sm text-gray-600">{ship.phone||order.customer_phone||'—'}</p><p className="mt-2 whitespace-pre-line text-sm leading-5 text-gray-600">{line(ship.address)||'—'}{ship.city?`\n${ship.city}`:''}{ship.state?`, ${ship.state}`:''}{ship.pincode?` - ${ship.pincode}`:''}</p></div>
   </section>
   <section className="px-8 pb-5"><div className="overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-gray-100 text-left text-[10px] font-bold uppercase tracking-wide text-gray-600"><tr><th className="p-3">#</th><th className="p-3">Item</th><th className="p-3">SKU</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Discount</th><th className="p-3 text-right">Tax</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{items.map((it,i)=><tr key={it.id||i}><td className="p-3 text-gray-500">{i+1}</td><td className="p-3 font-semibold">{it.product_name}</td><td className="p-3 text-gray-600">{it.sku||'—'}</td><td className="p-3 text-right">{Number(it.quantity||0)}</td><td className="p-3 text-right">{money(it.unit_price)}</td><td className="p-3 text-right">{money(it.discount_amount)}</td><td className="p-3 text-right">{money(it.tax_amount)}</td><td className="p-3 text-right font-semibold">{money(it.line_total)}</td></tr>)}</tbody></table></div></section>
   <section className="flex justify-end px-8 pb-8"><div className="w-full max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{money(order.subtotal)}</b></div><div className="flex justify-between"><span>Discount</span><b>- {money(discount)}</b></div><div className="flex justify-between"><span>Shipping</span><b>{Number(order.shipping_amount||0)?money(order.shipping_amount):'FREE'}</b></div><div className="flex justify-between"><span>Tax</span><b>{money(tax)}</b></div><div className="flex justify-between border-t-2 border-gray-900 pt-3 text-lg"><span className="font-black">Grand Total</span><b className="font-black">{money(order.total_amount)}</b></div></div></section>
   <footer className="border-t bg-gray-50 p-8 text-xs text-gray-500"><p>Thank you for shopping with {settings.website_name||'PinkBox'}.</p>{order.notes&&<p className="mt-2"><b>Order note:</b> {order.notes}</p>}<p className="mt-2">This invoice is system-generated and is valid without a signature.</p></footer>
  </article>
  <style>{`@media print{body{background:#fff!important}.no-print{display:none!important}.invoice-sheet{max-width:none!important;box-shadow:none!important}.invoice-sheet{break-inside:avoid}@page{size:A4;margin:10mm}}`}</style>
 </>;
}