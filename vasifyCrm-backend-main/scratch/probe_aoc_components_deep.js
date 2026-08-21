const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeDeepComponents() {
  const tests = [
    {
      desc: '1. components array of string values',
      components: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
    },
    {
      desc: '2. components: { body: [...] } object',
      components: { body: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] }
    },
    {
      desc: '3. components: [ { type: "body", parameters: [...] } ] with string params',
      components: [{ type: 'body', parameters: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] }]
    },
    {
      desc: '4. components: [ { type: "body", text: ... } ]',
      components: [
        { type: 'body', text: 'WhatsApp Client' },
        { type: 'body', text: 'INV-8551890493-01' },
        { type: 'body', text: '21/08/2026' },
        { type: 'body', text: '1180.00' }
      ]
    },
    {
      desc: '5. components: [ { type: "body", variables: [...] } ]',
      components: [{ type: 'body', variables: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] }]
    },
    {
      desc: '6. body_variables at top level',
      body_variables: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
    },
    {
      desc: '7. params at top level with languageCode',
      params: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
    }
  ];

  for (const t of tests) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      languageCode: 'en',
      ...t
    };
    delete payload.desc;
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`${t.desc} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

probeDeepComponents();
