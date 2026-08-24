const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'vasifyCrm-backend-main', 'routes', 'invoices.js');
const bak = p + '.bak';
fs.copyFileSync(p, bak);
let s = fs.readFileSync(p, 'utf8');
const marker = 'const docPayload = {';
const idx = s.indexOf(marker);
if (idx === -1) {
  console.error('Marker not found: ' + marker);
  process.exit(1);
}
const insert = 

/* ------------------------------------------------------------
   9. VALIDATE PUBLIC PDF URL
   ------------------------------------------------------------ */
mediaUrl = (mediaUrl || "").trim();

try {
  const parsedUrl = new URL(mediaUrl);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("PDF URL must use HTTPS");
  }

  // Normalize the URL
  mediaUrl = parsedUrl.toString();

  console.log("========== AOC PDF URL DEBUG ==========");
  console.log("mediaUrl:", mediaUrl);
  console.log("protocol:", parsedUrl.protocol);
  console.log("hostname:", parsedUrl.hostname);
  console.log("=======================================");

} catch (urlError) {
  console.error(
    "[WhatsApp Document] Invalid PDF URL:",
    mediaUrl,
    urlError.message
  );

  return res.status(500).json({
    error: true,
    message: "Invoice PDF URL is not a valid public HTTPS URL.",
    details: urlError.message,
  });
}

/* ------------------------------------------------------------
   10. VERIFY PDF IS ACTUALLY ACCESSIBLE
   ------------------------------------------------------------ */
try {
  const pdfCheck = await fetch(mediaUrl, {
    method: "GET",
  });

  if (!pdfCheck.ok) {
    throw new Error("PDF URL returned HTTP " + pdfCheck.status);
  }

  const contentType = pdfCheck.headers.get("content-type") || "";

  console.log("[WhatsApp Document] PDF Content-Type:", contentType);

  if (!contentType.toLowerCase().includes("pdf")) {
    throw new Error("URL did not return a PDF. Content-Type: " + contentType);
  }

} catch (pdfCheckError) {
  console.error(
    "[WhatsApp Document] PDF URL verification failed:",
    pdfCheckError.message
  );

  return res.status(500).json({
    error: true,
    message: "Invoice PDF URL is not accessible or does not return a PDF.",
    details: pdfCheckError.message,
    pdfUrl: mediaUrl,
  });
}

;
const newS = s.slice(0, idx) + insert + s.slice(idx);
fs.writeFileSync(p, newS, 'utf8');
console.log('Patched invoices.js, backup at', bak);
