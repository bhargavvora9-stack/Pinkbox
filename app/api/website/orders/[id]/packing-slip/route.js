import { getWebsiteAdminContext, jsonError } from '@/lib/website-admin';
import PDFDocument from 'pdfkit';

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export async function GET(request, { params }) {
  const { id } = await params;
  const ctx = await getWebsiteAdminContext();
  if (ctx.error) return jsonError(ctx.error === 'UNAUTHENTICATED' ? 'Please login.' : 'Access denied.', ctx.error === 'UNAUTHENTICATED' ? 401 : 403);
  const { supabase, companyId } = ctx;

  const [orderRes, itemsRes, settingsRes] = await Promise.all([
    supabase.from('website_orders').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase.from('website_order_items').select('*').eq('company_id', companyId).eq('order_id', id).order('id'),
    supabase.from('website_settings').select('website_name,phone').eq('company_id', companyId).maybeSingle(),
  ]);
  if (orderRes.error) return jsonError(orderRes.error.message, 500);
  const order = orderRes.data;
  if (!order) return jsonError('Order not found.', 404);
  const items = itemsRes.data || [];
  const s = settingsRes.data || {};
  const a = order.shipping_address || {};

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.fontSize(11).fillColor('#888').text('PACKING SLIP', 50, 50);
  doc.fontSize(24).fillColor('#d9295f').text(s.website_name || 'PinkBox', 50, 68);
  doc.fontSize(11).fillColor('#111').text(order.order_number, 350, 55, { width: 195, align: 'right' });
  doc.fontSize(9).fillColor('#666').text(new Date(order.created_at).toLocaleDateString('en-IN'), 350, 75, { width: 195, align: 'right' });
  doc.fontSize(14).fillColor('#111').text(`Payment: ${order.payment_method || '—'}`, 350, 92, { width: 195, align: 'right' });

  doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#ccc').stroke();

  doc.fontSize(11).fillColor('#888').text('DELIVER TO', 50, 150);
  doc.fontSize(16).fillColor('#111').text(order.customer_name || '—', 50, 168);
  doc.fontSize(13).fillColor('#333').text(order.customer_phone || '—', 50, 192);
  if (a.address) doc.fontSize(12).fillColor('#333').text(a.address, 50, 212, { width: 460 });
  const cityLine = [a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : '');
  if (cityLine.trim()) doc.fontSize(13).fillColor('#111').text(cityLine, 50, doc.y + 4);

  let y = doc.y + 35;
  doc.fontSize(11).fillColor('#fff');
  doc.rect(50, y, 495, 24).fill('#2b1c22');
  doc.fillColor('#fff').text('Item', 60, y + 6, { width: 340 });
  doc.text('Qty', 470, y + 6, { width: 65, align: 'right' });
  y += 24;

  doc.fontSize(12).fillColor('#222');
  items.forEach((it, i) => {
    const rowH = 28;
    if (i % 2 === 1) { doc.rect(50, y, 495, rowH).fill('#faf6f4'); doc.fillColor('#222'); }
    doc.text(it.product_name || '—', 60, y + 8, { width: 340 });
    doc.fontSize(14).text(String(it.quantity || 0), 470, y + 6, { width: 65, align: 'right' });
    doc.fontSize(12);
    y += rowH;
  });
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();

  if (order.notes) {
    y += 20;
    doc.fontSize(10).fillColor('#888').text('Note:', 50, y);
    doc.fontSize(11).fillColor('#444').text(order.notes, 50, y + 14, { width: 495 });
  }

  doc.fontSize(9).fillColor('#999').text(s.phone ? `Questions about this order? Call ${s.phone}` : '', 50, 770, { width: 495, align: 'center' });

  const buffer = await streamToBuffer(doc);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Packing-Slip-${order.order_number}.pdf"`,
    },
  });
}
