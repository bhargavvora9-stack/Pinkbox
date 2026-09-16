import { getWebsiteAdminContext, jsonError } from '@/lib/website-admin';
import PDFDocument from 'pdfkit';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    supabase.from('website_settings').select('website_name,phone,email,address,gstin,logo_url').eq('company_id', companyId).maybeSingle(),
  ]);
  if (orderRes.error) return jsonError(orderRes.error.message, 500);
  const order = orderRes.data;
  if (!order) return jsonError('Order not found.', 404);
  const items = itemsRes.data || [];
  const s = settingsRes.data || {};
  const a = order.shipping_address || {};

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Header
  doc.fontSize(20).fillColor('#d9295f').text(s.website_name || 'PinkBox', 50, 50);
  doc.fontSize(9).fillColor('#666');
  if (s.address) doc.text(s.address, 50, 75, { width: 260 });
  const contactLine = [s.phone, s.email].filter(Boolean).join('  •  ');
  if (contactLine) doc.text(contactLine, 50, doc.y);
  if (s.gstin) doc.text(`GSTIN: ${s.gstin}`, 50, doc.y);

  doc.fontSize(16).fillColor('#111').text('TAX INVOICE', 350, 50, { width: 195, align: 'right' });
  doc.fontSize(9).fillColor('#444');
  doc.text(`Invoice #: ${order.order_number}`, 350, 75, { width: 195, align: 'right' });
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 350, doc.y, { width: 195, align: 'right' });
  doc.text(`Payment: ${order.payment_method || '—'} (${order.payment_status || '—'})`, 350, doc.y, { width: 195, align: 'right' });
  doc.text(`Status: ${order.order_status || '—'}`, 350, doc.y, { width: 195, align: 'right' });

  doc.moveTo(50, 150).lineTo(545, 150).strokeColor('#e5d9d9').stroke();

  // Bill to
  doc.fontSize(10).fillColor('#888').text('BILL TO / SHIP TO', 50, 165);
  doc.fontSize(11).fillColor('#111').text(order.customer_name || '—', 50, 180);
  doc.fontSize(9).fillColor('#444');
  if (order.customer_phone) doc.text(order.customer_phone, 50, doc.y);
  if (order.customer_email) doc.text(order.customer_email, 50, doc.y);
  if (a.address) doc.text(a.address, 50, doc.y, { width: 300 });
  const cityLine = [a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : '');
  if (cityLine.trim()) doc.text(cityLine, 50, doc.y, { width: 300 });

  // Items table
  let y = doc.y + 25;
  doc.fontSize(9).fillColor('#fff');
  doc.rect(50, y, 495, 22).fill('#2b1c22');
  doc.fillColor('#fff').text('Item', 58, y + 6, { width: 220 });
  doc.text('SKU', 280, y + 6, { width: 80 });
  doc.text('Qty', 365, y + 6, { width: 40, align: 'right' });
  doc.text('Price', 405, y + 6, { width: 65, align: 'right' });
  doc.text('Total', 470, y + 6, { width: 70, align: 'right' });
  y += 22;

  doc.fillColor('#222').fontSize(9);
  items.forEach((it, i) => {
    const rowH = 22;
    if (i % 2 === 1) { doc.rect(50, y, 495, rowH).fill('#faf6f4'); doc.fillColor('#222'); }
    doc.text(it.product_name || '—', 58, y + 6, { width: 215 });
    doc.text(it.sku || '—', 280, y + 6, { width: 80 });
    doc.text(String(it.quantity || 0), 365, y + 6, { width: 40, align: 'right' });
    doc.text(money(it.unit_price), 405, y + 6, { width: 65, align: 'right' });
    doc.text(money(it.line_total), 470, y + 6, { width: 70, align: 'right' });
    y += rowH;
  });
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5d9d9').stroke();
  y += 12;

  // Totals
  const totalsX = 350;
  const line = (label, value, bold = false) => {
    doc.fontSize(bold ? 11 : 9).fillColor(bold ? '#111' : '#555');
    doc.text(label, totalsX, y, { width: 100 });
    doc.text(value, totalsX + 100, y, { width: 95, align: 'right' });
    y += bold ? 18 : 15;
  };
  line('Subtotal', money(order.subtotal));
  if (Number(order.discount_amount) > 0) line('Discount', `-${money(order.discount_amount)}`);
  line('Shipping', money(order.shipping_amount));
  if (Number(order.tax_amount) > 0) line('Tax', money(order.tax_amount));
  doc.moveTo(totalsX, y).lineTo(545, y).strokeColor('#111').stroke();
  y += 6;
  line('Total', money(order.total_amount), true);

  if (order.notes) {
    y += 20;
    doc.fontSize(9).fillColor('#888').text('Note:', 50, y);
    doc.fillColor('#444').text(order.notes, 50, y + 12, { width: 495 });
  }

  doc.fontSize(8).fillColor('#999').text('This is a computer-generated invoice.', 50, 770, { width: 495, align: 'center' });

  const buffer = await streamToBuffer(doc);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice-${order.order_number}.pdf"`,
    },
  });
}
