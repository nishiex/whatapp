// Ground-truth probe: which TEMPLATE payload shape does the AOC gateway accept?
//
// The live route currently sends a FLATTENED shape (top-level templateName +
// components) and AOC rejects it with 400 "Template components are missing or
// incorrectly structured". services/whatsapp.js (the maintained integration)
// instead sends a NESTED `template:{name,language,components}` object. This
// script sends a few labeled candidate shapes to AOC and prints each verbatim
// response so we can see which structure passes AOC's validator.
//
// Sequential + a small set on purpose: this hits a live gateway and a real test
// number. Structurally-invalid shapes 400 (no message sent); a structurally
// VALID shape may attempt a real send (that's the signal we want).
//
// Run:  node vasifyCrm-backend-main/scratch/probe_template_shapes.js

const AOC_URL = "https://api.aoc-portal.com/v1/whatsapp";
const apiKey = process.env.AOC_API_KEY || "kliu2IuLezqOxzzIuOXipDYaFnxubQ";
const from = (process.env.AOC_FROM_NUMBER || "919769026133").replace(/\+/g, "");
const to = (process.env.TO || "918551890493").replace(/\D/g, "");

const name = process.env.WHATSAPP_TEMPLATE_NAME || "invoice_ready_notification";
const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
const link = process.env.MEDIA_URL || "https://example.com/invoice.pdf";
const filename = "invoice-INV-VERIFY-01.pdf";
const bodyParams = ["WhatsApp Client", "INV-VERIFY-01", "21/08/2026", "1180.00"];

const bodyComp = { type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: t })) };
const docHeaderComp = {
  type: "header",
  parameters: [{ type: "document", document: { link, filename } }],
};

const base = { recipient_type: "individual", from, to, type: "template" };

const candidates = [
  {
    label: "A. NESTED template{} body-only  (== services/whatsapp.js sendTemplate)",
    payload: { ...base, template: { name, language: { code: lang }, components: [bodyComp] } },
  },
  {
    label: "B. NESTED template{} header(document)+body",
    payload: { ...base, template: { name, language: { code: lang }, components: [docHeaderComp, bodyComp] } },
  },
  {
    label: "C. NESTED template{} name+language ONLY (no components)",
    payload: { ...base, template: { name, language: { code: lang } } },
  },
  {
    label: "D. FLATTENED templateName + top-level components (current invoices.js — expected 400)",
    payload: { ...base, templateName: name, language: { code: lang }, components: [docHeaderComp, bodyComp] },
  },
];

async function postAoc(payload) {
  const res = await fetch(AOC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: (await res.text()).trim() };
}

(async () => {
  console.log(`AOC template-shape probe`);
  console.log(`  from=${from}  to=${to}  template=${name}/${lang}  key=***${apiKey.slice(-4)}`);
  console.log("");
  for (const c of candidates) {
    try {
      const r = await postAoc(c.payload);
      console.log(`${c.label}`);
      console.log(`   -> HTTP ${r.status} | ${r.body}`);
    } catch (e) {
      console.log(`${c.label}`);
      console.log(`   -> ERROR ${e.message}`);
    }
    console.log("");
  }
  console.log("Done. The shape whose response is NOT \"components missing or incorrectly");
  console.log("structured\" is the one AOC accepts structurally.");
})();
