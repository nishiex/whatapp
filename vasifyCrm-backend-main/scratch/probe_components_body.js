// components is an object { header, body, footer, buttons }. Providing `body`
// makes AOC's transform call .filter() on an undefined sibling (HTTP 500). Find
// the body shape + sibling set that stops the crash and delivers 4 variables.
// GOOD = not 500-filter, not "incorrectly structured", not "Expected 4 received 0".
//
// Run: node vasifyCrm-backend-main/scratch/probe_components_body.js

const AOC_URL = "https://api.aoc-portal.com/v1/whatsapp";
const apiKey = process.env.AOC_API_KEY || "kliu2IuLezqOxzzIuOXipDYaFnxubQ";
const from = "919769026133";
const to = "918551890493";
const templateName = "invoice_ready_notification";

const P = ["WhatsApp Client", "INV-VERIFY-01", "21/08/2026", "1180.00"];
const Pobj = P.map((t) => ({ type: "text", text: t }));
const Ptext = P.map((t) => ({ text: t }));

const shapes = [
  { label: "A body:P (baseline)", c: { body: P } },
  { label: "B body:P + header:[]", c: { header: [], body: P } },
  { label: "C body:P + footer:[]", c: { footer: [], body: P } },
  { label: "D body:P + buttons:[]", c: { buttons: [], body: P } },
  { label: "E body:P + header:[] footer:[] buttons:[]", c: { header: [], footer: [], buttons: [], body: P } },
  { label: "F body:Pobj + all-siblings[]", c: { header: [], footer: [], buttons: [], body: Pobj } },
  { label: "G body:Ptext + all-siblings[]", c: { header: [], footer: [], buttons: [], body: Ptext } },
  { label: "H body:{parameters:P} + siblings[]", c: { header: [], footer: [], buttons: [], body: { parameters: P } } },
  { label: "I body:{parameters:Pobj} + siblings[]", c: { header: [], footer: [], buttons: [], body: { parameters: Pobj } } },
  { label: "J header:{} footer:{} buttons:{} body:P", c: { header: {}, footer: {}, buttons: {}, body: P } },
  { label: "K body:P + buttons:[] footer:[]", c: { footer: [], buttons: [], body: P } },
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
  console.log(`components.body probe  template=${templateName}  to=${to}\n`);
  for (const s of shapes) {
    const payload = {
      recipient_type: "individual",
      from,
      to,
      type: "template",
      templateName,
      language: { code: "en" },
      components: s.c,
    };
    try {
      const r = await postAoc(payload);
      const bad = /incorrectly structured|Expected 4 but received 0|reading 'filter'/i.test(r.body);
      console.log(`${s.label} => HTTP ${r.status} | ${r.body}${bad ? "" : "   <<< GOOD"}`);
    } catch (e) {
      console.log(`${s.label} => ERROR ${e.message}`);
    }
  }
})();
