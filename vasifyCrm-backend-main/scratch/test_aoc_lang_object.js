const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testLangObject() {
  const vars4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const testCases = [
    {
      desc: '1. language: { code: "en" }, components: [ { type: "body", parameters: [ { type: "text", text: "v1" } ] } ]',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: vars4.map(t => ({ type: 'text', text: t }))
          }
        ]
      }
    },
    {
      desc: '2. language: { code: "en" }, components: [ { type: "body", parameters: ["v1", "v2", "v3", "v4"] } ]',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: [
          { type: 'body', parameters: vars4 }
        ]
      }
    },
    {
      desc: '3. language: { code: "en" }, components: ["v1", "v2", "v3", "v4"]',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: vars4
      }
    },
    {
      desc: '4. language: { code: "en" }, components: [ { type: "body", variables: ["v1", "v2", "v3", "v4"] } ]',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: [
          { type: 'body', variables: vars4 }
        ]
      }
    },
    {
      desc: '5. language: { code: "en" }, components: { body: ["v1", "v2", "v3", "v4"] }',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: { body: vars4 }
      }
    }
  ];

  for (const c of testCases) {
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(c.payload)
      });
      const txt = await res.text();
      console.log(`\n${c.desc} => Status: ${res.status}`);
      console.log('Response:', txt);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testLangObject();
