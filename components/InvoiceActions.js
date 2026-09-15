'use client';
import {Printer, X} from 'lucide-react';

export default function InvoiceActions({backHref='/admin/orders'}){
  return <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
    <a href={backHref} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">← Back</a>
    <div className="flex gap-2">
      <button type="button" onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"><Printer size={16}/> Print / Save PDF</button>
      <button type="button" onClick={()=>window.close()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"><X size={16}/> Close</button>
    </div>
  </div>
}