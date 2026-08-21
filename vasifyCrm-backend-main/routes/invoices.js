
const { v4: uuidv4 }             = require("uuid");
const PDFDocument                = require("pdfkit");
const express                    = require("express");
const { body, validationResult } = require("express-validator");
const { pool }                   = require("../config/database");
const { authenticateToken }      = require("../middleware/auth");

const router = express.Router();

// â”€â”€â”€ UTILS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ SEND INVOICE ON WHATSAPP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


const AOC_API_KEY = process.env.AOC_API_KEY;

const AOC_WHATSAPP_URL =
  "https://api.aoc-portal.com/v1/whatsapp";

const AOC_FROM_NUMBER =
  process.env.AOC_FROM_NUMBER || "+919769026133";

const WHATSAPP_TEMPLATE_NAME =
  "invoice_ready_notification";

router.post("/:id/send-whatsapp", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const access = await canAccessInvoice(req, res, id);
    if (!access.ok) return;

    const [invRows] = await pool.execute(
      INV_SELECT + " WHERE i.id = ?",
      sanitize(id)
    );

    if (!invRows.length) {
      return res.status(404).json({
        error: true,
        message: "Invoice not found",
      });
    }

    const inv = invRows[0];

    // Customer WhatsApp number retrieval & cleaning
    const rawPhone =
      inv.customer_phone_override ||
      inv.customer_phone ||
      inv.whatsapp_number ||
      "";

    let recipient = String(rawPhone).replace(/\D/g, "");
    if (recipient.length === 10) {
      recipient = `91${recipient}`;
    }

    if (!recipient || recipient.length < 10 || recipient.endsWith("1234567890") || recipient.endsWith("0000000000")) {
      return res.status(400).json({
        error: true,
        message: `Invalid customer phone number (${rawPhone || "empty"}). Please update the customer phone number with a valid WhatsApp mobile number.`,
      });
    }

    // Fetch items & build PDF buffer
    const [items] = await pool.execute(
      "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at",
      sanitize(id)
    );

    const pdfBuffer = await generateInvoicePdfBuffer(inv, items, req.body?.logoBase64);

    const customerName = inv.customer_name_override || inv.customer_name || "Valued Client";
    const invoiceNumber = inv.invoice_number || inv.id || "N/A";
    const orderNumber = inv.po_number || null;
    const pdfOrderOrInvNumber = orderNumber || invoiceNumber;
    const pdfFilename = `invoice-${pdfOrderOrInvNumber}.pdf`;
    const totalAmount = Number(inv.total || inv.amount || 0);

    const formattedTotal = `â‚¹${totalAmount.toFixed(2)}`;

    const issueDateFormatted = inv.issue_date || inv.created_at
      ? new Date(inv.issue_date || inv.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    const messageText = `Hello ${customerName} ðŸ‘‹

Thank you for choosing Vasify Technologies.

Your invoice has been generated and is ready for your reference.

ðŸ“Œ Invoice Number: ${invoiceNumber}
${orderNumber ? `ðŸ“¦ Order Number: ${orderNumber}\n` : ""}ðŸ“… Invoice Date: ${issueDateFormatted}
ðŸ’° Total Amount: ${formattedTotal}

Please find the invoice attached to this message. Kindly review it, and feel free to reach out if you have any questions or notice any discrepancy.

Thank you for your continued trust in us.

Vasify Technologies Support Team`;

    // Upload PDF buffer to a public HTTPS URL so Meta/WhatsApp Cloud API can download and deliver the file
    let mediaUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    try {
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", new Blob([pdfBuffer], { type: "application/pdf" }), pdfFilename);
      const uploadRes = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: formData });
      const pubUrl = (await uploadRes.text()).trim();
      if (pubUrl.startsWith("http")) {
        mediaUrl = pubUrl;
        console.log(`[WhatsApp Document] Uploaded PDF to public URL: ${pubUrl}`);
      }
    } catch (upErr) {
      console.warn("[WhatsApp Document] Public upload warning:", upErr.message);
    }

    const apiKey = process.env.AOC_API_KEY || process.env.WHATSAPP_API_TOKEN || "kliu2IuLezqOxzzIuOXipDYaFnxubQ";
    const fromNumber = (process.env.AOC_FROM_NUMBER || process.env.WHATSAPP_PHONE_NUMBER_ID || "919769026133").replace(/\+/g, "");

    // 1. Send Text Message
    const textPayload = {
      recipient_type: "individual",
      from: fromNumber,
      to: recipient,
      type: "text",
      text: { body: messageText },
    };

    try {
      await fetch(AOC_WHATSAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify(textPayload),
      });
    } catch (txtErr) {
      console.warn("[WhatsApp Text] Message send warning:", txtErr.message);
    }

    // 2. Send Invoice PDF Document Attachment
    const docPayload = {
      recipient_type: "individual",
      from: fromNumber,
      to: recipient,
      type: "document",
      document: {
        link: mediaUrl,
        filename: pdfFilename,
        caption: `Hi ${customerName}, please find attached your Invoice PDF.`,
      },
    };

    const response = await fetch(AOC_WHATSAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify(docPayload),
    });

    const responseText = await response.text();
    console.log("AOC WhatsApp document status:", response.status, responseText);

    let parsedRes = {};
    try { parsedRes = JSON.parse(responseText); } catch (e) { parsedRes = { raw: responseText }; }

    if (response.ok && (parsedRes.status === "success" || parsedRes.message === "Message Sent Successfully!" || parsedRes.id)) {
      try {
      await pool.execute(
        `UPDATE invoices SET whatsapp_sent = 1, whatsapp_sent_at = NOW(), whatsapp_status = 'delivered' WHERE id = ?`,
        sanitize(id)
      );
      } catch (updateErr) {
        console.warn("Could not update invoice whatsapp columns:", updateErr.message);
      }
      return res.status(200).json({
        error: false,
        message: "Invoice and PDF sent successfully via WhatsApp",
        data: parsedRes,
      });
    }

    return res.status(response.status || 500).json({
      error: true,
      message: "AOC WhatsApp API failed",
      details: responseText,
    });

  } catch (error) {
    console.error("Send invoice WhatsApp error:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to send WhatsApp message",
      details: error.message,
    });
  }
});

