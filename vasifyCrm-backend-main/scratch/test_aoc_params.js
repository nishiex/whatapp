const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testParamKeys() {
  const sampleParams = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const paramFormats = [
    { parameters: sampleParams },
    { params: sampleParams },
    { body_parameters: sampleParams },
    { bodyParameters: sampleParams },
    { variables: sampleParams },
    { vars: sampleParams },
    { body_variables: sampleParams },
    { bodyVariables: sampleParams },
    { components: [{ type: 'body', parameters: sampleParams.map(p => ({ type: 'text', text: p })) }] },
    { template: { components: [{ type: 'body', parameters: sampleParams.map(p => ({ type: 'text', text: p })) }] } }
  ];

  for (const fmt of paramFormats) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      ...fmt
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Param format: ${JSON.stringify(Object.keys(fmt))} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testParamKeys();
