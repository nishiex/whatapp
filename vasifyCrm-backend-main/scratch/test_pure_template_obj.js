const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testPureTemplateObj() {
  const vars4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const testCases = [
    {
      desc: '1. template object with components (type: body, parameters: [{type: text, text}])',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template: {
          name: 'invoice_ready_notification',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: vars4.map(t => ({ type: 'text', text: t }))
            }
          ]
        }
      }
    },
    {
      desc: '2. template object with components (type: body, parameters: [string])',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template: {
          name: 'invoice_ready_notification',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: vars4
            }
          ]
        }
      }
    },
    {
      desc: '3. template object with components (type: body, variables: [string])',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template: {
          name: 'invoice_ready_notification',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              variables: vars4
            }
          ]
        }
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

testPureTemplateObj();