const sanitize = (...params) => params.map((p) => (p === undefined ? null : p));

const toSqlDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: "Validation failed", details: errors.array() });
    return true;
  }
  return false;
};

// â”€â”€ Generate invoice number: INV-YYYYMM-XXXX
// If the frontend sends its own number AND it's not a duplicate, honour it.
const generateInvNumber = async (conn) => {
  const now    = new Date();
  const ym     = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${ym}-`;
  const [rows] = await conn.execute(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const seq = rows.length
    ? (parseInt(rows[0].invoice_number.split("-").pop(), 10) || 0) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
};

// camelCase â†’ snake_case map for UPDATE (only fields that exist after migration)
const FIELD_MAP = {
  customerId:              "customer_id",
  amount:                  "amount",
  tax:                     "tax",
  gstAmount:               "gst_amount",
  total:                   "total",
  status:                  "status",
  issueDate:               "issue_date",
  dueDate:                 "due_date",
  paidDate:                "paid_date",
  notes:                   "notes",
  poNumber:                "po_number",
  terms:                   "terms",
  placeOfSupply:           "place_of_supply",
  customerName:            "customer_name_override",
  customerEmail:           "customer_email_override",
  customerPhone:           "customer_phone_override",
  customerCompany:         "customer_company_override",
  customerAddress:         "customer_address_override",
  isRecurring:             "is_recurring",
  recurringFrequency:      "recurring_frequency",
  recurringCycles:         "recurring_cycles",
  recurringStartDate:      "recurring_start_date",
  recurringEndDate:        "recurring_end_date",
};

// â”€â”€â”€ ACCESS CONTROL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const canAccessInvoice = async (req, res, invoiceId) => {
  if (req.user.role === "admin") return { ok: true };
  const [rows] = await pool.execute(
    `SELECT i.id FROM invoices i
     INNER JOIN customers c ON i.customer_id = c.id
     WHERE i.id = ? AND c.assigned_to = ?`,
    sanitize(invoiceId, req.user.id)
  );
  if (!rows.length)
    return { ok: false, response: res.status(403).json({ error: "Access denied" }) };
  return { ok: true };
};

// â”€â”€â”€ AMOUNT IN WORDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ SELECT HELPER â€” always use COALESCE override â†’ live customer data â”€â”€â”€â”€â”€â”€â”€â”€â”€

const INV_SELECT = `
  SELECT
    i.*,
    COALESCE(i.customer_name_override,    c.name)    AS customer_name,
    COALESCE(i.customer_company_override, c.company) AS customer_company,
    COALESCE(i.customer_email_override,   c.email)   AS customer_email,
    COALESCE(i.customer_phone_override,   c.phone)   AS customer_phone,
    COALESCE(
      NULLIF(i.customer_address_override, ''),
      -- Build address from parts; skip country if it already appears in address
      CONCAT_WS(', ',
        NULLIF(c.address,''),
        NULLIF(c.city,''),
        NULLIF(c.state,''),
        NULLIF(c.zip_code,''),
        -- Only append country if not already in address field
        CASE WHEN c.address IS NOT NULL AND LOWER(c.address) LIKE CONCAT('%', LOWER(IFNULL(c.country,'')), '%')
             THEN NULL ELSE NULLIF(c.country,'') END
      ))                                              AS customer_address
  FROM invoices i
  LEFT JOIN customers c ON i.customer_id = c.id
`;

// â”€â”€â”€ PDF BUFFER GENERATION HELPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generateInvoicePdfBuffer(inv, items, logoB64 = null) {
  return new Promise((resolve, reject) => {
    try {
      let subtotal;
      if (items && items.length > 0) {
        subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
      } else {
        subtotal = Number(inv.amount || 0);
      }

      const gstRate = Number(inv.tax || 18);
      const halfRate = gstRate / 2;
      const cgstAmt = (subtotal * halfRate) / 100;
      const sgstAmt = cgstAmt;
      const totalAmt = subtotal + cgstAmt + sgstAmt;
      const invStatus = String(inv.status || "").trim().toLowerCase();
      const balDue = invStatus === "paid" ? 0 : totalAmt;

      const termsLabel = {
        net_7: "Net 7", net_15: "Net 15", net_30: "Net 30",
        net_45: "Net 45", net_60: "Net 60",
      }[inv.terms] || "Due on Receipt";

      const fmtD = (v) => {
        if (!v) return "â€”";
        const d = new Date(v);
        return isNaN(d.getTime()) ? "â€”"
          : d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
      };
      const fmtN = (n) => Number(n || 0).toFixed(2);

      const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const DARK = "#1A1A1A", GRAY = "#555555", LGRAY = "#888888";
      const BORD = "#CCCCCC", BGH = "#F5F5F5", BGALT = "#FAFAFA";
      const BGTOT = "#EEEEEE", BGBAL = "#E8F5E9";

      const PW = 595.28, PH = 841.89, ML = 30, MR = 30, CW = PW - ML - MR;
      let y = 30;

      const defaultLogoPath = require("path").join(__dirname, "../assets/vasify_logo.png");
      if (logoB64) {
        try {
          const raw = logoB64.includes(",") ? logoB64.split(",")[1] : logoB64;
          doc.image(Buffer.from(raw, "base64"), ML, y, { fit: [110, 55] });
        } catch (e) { console.warn("Logo render:", e.message); }
      } else if (require("fs").existsSync(defaultLogoPath)) {
        try {
          doc.image(defaultLogoPath, ML, y, { fit: [110, 55] });
        } catch (e) { console.warn("Default logo render:", e.message); }
      }

      const CX = ML + 120;
      doc.fontSize(11).font("Helvetica-Bold").fillColor(DARK)
        .text("Vasify Technologies Pvt. Ltd.", CX, y, { width: CW - 120 });
      y += 14;
      doc.fontSize(7.5).font("Helvetica").fillColor(GRAY)
        .text("Axiom Milan CHS, 607, 22 Datta Mandir road\nDhanakurwadi, Kandivali West.\nMumbai Maharashtra 400067\nIndia",
          CX, y, { width: CW - 120, lineGap: 1 });
      y += 42;
      ["Company ID : U62011MH2024PTC421417", "GSTIN: 27AAKCV0353N1ZW", "PAN: AAKCV0353N",
        "Tax ID ::MUMV33878F", "www.vasifytech.com"].forEach(l => {
          doc.fontSize(7.5).font("Helvetica").fillColor(GRAY).text(l, CX, y, { width: CW - 120 });
          y += 10;
        });

      doc.fontSize(26).font("Helvetica-Bold").fillColor(DARK)
        .text("INVOICE", PW - MR - 180, 30, { align: "right", width: 180 });

      y = Math.max(y, 122) + 4;

      const MBH = 68, HW = CW / 2;
      doc.rect(ML, y, CW, MBH).stroke(BORD);
      doc.moveTo(ML + HW, y).lineTo(ML + HW, y + MBH).stroke(BORD);
      doc.moveTo(ML, y + 14).lineTo(ML + CW, y + 14).stroke(BORD);

      const LR = [
        ["#", inv.invoice_number || "â€”"],
        ["Invoice Date", fmtD(inv.issue_date || inv.created_at)],
        ["Terms", termsLabel],
        ["Due Date", fmtD(inv.due_date)],
        ["P.O.#", inv.po_number || "â€”"],
      ];
      LR.forEach(([lbl, val], i) => {
        const ry = y + 16 + i * 10;
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(GRAY).text(`${lbl} :`, ML + 4, ry, { width: HW * 0.42 });
        doc.fontSize(6.5).font("Helvetica").fillColor(DARK).text(val, ML + HW * 0.44, ry, { width: HW * 0.54, lineBreak: false });
      });

      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(GRAY)
        .text("Place Of Supply", ML + HW + 4, y + 4, { width: 70 });
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(DARK)
        .text(`: ${inv.place_of_supply || "Maharashtra (27)"}`, ML + HW + 76, y + 4, { width: HW - 80 });

      const RR = [
        ["Payment Status", String(inv.status || "unpaid").toUpperCase()],
        ["Tax Rate", `${gstRate}%`],
      ];
      RR.forEach(([lbl, val], i) => {
        const ry = y + 16 + i * 11;
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(GRAY).text(`${lbl} :`, ML + HW + 4, ry, { width: 70 });
        doc.fontSize(6.5).font("Helvetica").fillColor(DARK).text(val, ML + HW + 76, ry, { width: HW - 80, lineBreak: false });
      });

      y += MBH + 6;

      const AW = HW - 3, SX = ML + HW + 3;

      const addrLines = [
        inv.customer_company ? inv.customer_company : null,
        inv.customer_address ? inv.customer_address : null,
        inv.customer_email ? `Email: ${inv.customer_email}` : null,
        inv.customer_phone ? `Phone: ${inv.customer_phone}` : null,
      ].filter(Boolean);

      const AH = Math.max(90, 20 + addrLines.length * 13 + 10);

      const drawAddrBox = (ox, title) => {
        doc.rect(ox, y, AW, AH).stroke(BORD);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(GRAY)
          .text(title, ox + 6, y + 5, { width: AW - 12, lineBreak: false });
        doc.moveTo(ox, y + 14).lineTo(ox + AW, y + 14).stroke(BORD);

        let ay = y + 18;
        doc.fontSize(9.5).font("Helvetica-Bold").fillColor(DARK)
          .text(inv.customer_name || "â€”", ox + 6, ay, { width: AW - 12, lineBreak: false });
        ay += 14;

        addrLines.forEach(l => {
          if (!l) return;
          doc.fontSize(7.5).font("Helvetica").fillColor(GRAY)
            .text(l, ox + 6, ay, { width: AW - 12, lineBreak: false });
          ay += 11;
        });
      };
      drawAddrBox(ML, "Bill To");
      drawAddrBox(SX, "Ship To");
      y += AH + 6;

      const subject = inv.po_number || null;
      if (subject) {
        doc.rect(ML, y, CW, 22).stroke(BORD);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(GRAY).text("Subject :", ML + 6, y + 7);
        doc.fontSize(7.5).font("Helvetica").fillColor(DARK)
          .text(subject, ML + 58, y + 7, { width: CW - 64, lineBreak: false });
        y += 28;
      }

      const CWS = { sr: 22, desc: 143, hsn: 42, qty: 28, rate: 55, cp: 25, ca: 45, sp: 25, sa: 45, amt: 0 };
      CWS.amt = CW - CWS.sr - CWS.desc - CWS.hsn - CWS.qty - CWS.rate - CWS.cp - CWS.ca - CWS.sp - CWS.sa;

      const CXS = {};
      let ax = ML;
      for (const [k, w] of Object.entries(CWS)) { CXS[k] = ax; ax += w; }

      const vLines = (fy, ty) =>
        Object.values(CXS).slice(1).forEach(x => doc.moveTo(x, fy).lineTo(x, ty).stroke(BORD));

      const HDR_H = 28;
      doc.rect(ML, y, CW, HDR_H).fill(BGH).stroke(BORD);
      vLines(y, y + HDR_H);

      const cgstSpan = CWS.cp + CWS.ca, sgstSpan = CWS.sp + CWS.sa;
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(DARK)
        .text("CGST", CXS.cp, y + 3, { width: cgstSpan, align: "center" });
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(DARK)
        .text("SGST", CXS.sp, y + 3, { width: sgstSpan, align: "center" });
      doc.moveTo(CXS.cp, y + 13).lineTo(CXS.sp + sgstSpan, y + 13).stroke(BORD);

      const HL = y + 15;
      doc.fontSize(6).font("Helvetica-Bold").fillColor(DARK);
      doc.text("#", CXS.sr, HL, { width: CWS.sr, align: "center" });
      doc.text("Item & Description", CXS.desc, HL, { width: CWS.desc, align: "left" });
      doc.text("HSN\n/SAC", CXS.hsn, HL, { width: CWS.hsn, align: "center" });
      doc.text("Qty", CXS.qty, HL, { width: CWS.qty, align: "center" });
      doc.text("Rate", CXS.rate, HL, { width: CWS.rate - 3, align: "right" });
      doc.text("%", CXS.cp, HL, { width: CWS.cp, align: "center" });
      doc.text("Amt", CXS.ca, HL, { width: CWS.ca - 3, align: "right" });
      doc.text("%", CXS.sp, HL, { width: CWS.sp, align: "center" });
      doc.text("Amt", CXS.sa, HL, { width: CWS.sa - 3, align: "right" });
      doc.text("Amount", CXS.amt, HL, { width: CWS.amt - 3, align: "right" });

      y += HDR_H;

      const fmtRate = (r) => Number.isInteger(r) ? String(r) : r.toFixed(1).replace(/\.0$/, "");
      const rateLabel = fmtRate(halfRate);

      const tableRows = items && items.length
        ? items
        : [{ description: "Service Charges", quantity: 1, rate: subtotal, amount: subtotal, hsn: "" }];

      tableRows.forEach((item, idx) => {
        const ra = Number(item.amount || 0);
        const rq = Number(item.quantity || 1);
        const rawRate = Number(item.rate) || 0;
        const derivedRate = rq > 0 ? ra / rq : ra;
        const rateMatchesAmount = Math.abs(rawRate * rq - ra) < Math.max(ra * 0.01, 0.01);
        const rr = (rawRate > 0 && rateMatchesAmount) ? rawRate : derivedRate;
        const rc = (ra * halfRate) / 100;
        const RH = 22;

        if (idx % 2 === 1) doc.rect(ML, y, CW, RH).fill(BGALT);
        doc.rect(ML, y, CW, RH).stroke(BORD);
        vLines(y, y + RH);

        const cy = y + 7;
        doc.fillColor(DARK).fontSize(7).font("Helvetica");
        doc.text(String(idx + 1), CXS.sr, cy, { width: CWS.sr, align: "center" });
        doc.text(item.description || "Service", CXS.desc + 3, cy, { width: CWS.desc - 6 });
        doc.text(item.hsn || "998313", CXS.hsn, cy, { width: CWS.hsn, align: "center" });
        doc.text(String(rq), CXS.qty, cy, { width: CWS.qty, align: "center" });
        doc.text(fmtN(rr), CXS.rate, cy, { width: CWS.rate - 3, align: "right" });
        doc.text(`${rateLabel}%`, CXS.cp, cy, { width: CWS.cp, align: "center" });
        doc.text(fmtN(rc), CXS.ca, cy, { width: CWS.ca - 3, align: "right" });
        doc.text(`${rateLabel}%`, CXS.sp, cy, { width: CWS.sp, align: "center" });
        doc.text(fmtN(rc), CXS.sa, cy, { width: CWS.sa - 3, align: "right" });
        doc.font("Helvetica-Bold")
          .text(fmtN(ra), CXS.amt, cy, { width: CWS.amt - 3, align: "right" });

        y += RH;
      });

      y += 8;

      const TW = 205, TX = ML + CW - TW, LW = 120, VX = TX + LW, VW = TW - LW - 4;

      const totRow = (lbl, val, bold = false, bg = null) => {
        if (bg) doc.rect(TX, y, TW, 18).fill(bg);
        doc.rect(TX, y, TW, 18).stroke(BORD);
        doc.moveTo(VX, y).lineTo(VX, y + 18).stroke(BORD);
        const sz = bold ? 8.5 : 8, fn = bold ? "Helvetica-Bold" : "Helvetica";
        doc.fontSize(sz).font(fn).fillColor(DARK).text(lbl, TX + 3, y + 4, { width: LW - 3 });
        doc.fontSize(sz).font(fn).fillColor(DARK).text(val, VX + 2, y + 4, { width: VW, align: "right" });
        y += 18;
      };

      totRow("Sub Total", fmtN(subtotal));
      totRow(`CGST${rateLabel} (${rateLabel}%)`, fmtN(cgstAmt));
      totRow(`SGST${rateLabel} (${rateLabel}%)`, fmtN(sgstAmt));
      totRow("Total", `Rs. ${fmtN(totalAmt)}`, true, BGTOT);
      totRow("Balance Due", `Rs. ${fmtN(balDue)}`, true, BGBAL);

      y += 10;

      const LCW = CW * 0.62;
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK).text("Total In Words", ML, y);
      y += 12;
      doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(DARK)
        .text(amountInWords(totalAmt), ML, y, { width: LCW });
      y += 16;
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK).text("Notes", ML, y);
      y += 11;
      ["Thanks for your business.",
        "VASIFY TECHNOLOGIES PRIVATE LIMITED",
        "www.vasifytech.com  |  UIN : U62011MH2024PTC421417"].forEach(l => {
          doc.fontSize(7.5).font("Helvetica").fillColor(GRAY).text(l, ML, y, { width: LCW });
          y += 10;
        });
      y += 14;

      doc.moveTo(ML, y).lineTo(ML + CW, y).stroke(BORD);
      y += 7;
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK).text("Terms & Conditions", ML, y);
      y += 12;
      ["1. Payment due within 5 to 7  days of the invoice date.",
        "2. Invoice disputes must be communicated within 15 days of the invoice date.",
        "3. Contact us at sushil@vasifytech.com for any payment-related inquiries."].forEach(t => {
          doc.fontSize(7).font("Helvetica").fillColor(GRAY).text(t, ML, y, { width: LCW });
          y += 10;
        });
      y += 8;

      doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK).text("Payment details :", ML, y);
      y += 12;

      const paymentLines = [
        "Vasify Technologies Pvt. Ltd.",
        "UPI ID : vasifytechnologiesprivateli2529@aubank",
        "Ac number 2502267573096282",
        "Customer ID 39818327",
        "IFSC code AUBL0002675",
        "Au bank swift code :-AUBLINBBXXX",
        "BRANCH NAME KANDIVALI MAHAVIR NAGAR",
      ];

      const payStartY = y;

      paymentLines.forEach(l => {
        doc.fontSize(7).font("Helvetica").fillColor(GRAY).text(l, ML, y, { width: LCW });
        y += 10;
      });

      const QR_ZONE_X = ML + LCW + 12;
      const QR_ZONE_W = CW - LCW - 12;
      const QR_SIZE = Math.min(110, QR_ZONE_W - 10);

      const QR_X = QR_ZONE_X + (QR_ZONE_W - QR_SIZE) / 2;
      const QR_Y = payStartY - 8;

      const qrPath = require("path").join(__dirname, "../assets/vasify_Payment_scanner.jpeg");
      try {
        doc.rect(QR_X - 3, QR_Y - 3, QR_SIZE + 6, QR_SIZE + 6).stroke(BORD);
        doc.image(qrPath, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
        doc.fontSize(7).font("Helvetica").fillColor(LGRAY)
          .text("Scan to Pay", QR_X - 3, QR_Y + QR_SIZE + 5,
            { width: QR_SIZE + 6, align: "center" });
      } catch (e) {
        console.warn("QR code image not found:", e.message);
      }

      const FY = PH - 36;
      doc.moveTo(ML, FY - 4).lineTo(ML + CW, FY - 4).stroke(BORD);
      doc.fontSize(7).font("Helvetica").fillColor(LGRAY)
        .text("This electronically generated invoice does not necessitate a signature.",
          ML + CW * 0.5, FY, { width: CW * 0.5, align: "right" });
      doc.fontSize(7).font("Helvetica").fillColor(LGRAY)
        .text(`Generated on ${new Date().toLocaleDateString("en-IN")} | Vasify Technologies Pvt. Ltd.`,
          ML, FY + 12, { align: "center", width: CW });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// â”€â”€â”€ PDF GENERATION ROUTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Exactly matches Vasify Technologies sample invoice (INV-000076):
// Logo | Company header | TAX INVOICE title
// Meta box | Bill To / Ship To | Subject
// Items table (HSN/SAC, Qty, Rate, CGST%, CGST Amt, SGST%, SGST Amt, Amount)
// Totals | Amount in words | Notes | T&C | Payment details | Footer

router.post("/:id/download", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const access = await canAccessInvoice(req, res, id);
    if (!access.ok) return;

    const [invRows] = await pool.execute(
      INV_SELECT + " WHERE i.id = ?",
      sanitize(id)
    );
    if (!invRows.length) return res.status(404).json({ error: "Invoice not found" });

    const [items] = await pool.execute(
      "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at",
      sanitize(id)
    );

    const inv = invRows[0];
    const pdfBuffer = await generateInvoicePdfBuffer(inv, items, req.body?.logoBase64);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${inv.invoice_number || "NA"}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// â”€â”€â”€ GET ALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get("/", authenticateToken, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { search, status, customerId, isRecurring, dueDateFrom, dueDateTo } = req.query;

    let where = "WHERE 1=1";
    const p   = [];

    if (req.user.role !== "admin") { where += " AND c.assigned_to = ?"; p.push(req.user.id); }
    if (search) {
      where += " AND (i.invoice_number LIKE ? OR COALESCE(i.customer_name_override,c.name) LIKE ?)";
      p.push(`%${search}%`, `%${search}%`);
    }
    if (status)       { where += " AND i.status = ?";       p.push(status); }
    if (customerId)   { where += " AND i.customer_id = ?";  p.push(customerId); }
    if (isRecurring !== undefined) {
      where += " AND i.is_recurring = ?";
      p.push(isRecurring === "true" ? 1 : 0);
    }
    if (dueDateFrom) { where += " AND i.due_date >= ?"; p.push(dueDateFrom); }
    if (dueDateTo)   { where += " AND i.due_date <= ?"; p.push(dueDateTo); }

    const [invoices] = await pool.execute(
      `${INV_SELECT} ${where} ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      sanitize(...p)
    );

    if (invoices.length) {
      const ids  = invoices.map(i => i.id);
      const ph   = ids.map(() => "?").join(",");
      const [all] = await pool.execute(
        `SELECT * FROM invoice_items WHERE invoice_id IN (${ph}) ORDER BY created_at`,
        sanitize(...ids)
      );
      invoices.forEach(inv => { inv.items = all.filter(it => it.invoice_id === inv.id); });
    }

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id ${where}`,
      sanitize(...p)
    );

    res.json({
      invoices,
      pagination: {
        page, limit, total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Invoices fetch:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// â”€â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get("/stats/overview", authenticateToken, async (req, res) => {
  try {
    let where = "WHERE 1=1";
    const p   = [];
    if (req.user.role !== "admin") { where += " AND c.assigned_to = ?"; p.push(req.user.id); }

    const [statusStats] = await pool.execute(
      `SELECT i.status, COUNT(*) AS count, COALESCE(SUM(i.total),0) AS total_amount
       FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id ${where} GROUP BY i.status`,
      sanitize(...p)
    );
    const [monthly] = await pool.execute(
      `SELECT DATE_FORMAT(i.created_at,'%Y-%m') AS month, COUNT(*) AS count, COALESCE(SUM(i.total),0) AS total_amount
       FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
       ${where} AND i.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month`,
      sanitize(...p)
    );
    const [[overdue]] = await pool.execute(
      `SELECT COUNT(*) AS count, COALESCE(SUM(i.total),0) AS total_amount
       FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
       ${where} AND i.status IN ('sent','overdue','pending') AND i.due_date < CURDATE()`,
      sanitize(...p)
    );
    const [[recurring]] = await pool.execute(
      `SELECT COUNT(*) AS count, COALESCE(SUM(i.total),0) AS total_amount
       FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
       ${where} AND i.is_recurring = 1`,
      sanitize(...p)
    );

    res.json({ statusBreakdown: statusStats, monthlyTrend: monthly, overdue, recurring });
  } catch (err) {
    console.error("Stats:", err);
    res.status(500).json({ error: "Failed to fetch invoice statistics" });
  }
});

// â”€â”€â”€ GET SINGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await canAccessInvoice(req, res, id);
    if (!access.ok) return;

    const [[inv]] = await pool.execute(INV_SELECT + " WHERE i.id = ?", sanitize(id));
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const [items] = await pool.execute(
      "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at", sanitize(id)
    );
    inv.items = items;
    res.json({ invoice: inv });
  } catch (err) {
    console.error("Get invoice:", err);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// â”€â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post(
  "/",
  authenticateToken,
  [
    body("customerId").notEmpty().withMessage("Customer ID is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const {
        customerId, items,
        isRecurring, recurringFrequency, recurringCycles,
        recurringStartDate, recurringEndDate,
        customerName, customerEmail, customerPhone, customerCompany, customerAddress,
        poNumber, terms, placeOfSupply,
      } = req.body;

      // Validate customer
      const [custs] = await conn.execute(
        `SELECT id, assigned_to, default_tax_rate, default_due_days, default_invoice_notes
         FROM customers WHERE id = ?`,
        sanitize(customerId)
      );
      if (!custs.length) {
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: "Customer not found" });
      }
      const cust = custs[0];
      if (req.user.role !== "admin" && cust.assigned_to !== req.user.id) {
        await conn.rollback(); conn.release();
        return res.status(403).json({ error: "No permission to invoice this customer" });
      }

      // Financials
      const subtotal  = req.body.amount !== undefined
        ? Number(req.body.amount)
        : items.reduce((s, i) => s + Number(i.amount || 0), 0);
      const taxRate   = req.body.tax !== undefined ? Number(req.body.tax) : Number(cust.default_tax_rate || 18);
      const gstAmt    = (subtotal * taxRate) / 100;
      const total     = req.body.total !== undefined ? Number(req.body.total) : subtotal + gstAmt;
      const status    = req.body.status || "draft";
      const issueDate = toSqlDate(req.body.issueDate || new Date());
      const dueDate   = toSqlDate(req.body.dueDate   || (() => {
        const d = new Date(); d.setDate(d.getDate() + Number(cust.default_due_days || 5)); return d;
      })());
      const notes = req.body.notes ?? cust.default_invoice_notes ?? null;

      // Invoice number: use supplied if valid & unique, else auto-generate
      let invNum = String(req.body.invoiceNumber || "").trim();
      if (invNum) {
        const [dup] = await conn.execute(
          "SELECT id FROM invoices WHERE invoice_number = ?", sanitize(invNum)
        );
        if (dup.length) invNum = await generateInvNumber(conn);
      } else {
        invNum = await generateInvNumber(conn);
      }

      const invoiceId = uuidv4();

      await conn.execute(
        `INSERT INTO invoices
           (id, customer_id, invoice_number, amount, tax, gst_amount, total, status,
            issue_date, due_date, notes,
            po_number, terms, place_of_supply,
            customer_name_override, customer_email_override,
            customer_phone_override, customer_company_override, customer_address_override,
            is_recurring, recurring_frequency, recurring_cycles,
            recurring_start_date, recurring_end_date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        sanitize(
          invoiceId, customerId, invNum, subtotal, taxRate, gstAmt, total, status,
          issueDate, dueDate, notes,
          poNumber        || null,
          terms           || "due_on_receipt",
          placeOfSupply   || "Maharashtra (27)",
          customerName    || null,
          customerEmail   || null,
          customerPhone   || null,
          customerCompany || null,
          customerAddress || null,
          isRecurring ? 1 : 0,
          recurringFrequency  || null,
          recurringCycles     ? Number(recurringCycles) : null,
          recurringStartDate  ? toSqlDate(recurringStartDate) : null,
          recurringEndDate    ? toSqlDate(recurringEndDate)   : null
        )
      );

      for (const item of items) {
        await conn.execute(
          `INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount, hsn, breakdown)
           VALUES (?,?,?,?,?,?,?,?)`,
          sanitize(
            uuidv4(), invoiceId,
            item.description, item.quantity || 1, item.rate || 0, item.amount || 0,
            item.hsn || "998313",
            item.breakdown ? JSON.stringify(item.breakdown) : null
          )
        );
      }

      await conn.commit();

      const [[created]] = await conn.execute(INV_SELECT + " WHERE i.id = ?", sanitize(invoiceId));
      const [createdItems] = await conn.execute(
        "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at", sanitize(invoiceId)
      );
      created.items = createdItems;

      res.status(201).json({ message: "Invoice created successfully", invoice: created });
    } catch (err) {
      await conn.rollback();
      console.error("Create invoice:", err);
      res.status(500).json({ error: "Failed to create invoice", details: err.message });
    } finally {
      conn.release();
    }
  }
);

