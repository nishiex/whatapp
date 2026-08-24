// One-off send verification after the AOC_FROM_NUMBER fix.
// Generates a minimal PDF -> uploads via the REAL config/fileUploader (catbox,
// with the required User-Agent) -> sends text + document via AOC to the
// established test number. Prints both AOC responses verbatim.
// No DB (fileUploader is a pure fetch module; no app DB pool is opened).

const PDFDocument = require("pdfkit");
const { uploadFileToPublicUrl } = require("../config/fileUploader");

const AOC_URL = "https://api.aoc-portal.com/v1/whatsapp";
const apiKey = "kliu2IuLezqOxzzIuOXipDYaFnxubQ"; // dev WHATSAPP_API_TOKEN (same key the working harness uses)
const from = "919769026133"; // AOC_FROM_NUMBER, "+" stripped — the fix
const to = "918551890493"; // established test recipient from all scratch probes

const customerName = "WhatsApp Client";
const invoiceNumber = "INV-VERIFY-01";
const issueDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
const formattedTotal = "₹1180.00";
const pdfFilename = `invoice-${invoiceNumber}.pdf`;

const messageText = `Hello ${customerName} 👋

Thank you for choosing Vasify Technologies.

Your invoice has been generated and is ready for your reference.

📌 Invoice Number: ${invoiceNumber}
📅 Invoice Date: ${issueDate}
💰 Total Amount: ${formattedTotal}

Please find the invoice attached to this message. Kindly review it, and feel free to reach out if you have any questions or notice any discrepancy.

Thank you for your continued trust in us.

Vasify Technologies Support Team`;

function makePdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(18).text("Vasify Technologies — Invoice (send test)", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`Invoice Number: ${invoiceNumber}`);
    doc.text(`Invoice Date: ${issueDate}`);
    doc.text(`Total Amount: ${formattedTotal}`);
    doc.moveDown();
    doc.text("Verification send after the AOC sender-number fix.");
    doc.end();
  });
}

async function postAoc(payload) {
  const res = await fetch(AOC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.text() };
}

(async () => {
  console.log(`Sender (from): ${from}  |  Recipient (to): ${to}`);

  console.log("\n[1/3] Generating PDF...");
  const pdf = await makePdf();
  console.log(`  PDF size: ${pdf.length} bytes`);

  console.log("\n[2/3] Uploading via config/fileUploader (catbox)...");
  const { url: mediaUrl } = await uploadFileToPublicUrl(pdf, pdfFilename, "application/pdf");
  console.log(`  Public URL: ${mediaUrl}`);

  console.log("\n[3/3] Sending via AOC...");
  const textRes = await postAoc({ recipient_type: "individual", from, to, type: "text", text: { body: messageText } });
  console.log(`  TEXT     -> status ${textRes.status} | ${textRes.body}`);

  const docRes = await postAoc({
    recipient_type: "individual",
    from,
    to,
    type: "document",
    document: { link: mediaUrl, filename: pdfFilename, caption: `Hi ${customerName}, please find attached your Invoice PDF.` },
  });
  console.log(`  DOCUMENT -> status ${docRes.status} | ${docRes.body}`);

  console.log("\nDone.");
})().catch((e) => {
  console.error("FAILED:", e.message || e);
});
