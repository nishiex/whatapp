const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../assets/vasify_logo.png');

async function testPdfGeneration() {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const buffers = [];
  doc.on('data', c => buffers.push(c));
  
  const DARK = "#1A1A1A", GRAY = "#555555";
  const PW = 595.28, ML = 30, MR = 30, CW = PW - ML - MR;
  let y = 30;

  // Render logo with fit: [110, 55]
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, ML, y, { fit: [110, 55] });
  }

  // CX starts AFTER the logo (ML + 120 = 150)
  const CX = ML + 120;
  doc.fontSize(11).font("Helvetica-Bold").fillColor(DARK)
     .text("Vasify Technologies Pvt. Ltd.", CX, y, { width: CW - 120 });
  y += 14;
  doc.fontSize(7.5).font("Helvetica").fillColor(GRAY)
     .text("Axiom Milan CHS, 607, 22 Datta Mandir road\nDhanakurwadi, Kandivali West.\nMumbai Maharashtra 400067\nIndia",
       CX, y, { width: CW - 120, lineGap: 1 });
  y += 42;
  ["Company ID : U62011MH2024PTC421417","GSTIN: 27AAKCV0353N1ZW","PAN: AAKCV0353N",
   "Tax ID ::MUMV33878F","www.vasifytech.com"].forEach(l => {
    doc.fontSize(7.5).font("Helvetica").fillColor(GRAY).text(l, CX, y, { width: CW - 120 });
    y += 10;
  });

  doc.fontSize(26).font("Helvetica-Bold").fillColor(DARK)
     .text("INVOICE", PW - MR - 180, 30, { align: "right", width: 180 });

  doc.end();

  const pdfBuffer = await new Promise(res => doc.on('end', () => res(Buffer.concat(buffers))));
  
  // Upload to catbox to verify visually
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', new Blob([pdfBuffer], { type: 'application/pdf' }), 'test_logo_fix.pdf');
  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData });
  const url = (await res.text()).trim();
  console.log('PDF rendered & uploaded to:', url);
}

testPdfGeneration();
