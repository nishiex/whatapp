// Is the 500 crash specific to invoice_ready_notification's stored definition, or
// is the whole template path broken? Test the standard hello_world template
// (0 variables) plus a few structured invoice_ready_notification attempts.
//
// Run: node vasifyCrm-backend-main/scratch/probe_template_hello.js

const AOC_URL = "https://api.aoc-portal.com/v1/whatsapp";
const apiKey = process.env.AOC_API_KEY || "kliu2IuLezqOxzzIuOXipDYaFnxubQ";
const from = "919769026133";
const to = "918551890493";

const link = "https://example.com/x.pdf";
const filename = "invoice.pdf";
const P4obj = ["a", "b", "c", "d"].map((t) => ({ type: "text", text: t }));

const tests = [
  { label: "H1 hello_world en_US components:{}", p: { templateName: "hello_world", language: { code: "en_US" }, components: {} } },
  { label: "H2 hello_world en_US no-components", p: { templateName: "hello_world", language: { code: "en_US" } } },
  { label: "H3 hello_world en components:{}", p: { templateName: "hello_world", language: { code: "en" }, components: {} } },
  { label: "H4 hello_world no-lang no-components", p: { templateName: "hello_world" } },
  {
    label: "H5 invoice header{parameters:[doc]} body{parameters:[text*4]}",
    p: {
      templateName: "invoice_ready_notification",
      language: { code: "en" },
      components: {
        header: { parameters: [{ type: "document", document: { link, filename } }] },
        body: { parameters: P4obj },
      },
    },
  },
  {
    label: "H6 invoice header{parameters:[doc]} body:[text*4]",
    p: {
      templateName: "invoice_ready_notification",
      language: { code: "en" },
      components: { header: { parameters: [{ type: "document", document: { link, filename } }] }, body: P4obj },
    },
  },
  {
    label: "H7 invoice header:[doc] body:[text*4] (both arrays)",
    p: {
      templateName: "invoice_ready_notification",
      language: { code: "en" },
      components: { header: [{ type: "document", document: { link, filename } }], body: P4obj },
    },
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
  console.log(`hello_world / template-path probe  to=${to}\n`);
  for (const t of tests) {
    const payload = { recipient_type: "individual", from, to, type: "template", ...t.p };
    try {
      const r = await postAoc(payload);
      console.log(`${t.label}\n   -> HTTP ${r.status} | ${r.body}\n`);
    } catch (e) {
      console.log(`${t.label}\n   -> ERROR ${e.message}\n`);
    }
  }
})();
