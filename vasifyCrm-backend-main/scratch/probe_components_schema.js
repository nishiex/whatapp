// Extract AOC's template schema by tripping its Joi validator. Type-mismatch and
// bogus-key values make Joi report expected types and allowed keys; wrong var
// counts confirm where the 4 body variables are read from.
//
// Run: node vasifyCrm-backend-main/scratch/probe_components_schema.js

const AOC_URL = "https://api.aoc-portal.com/v1/whatsapp";
const apiKey = process.env.AOC_API_KEY || "kliu2IuLezqOxzzIuOXipDYaFnxubQ";
const from = "919769026133";
const to = "918551890493";
const templateName = "invoice_ready_notification";

const tests = [
  { label: "T1  components:42", components: 42 },
  { label: "T2  components:{}", components: {} },
  { label: "T3  components:{body:42}", components: { body: 42 } },
  { label: "T4  components:{body:[]}", components: { body: [] } },
  { label: "T5  components:{body:['a']}", components: { body: ["a"] } },
  { label: "T6  components:{body:4 strings}", components: { body: ["a", "b", "c", "d"] } },
  { label: "T7  components:{body:[{}]}", components: { body: [{}] } },
  { label: "T8  components:{body:[{zzz:1}]}", components: { body: [{ zzz: 1 }] } },
  { label: "T9  components:{body:[{type:text,text:a}]}", components: { body: [{ type: "text", text: "a" }] } },
  { label: "T10 components:{header:42}", components: { header: 42 } },
  { label: "T11 components:{header:{},body:4}", components: { header: {}, body: ["a", "b", "c", "d"] } },
  {
    label: "T12 components:{header:{document},body:4}",
    components: { header: { type: "document", document: { link: "https://example.com/x.pdf" } }, body: ["a", "b", "c", "d"] },
  },
  { label: "T13 components:{zzz_unknown:1}", components: { zzz_unknown: 1 } },
  { label: "T14 components:{body:{1..4 map}}", components: { body: { 1: "a", 2: "b", 3: "c", 4: "d" } } },
  { label: "T15 components:{text:4 strings}", components: { text: ["a", "b", "c", "d"] } },
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
  console.log(`schema-extraction probe  template=${templateName}  to=${to}\n`);
  for (const t of tests) {
    const payload = {
      recipient_type: "individual",
      from,
      to,
      type: "template",
      templateName,
      language: { code: "en" },
      components: t.components,
    };
    try {
      const r = await postAoc(payload);
      console.log(`${t.label} => HTTP ${r.status} | ${r.body}`);
    } catch (e) {
      console.log(`${t.label} => ERROR ${e.message}`);
    }
  }
})();
