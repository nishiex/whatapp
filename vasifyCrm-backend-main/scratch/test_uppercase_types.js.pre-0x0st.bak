const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testUppercaseTypes() {
  const vars4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const testCases = [
    {
      desc: '1. Uppercase type: "BODY" with type: "text"',
      components: [
        {
          type: 'BODY',
          parameters: vars4.map(t => ({ type: 'text', text: t }))
        }
      ]
    },
    {
      desc: '2. Uppercase type: "BODY" with uppercase type: "TEXT"',
      components: [
        {
          type: 'BODY',
          parameters: vars4.map(t => ({ type: 'TEXT', text: t }))
        }
      ]
    },
    {
      desc: '3. Uppercase type: "BODY" with string parameters',
      components: [
        {
          type: 'BODY',
          parameters: vars4
        }
      ]
    },
    {
      desc: '4. Uppercase type: "HEADER" (DOCUMENT) + "BODY" (TEXT)',
      components: [
        {
          type: 'HEADER',
          parameters: [
            {
              type: 'DOCUMENT',
              document: {
                link: 'https://files.catbox.moe/2bmdzs.pdf',
                filename: 'invoice-INV-8551890493-01.pdf'
              }
            }
          ]
        },
        {
          type: 'BODY',
          parameters: vars4.map(t => ({ type: 'TEXT', text: t }))
        }
      ]
    }
  ];

  for (const c of testCases) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      languageCode: 'en',
      components: c.components
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`\n${c.desc} => Status: ${res.status}`);
      console.log('Response:', txt);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testUppercaseTypes();
