const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'vasify_crm_new_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      console.warn(`Fetch attempt ${i + 1} failed: ${err.message}. Retrying...`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function uploadPdfToPublicUrl(pdfBuffer, filename) {
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);
    const res = await fetchWithRetry('https://catbox.moe/user/api.php', { method: 'POST', body: formData });
    const url = (await res.text()).trim();
    if (url.startsWith('http')) {
      console.log('Uploaded PDF to public URL:', url);
      return url;
    }
  } catch (err) {
    console.warn('Public PDF upload failed:', err.message);
  }
  return null;
}

function amountInWords(amount) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
                 "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
                 "Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function convert(n) {
    if (!n) return "";
    if (n < 20)       return ones[n] + " ";
    if (n < 100)      return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    if (n < 1000)     return ones[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
    if (n < 100000)   return convert(Math.floor(n / 1000))    + "Thousand " + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000))  + "Lakh "     + convert(n % 100000);
    return               convert(Math.floor(n / 10000000)) + "Crore "    + convert(n % 10000000);
  }
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let out = "Indian Rupee " + (convert(rupees).trim() || "Zero");
  if (paise) out += " and " + convert(paise).trim() + " Paise";
  return out + " Only";
}

async function testSendWhatsApp() {
  try {
    const targetPhone = '918551890493';
    const invId = '7753d744-9671-40dc-a0c8-e20f5fc1f532';
    const INV_SELECT = `
      SELECT i.*, 
             COALESCE(i.customer_name_override, c.name) AS customer_name, 
             COALESCE(i.customer_company_override, c.company) AS customer_company, 
             COALESCE(i.customer_email_override, c.email) AS customer_email, 
             COALESCE(i.customer_phone_override, c.phone) AS customer_phone,
             COALESCE(
               NULLIF(i.customer_address_override, ''),
               CONCAT_WS(', ',
                 NULLIF(c.address,''),
                 NULLIF(c.city,''),
                 NULLIF(c.state,''),
                 NULLIF(c.zip_code,''),
                 NULLIF(c.country,'')
               )
             ) AS customer_address
      FROM invoices i 
      LEFT JOIN customers c ON i.customer_id = c.id
    `;
    const [invRows] = await pool.execute(INV_SELECT + ' WHERE i.id = ?', [invId]);
    if (!invRows.length) {
      console.error('Invoice not found');
      return;
    }
    const inv = invRows[0];
    const [items] = await pool.execute('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at', [invId]);

    const customerName = inv.customer_name || 'WhatsApp Client';
    const invoiceNumber = inv.invoice_number || inv.id || 'N/A';
    const orderNumber = inv.po_number || null;
    const pdfFilename = `invoice-${orderNumber || invoiceNumber}.pdf`;

    console.log('--- 1. Generating Vasify PDF Buffer ---');
    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        let subtotal = items.length ? items.reduce((s, it) => s + Number(it.amount || 0), 0) : Number(inv.amount || 0);
        const gstRate = Number(inv.tax || 18);
        const halfRate = gstRate / 2;
        const cgstAmt = (subtotal * halfRate) / 100;
        const sgstAmt = cgstAmt;
        const totalAmt = subtotal + cgstAmt + sgstAmt;
        const fmtD = (v) => {
          if (!v) return '—';
          const d = new Date(v);
          return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        const fmtN = (n) => Number(n || 0).toFixed(2);

        const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const DARK = '#1A1A1A', GRAY = '#555555', LGRAY = '#888888', BORD = '#CCCCCC', BGH = '#F5F5F5', BGTOT = '#EEEEEE', BGBAL = '#E8F5E9';
        const PW = 595.28, PH = 841.89, ML = 30, MR = 30, CW = PW - ML - MR;
        let y = 30;

        const logoPath = path.join(__dirname, '../assets/vasify_logo.png');
        if (fs.existsSync(logoPath)) {
          try { doc.image(logoPath, ML, y - 8, { fit: [220, 95] }); } catch (e) {}
        }

        const CX = ML + 130;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK).text('Vasify Technologies Pvt. Ltd.', CX, y, { width: CW - 130 });
        y += 14;
        doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('Axiom Milan CHS, 607, 22 Datta Mandir road\nDhanakurwadi, Kandivali West.\nMumbai Maharashtra 400067\nIndia', CX, y, { width: CW - 130, lineGap: 1 });
        y += 42;
        ['Company ID : U62011MH2024PTC421417', 'GSTIN: 27AAKCV0353N1ZW', 'PAN: AAKCV0353N', 'Tax ID ::MUMV33878F', 'www.vasifytech.com'].forEach(l => {
          doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(l, CX, y, { width: CW - 130 });
          y += 10;
        });

        doc.fontSize(26).font('Helvetica-Bold').fillColor(DARK).text('INVOICE', PW - MR - 180, 30, { align: 'right', width: 180 });
        y = Math.max(y, 122) + 4;

        const MBH = 68, HW = CW / 2;
        doc.rect(ML, y, CW, MBH).stroke(BORD);
        doc.moveTo(ML + HW, y).lineTo(ML + HW, y + MBH).stroke(BORD);
        doc.moveTo(ML, y + 14).lineTo(ML + CW, y + 14).stroke(BORD);

        const LR = [
          ['#', invoiceNumber],
          ['Invoice Date', fmtD(inv.issue_date || new Date())],
          ['Terms', 'Due on Receipt'],
          ['Due Date', fmtD(inv.due_date)],
          ['P.O.#', orderNumber || '—'],
        ];
        LR.forEach(([lbl, val], i) => {
          const ry = y + 16 + i * 10;
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY).text(`${lbl} :`, ML + 4, ry, { width: HW * 0.42 });
          doc.fontSize(6.5).font('Helvetica').fillColor(DARK).text(val, ML + HW * 0.44, ry, { width: HW * 0.54, lineBreak: false });
        });

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY).text('Place Of Supply', ML + HW + 4, y + 4, { width: 70 });
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor(DARK).text(': Maharashtra (27)', ML + HW + 76, y + 4, { width: HW - 80 });

        [['#', invoiceNumber], ['Invoice Date', fmtD(inv.issue_date || new Date())], ['Terms', 'Due on Receipt'], ['Due Date', fmtD(inv.due_date)]].forEach(([lbl, val], i) => {
          const ry = y + 16 + i * 11;
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY).text(`${lbl} :`, ML + HW + 4, ry, { width: 58 });
          doc.fontSize(6.5).font('Helvetica').fillColor(DARK).text(val, ML + HW + 64, ry, { width: HW - 68, lineBreak: false });
        });

        y += MBH + 6;

        const AW = HW - 3, SX = ML + HW + 3;
        const addrLines = [
          inv.customer_company || 'Vasify Tech',
          inv.customer_address || 'Mumbai, Maharashtra',
          inv.customer_email ? `Email: ${inv.customer_email}` : null,
          `Phone: ${targetPhone}`,
        ].filter(Boolean);

        const AH = Math.max(90, 20 + addrLines.length * 13 + 10);
        const drawAddrBox = (ox, title) => {
          doc.rect(ox, y, AW, AH).stroke(BORD);
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text(title, ox + 6, y + 5, { width: AW - 12 });
          doc.moveTo(ox, y + 14).lineTo(ox + AW, y + 14).stroke(BORD);

          let ay = y + 18;
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor(DARK).text(customerName, ox + 6, ay, { width: AW - 12 });
          ay += 14;

          addrLines.forEach(l => {
            if (!l) return;
            doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(l, ox + 6, ay, { width: AW - 12 });
            ay += 11;
          });
        };

        drawAddrBox(ML, 'Bill To');
        drawAddrBox(SX, 'Ship To');
        y += AH + 6;

        const HDR_H = 28;
        doc.rect(ML, y, CW, HDR_H).fill(BGH).stroke(BORD);
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor(DARK).text('CGST', ML + 300, y + 3, { width: 70, align: 'center' });
        doc.text('SGST', ML + 370, y + 3, { width: 70, align: 'center' });
        doc.moveTo(ML + 300, y + 13).lineTo(ML + 440, y + 13).stroke(BORD);

        const HL = y + 15;
        doc.fontSize(6).font('Helvetica-Bold').fillColor(DARK);
        doc.text('#', ML, HL, { width: 22, align: 'center' });
        doc.text('Item & Description', ML + 22, HL, { width: 143, align: 'left' });
        doc.text('HSN/SAC', ML + 165, HL, { width: 42, align: 'center' });
        doc.text('Qty', ML + 207, HL, { width: 28, align: 'center' });
        doc.text('Rate', ML + 235, HL, { width: 52, align: 'right' });
        doc.text('%', ML + 300, HL, { width: 25, align: 'center' });
        doc.text('Amt', ML + 325, HL, { width: 45, align: 'right' });
        doc.text('%', ML + 370, HL, { width: 25, align: 'center' });
        doc.text('Amt', ML + 395, HL, { width: 45, align: 'right' });
        doc.text('Amount', ML + 440, HL, { width: 90, align: 'right' });

        y += HDR_H;

        const tableRows = items.length ? items : [{ description: 'CRM Development Services', quantity: 1, rate: subtotal, amount: subtotal, hsn: '998313' }];
        tableRows.forEach((item, idx) => {
          const ra = Number(item.amount || 0);
          const rq = Number(item.quantity || 1);
          const rr = ra / rq;
          const rc = (ra * halfRate) / 100;
          const RH = 22;

          doc.rect(ML, y, CW, RH).stroke(BORD);
          const cy = y + 7;
          doc.fillColor(DARK).fontSize(7).font('Helvetica');
          doc.text(String(idx + 1), ML, cy, { width: 22, align: 'center' });
          doc.text(item.description || 'Service', ML + 25, cy, { width: 140 });
          doc.text(item.hsn || '998313', ML + 165, cy, { width: 42, align: 'center' });
          doc.text(String(rq), ML + 207, cy, { width: 28, align: 'center' });
          doc.text(fmtN(rr), ML + 235, cy, { width: 52, align: 'right' });
          doc.text('9%', ML + 300, cy, { width: 25, align: 'center' });
          doc.text(fmtN(rc), ML + 325, cy, { width: 45, align: 'right' });
          doc.text('9%', ML + 370, cy, { width: 25, align: 'center' });
          doc.text(fmtN(rc), ML + 395, cy, { width: 45, align: 'right' });
          doc.font('Helvetica-Bold').text(fmtN(ra), ML + 440, cy, { width: 90, align: 'right' });
          y += RH;
        });

        y += 8;
        const TW = 205, TX = ML + CW - TW, LW = 120, VX = TX + LW, VW = TW - LW - 4;
        const totRow = (lbl, val, bold = false, bg = null) => {
          if (bg) doc.rect(TX, y, TW, 18).fill(bg);
          doc.rect(TX, y, TW, 18).stroke(BORD);
          doc.moveTo(VX, y).lineTo(VX, y + 18).stroke(BORD);
          const sz = bold ? 8.5 : 8, fn = bold ? 'Helvetica-Bold' : 'Helvetica';
          doc.fontSize(sz).font(fn).fillColor(DARK).text(lbl, TX + 3, y + 4, { width: LW - 3 });
          doc.fontSize(sz).font(fn).fillColor(DARK).text(val, VX + 2, y + 4, { width: VW, align: 'right' });
          y += 18;
        };

        totRow('Sub Total', fmtN(subtotal));
        totRow('CGST9 (9.0%)', fmtN(cgstAmt));
        totRow('SGST9 (9.0%)', fmtN(sgstAmt));
        totRow('Total', `Rs. ${fmtN(totalAmt)}`, true, BGTOT);
        totRow('Balance Due', `Rs. ${fmtN(totalAmt)}`, true, BGBAL);

        y += 10;
        const LCW = CW * 0.62;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK).text('Total In Words', ML, y);
        y += 12;
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(DARK).text(amountInWords(totalAmt), ML, y, { width: LCW });
        y += 16;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK).text('Notes', ML, y);
        y += 11;
        ['Thanks for your business.', 'VASIFY TECHNOLOGIES PRIVATE LIMITED', 'www.vasifytech.com  |  UIN : U62011MH2024PTC421417'].forEach(l => {
          doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(l, ML, y, { width: LCW });
          y += 10;
        });
        y += 14;

        doc.moveTo(ML, y).lineTo(ML + CW, y).stroke(BORD);
        y += 7;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK).text('Terms & Conditions', ML, y);
        y += 12;
        ['1. Payment due within 5 to 7 days of the invoice date.', '2. Invoice disputes must be communicated within 15 days of the invoice date.'].forEach(t => {
          doc.fontSize(7).font('Helvetica').fillColor(GRAY).text(t, ML, y, { width: LCW });
          y += 10;
        });
        y += 8;

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK).text('Payment details :', ML, y);
        y += 12;
        const paymentLines = [
          'Vasify Technologies Pvt. Ltd.',
          'UPI ID : vasifytechnologiesprivateli2529@aubank',
          'Ac number 2502267573096282',
          'Customer ID 39818327',
          'IFSC code AUBL0002675',
          'Au bank swift code :-AUBLINBBXXX',
          'BRANCH NAME KANDIVALI MAHAVIR NAGAR'
        ];
        const payStartY = y;
        paymentLines.forEach(l => {
          doc.fontSize(7).font('Helvetica').fillColor(GRAY).text(l, ML, y, { width: LCW });
          y += 10;
        });

        const QR_ZONE_X = ML + LCW + 12;
        const QR_ZONE_W = CW - LCW - 12;
        const QR_SIZE = Math.min(110, QR_ZONE_W - 10);
        const QR_X = QR_ZONE_X + (QR_ZONE_W - QR_SIZE) / 2;
        const QR_Y = payStartY - 8;

        const qrPath = path.join(__dirname, '../assets/vasify_Payment_scanner.jpeg');
        try {
          doc.rect(QR_X - 3, QR_Y - 3, QR_SIZE + 6, QR_SIZE + 6).stroke(BORD);
          doc.image(qrPath, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
          doc.fontSize(7).font('Helvetica').fillColor(LGRAY).text('Scan to Pay', QR_X - 3, QR_Y + QR_SIZE + 5, { width: QR_SIZE + 6, align: 'center' });
        } catch (e) {}

        const FY = PH - 36;
        doc.moveTo(ML, FY - 4).lineTo(ML + CW, FY - 4).stroke(BORD);
        doc.fontSize(7).font('Helvetica').fillColor(LGRAY).text('This electronically generated invoice does not necessitate a signature.', ML + CW * 0.5, FY, { width: CW * 0.5, align: 'right' });
        doc.fontSize(7).font('Helvetica').fillColor(LGRAY).text(`Generated on ${new Date().toLocaleDateString('en-IN')} | Vasify Technologies Pvt. Ltd.`, ML, FY + 12, { align: 'center', width: CW });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    console.log('PDF Generated Size:', pdfBuffer.length, 'bytes');

    const AOC_API_URL = process.env.WHATSAPP_API_URL || 'https://api.aoc-portal.com/v1/whatsapp';
    const apiKey = process.env.WHATSAPP_API_TOKEN || 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
    const fromNumber = process.env.WHATSAPP_PHONE_NUMBER_ID || '+919769026133';

    const totalAmount = Number(inv.total || inv.amount || 0);
    const formattedTotal = '₹' + totalAmount.toFixed(2);
    const issueDateFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const messageText = `Hello ${customerName} 👋

Thank you for choosing Vasify Technologies.

Your invoice has been generated and is ready for your reference.

📌 Invoice Number: ${invoiceNumber}
${orderNumber ? `📦 Order Number: ${orderNumber}\n` : ''}📅 Invoice Date: ${issueDateFormatted}
💰 Total Amount: ${formattedTotal}

Please find the invoice attached to this message. Kindly review it, and feel free to reach out if you have any questions or notice any discrepancy.

Thank you for your continued trust in us.

Vasify Technologies Support Team`;

    console.log('\n--- 2. Sending Text Message to:', targetPhone, '---');
    const txtRes = await fetchWithRetry(AOC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({
        recipient_type: 'individual',
        from: fromNumber,
        to: targetPhone,
        type: 'text',
        text: { body: messageText }
      })
    });
    console.log('Text Message Status:', txtRes.status);
    console.log('Text Response:', await txtRes.text());

    console.log('\n--- 3. Uploading PDF to Public Direct URL ---');
    const publicPdfUrl = await uploadPdfToPublicUrl(pdfBuffer, pdfFilename);
    const mediaUrl = publicPdfUrl || `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    console.log('\n--- 4. Sending PDF Attachment to:', targetPhone, '---');
    const docRes = await fetchWithRetry(AOC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({
        recipient_type: 'individual',
        from: fromNumber,
        to: targetPhone,
        type: 'document',
        document: {
          link: mediaUrl,
          filename: pdfFilename,
          caption: `Hi ${customerName}, please find attached your Invoice PDF.`
        }
      })
    });
    console.log('PDF Document Status:', docRes.status);
    console.log('PDF Response:', await docRes.text());

    await pool.end();
  } catch (error) {
    console.error('Error executing script:', error);
  }
}

testSendWhatsApp();
