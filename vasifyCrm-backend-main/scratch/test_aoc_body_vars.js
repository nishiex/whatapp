const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testBodyVars() {
  const vars = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const testPayloads = [
    { name: 'bodyValues (array of strings)', bodyValues: vars },
    { name: 'bodyVariables (array of strings)', bodyVariables: vars },
    { name: 'body_variables (array of strings)', body_variables: vars },
    { name: 'body_parameters (array of strings)', body_parameters: vars },
    { name: 'bodyParameters (array of strings)', bodyParameters: vars },
    { name: 'body_params (array of strings)', body_params: vars },
    { name: 'bodyParams (array of strings)', bodyParams: vars },
    { name: 'variables (array of strings)', variables: vars },
    { name: 'params (array of strings)', params: vars },
    { name: 'parameters (array of strings)', parameters: vars },
    { name: 'template_variables (array of strings)', template_variables: vars },
    { name: 'templateVariables (array of strings)', templateVariables: vars },
    { name: 'values (array of strings)', values: vars },
    { name: 'body_vars (array of strings)', body_vars: vars },
    { name: 'bodyVars (array of strings)', bodyVars: vars },
    { name: 'attributes (array of strings)', attributes: vars },
    { name: 'custom_fields (array of strings)', custom_fields: vars }
  ];

  for (const t of testPayloads) {
    const { name, ...fields } = t;
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      ...fields
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`${name} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testBodyVars();
