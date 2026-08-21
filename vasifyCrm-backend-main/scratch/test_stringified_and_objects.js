const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testStringifiedAndObjects() {
  const vars4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const tests = [
    {
      desc: '1. components as JSON string of Meta components array',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        languageCode: 'en',
        components: JSON.stringify([
          {
            type: 'body',
            parameters: vars4.map(t => ({ type: 'text', text: t }))
          }
        ])
      }
    },
    {
      desc: '2. components as JSON string of simple array',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        languageCode: 'en',
        components: JSON.stringify(vars4)
      }
    },
    {
      desc: '3. components as array of 4 string values directly',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        languageCode: 'en',
        components: vars4
      }
    },
    {
      desc: '4. components as array of 4 object values with text prop',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        languageCode: 'en',
        components: vars4.map(t => ({ text: t }))
      }
    },
    {
      desc: '5. components as array of 4 object values with type and text props',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        languageCode: 'en',
        components: vars4.map(t => ({ type: 'text', text: t }))
      }
    }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(t.payload)
      });
      const txt = await res.text();
      console.log(`\n${t.desc} => Status: ${res.status}`);
      console.log('Response:', txt);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testStringifiedAndObjects();
