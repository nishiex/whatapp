// Nail the `components` OBJECT shape. We now know (from test_aoc_allowed_keys):
//   - templateName is top-level, language is allowed, components is an allowed key
//   - components as an ARRAY  -> "components incorrectly structured"
//   - components as {} (object) -> passes structure, then "Body variables
//     value mis-match: Expected 4 but received 0"
// So components is an OBJECT that must carry 4 body variables. Find its shape:
// the winner returns something OTHER than "Expected 4 but received 0" /
// "incorrectly structured" (ideally success, or a downstream media/window error).
//
// Run: node vasifyCrm-backend-main/scratch/probe_components_object.js

const AOC_URL = "https://api.aoc-portal.com/v1/whatsapp";
const apiKey = process.env.AOC_API_KEY || "kliu2IuLezqOxzzIuOXipDYaFnxubQ";
const from = "919769026133";
const to = "918551890493";
const templateName = "invoice_ready_notification";

const P = ["WhatsApp Client", "INV-VERIFY-01", "21/08/2026", "1180.00"];
const Pobj = P.map((t) => ({ type: "text", text: t }));

const shapes = [
  { label: "1  {type:'body', parameters:[{type,text}]}", components: { type: "body", parameters: Pobj } },
  { label: "2  {body:[strings]}", components: { body: P } },
  { label: "3  {body:[{type,text}]}", components: { body: Pobj } },
  { label: "4  {body:{parameters:[{type,text}]}}", components: { body: { parameters: Pobj } } },
  { label: "5  {body:{parameters:[strings]}}", components: { body: { parameters: P } } },
  { label: "6  {body:{variables:[strings]}}", components: { body: { variables: P } } },
  { label: "7  {parameters:[{type,text}]}", components: { parameters: Pobj } },
  { label: "8  {parameters:[strings]}", components: { parameters: P } },
  { label: "9  {variables:[strings]}", components: { variables: P } },
  { label: "10 {bodyVariables:[strings]}", components: { bodyVariables: P } },
  { label: "11 {body_variables:[strings]}", components: { body_variables: P } },
  { label: "12 {values:[strings]}", components: { values: P } },
  { label: "13 {body:{type:'body',parameters:[{type,text}]}}", components: { body: { type: "body", parameters: Pobj } } },
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
  console.log(`components-object probe  template=${templateName}  to=${to}\n`);
  for (const s of shapes) {
    const payload = {
      recipient_type: "individual",
      from,
      to,
      type: "template",
      templateName,
      language: { code: "en" },
      components: s.components,
    };
    try {
      const r = await postAoc(payload);
      const hit = !/incorrectly structured|Expected 4 but received 0/i.test(r.body) ? "  <<< DIFFERENT" : "";
      console.log(`${s.label} => HTTP ${r.status} | ${r.body}${hit}`);
    } catch (e) {
      console.log(`${s.label} => ERROR ${e.message}`);
    }
  }
})();