// â”€â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Existence check first (gives 404 not 403 for missing rows)
  const [ex] = await pool.execute("SELECT id FROM invoices WHERE id = ?", sanitize(id));
  if (!ex.length) return res.status(404).json({ error: "Invoice not found" });

  const access = await canAccessInvoice(req, res, id);
  if (!access.ok) return;

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const data = { ...req.body };

    // Auto-set paidDate when marking paid
    if (data.status === "paid" && !data.paidDate) data.paidDate = toSqlDate(new Date());

    // Normalise dates
    ["issueDate","dueDate","paidDate","recurringStartDate","recurringEndDate"].forEach(k => {
      if (data[k]) data[k] = toSqlDate(data[k]);
    });

    const fields = [], values = [];
    for (const [key, value] of Object.entries(data)) {
      if (key === "items" || value === undefined) continue;
      const col = FIELD_MAP[key];
      if (!col) continue;
      fields.push(`${col} = ?`);
      values.push(key === "isRecurring" ? (value ? 1 : 0) : (value === "" ? null : value));
    }

    if (fields.length) {
      await conn.execute(
        `UPDATE invoices SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        sanitize(...values, id)
      );
    }

    if (Array.isArray(data.items)) {
      await conn.execute("DELETE FROM invoice_items WHERE invoice_id = ?", sanitize(id));
      for (const item of data.items) {
        await conn.execute(
          `INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount, hsn, breakdown)
           VALUES (?,?,?,?,?,?,?,?)`,
          sanitize(
            uuidv4(), id,
            item.description, item.quantity || 1, item.rate || 0, item.amount || 0,
            item.hsn || "998313",
            item.breakdown ? JSON.stringify(item.breakdown) : null
          )
        );
      }
    }

    await conn.commit();

    const [[updated]] = await conn.execute(INV_SELECT + " WHERE i.id = ?", sanitize(id));
    const [updItems]  = await conn.execute(
      "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at", sanitize(id)
    );
    updated.items = updItems;

    res.json({ message: "Invoice updated successfully", invoice: updated });
  } catch (err) {
    await conn.rollback();
    console.error("Update invoice:", err);
    res.status(500).json({ error: "Failed to update invoice" });
  } finally {
    conn.release();
  }
});

// â”€â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  const [ex] = await pool.execute("SELECT id FROM invoices WHERE id = ?", sanitize(id));
  if (!ex.length) return res.status(404).json({ error: "Invoice not found" });

  const access = await canAccessInvoice(req, res, id);
  if (!access.ok) return;

  try {
    await pool.execute("DELETE FROM invoice_items WHERE invoice_id = ?", sanitize(id));
    await pool.execute("DELETE FROM invoices WHERE id = ?", sanitize(id));
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Delete invoice:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

module.exports = router;
