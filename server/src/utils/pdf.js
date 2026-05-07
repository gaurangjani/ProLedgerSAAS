const PDFDocument = require('pdfkit');

function generateInvoicePdf(invoice, org) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const BLUE  = '#2980b9';
    const DARK  = '#2c3e50';
    const GREY  = '#7f8c8d';
    const LIGHT = '#ecf0f1';
    const fmt   = (n) => (n || 0).toFixed(2);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

    // ── Header ─────────────────────────────────────────
    doc.fontSize(24).fillColor(BLUE).font('Helvetica-Bold').text(org.name || 'Company Name', 50, 50);
    doc.fontSize(10).fillColor(GREY).font('Helvetica');
    if (org.address) doc.text(org.address, 50, 80);
    if (org.phone)   doc.text(org.phone);
    if (org.vatNumber) doc.text(`VAT: ${org.vatNumber}`);

    // Invoice title (right-aligned)
    doc.fontSize(32).fillColor(DARK).font('Helvetica-Bold').text('INVOICE', 350, 50, { width: 200, align: 'right' });
    doc.fontSize(11).fillColor(GREY).font('Helvetica')
      .text(`# ${invoice.invoiceNumber}`, 350, 95, { width: 200, align: 'right' });

    // ── Divider ────────────────────────────────────────
    doc.moveTo(50, 145).lineTo(545, 145).strokeColor(BLUE).lineWidth(2).stroke();

    // ── Bill To / Dates ────────────────────────────────
    doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold').text('BILL TO', 50, 160);
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
      .text(invoice.customerName || invoice.customer?.customerName || 'Customer', 50, 175);

    doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold');
    doc.text('INVOICE DATE', 350, 160, { width: 195, align: 'right' });
    doc.fontSize(10).fillColor(DARK).font('Helvetica').text(fmtDate(invoice.invoiceDate), 350, 175, { width: 195, align: 'right' });
    doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold').text('DUE DATE', 350, 195, { width: 195, align: 'right' });
    doc.fontSize(10).fillColor(DARK).font('Helvetica').text(fmtDate(invoice.dueDate), 350, 210, { width: 195, align: 'right' });

    // ── Line items table ───────────────────────────────
    const tableTop = 250;
    const col = { desc: 50, qty: 310, price: 380, tax: 440, amount: 490 };

    // Table header
    doc.rect(50, tableTop, 495, 22).fill(BLUE);
    doc.fontSize(9).fillColor('white').font('Helvetica-Bold');
    doc.text('DESCRIPTION',   col.desc  + 5, tableTop + 6);
    doc.text('QTY',           col.qty,       tableTop + 6, { width: 60, align: 'right' });
    doc.text('UNIT PRICE',    col.price,     tableTop + 6, { width: 50, align: 'right' });
    doc.text('TAX %',         col.tax,       tableTop + 6, { width: 45, align: 'right' });
    doc.text('AMOUNT',        col.amount,    tableTop + 6, { width: 55, align: 'right' });

    // Table rows
    let y = tableTop + 22;
    const lines = invoice.lines || [];
    lines.forEach((line, i) => {
      const rowBg = i % 2 === 0 ? 'white' : LIGHT;
      doc.rect(50, y, 495, 20).fill(rowBg);
      doc.fontSize(9).fillColor(DARK).font('Helvetica');
      doc.text(line.description || '', col.desc + 5, y + 5, { width: 240, ellipsis: true });
      doc.text(String(line.quantity || 0),             col.qty,   y + 5, { width: 60, align: 'right' });
      doc.text(`£${fmt(line.unitPrice)}`,              col.price, y + 5, { width: 50, align: 'right' });
      doc.text(`${line.taxRate || 0}%`,                col.tax,   y + 5, { width: 45, align: 'right' });
      doc.text(`£${fmt(line.amount)}`,                 col.amount,y + 5, { width: 55, align: 'right' });
      y += 20;
    });

    // Bottom border
    doc.moveTo(50, y).lineTo(545, y).strokeColor(LIGHT).lineWidth(1).stroke();
    y += 15;

    // ── Totals ─────────────────────────────────────────
    const totalsX = 380;
    const addTotal = (label, value, bold = false, color = DARK) => {
      doc.fontSize(10).fillColor(GREY).font('Helvetica').text(label, totalsX, y, { width: 100 });
      doc.fontSize(10).fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(`£${fmt(value)}`, totalsX + 100, y, { width: 65, align: 'right' });
      y += 18;
    };

    addTotal('Subtotal', invoice.subtotal);
    addTotal('Tax', invoice.taxAmount);
    doc.moveTo(totalsX, y - 2).lineTo(545, y - 2).strokeColor(BLUE).lineWidth(1).stroke();
    y += 4;
    addTotal('Total', invoice.totalAmount, true, BLUE);
    if ((invoice.amountPaid || 0) > 0) {
      addTotal('Amount Paid', invoice.amountPaid);
      addTotal('Balance Due', invoice.amountDue, true, '#e74c3c');
    }

    // ── Notes ──────────────────────────────────────────
    if (invoice.notes) {
      y += 20;
      doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold').text('NOTES', 50, y);
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(invoice.notes, 50, y + 14, { width: 495 });
    }

    // ── Footer ─────────────────────────────────────────
    doc.fontSize(8).fillColor(GREY).font('Helvetica')
      .text(`Generated by ${org.name || 'LedgerPro'} · ${new Date().toLocaleDateString('en-GB')}`, 50, 780, { align: 'center', width: 495 });

    doc.end();
  });
}

module.exports = { generateInvoicePdf };
