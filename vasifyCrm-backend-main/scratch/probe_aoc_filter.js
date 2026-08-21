const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeFilter() {
  const vars4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const testCases = [
    {
      desc: '1. Standard Meta body component with 4 text parameters',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'WhatsApp Client' },
              { type: 'text', text: 'INV-8551890493-01' },
              { type: 'text', text: '21/08/2026' },
              { type: 'text', text: '1180.00' }
            ]
          }
        ]
      }
    },
    {
      desc: '2. Header component + Body component',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              { type: 'text', text: 'Invoice Header' }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'WhatsApp Client' },
              { type: 'text', text: 'INV-8551890493-01' },
              { type: 'text', text: '21/08/2026' },
              { type: 'text', text: '1180.00' }
            ]
          }
        ]
      }
    },
    {
      desc: '3. Header document component + Body component',
      payload: {
        from, to: recipient, type: 'template',
        templateName: 'invoice_ready_notification',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: 'https://files.catbox.moe/2bmdzs.pdf',
                  filename: 'invoice-INV-8551890493-01.pdf'
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'WhatsApp Client' },
              { type: 'text', text: 'INV-8551890493-01' },
              { type: 'text', text: '21/08/2026' },
              { type: 'text', text: '1180.00' }
            ]
          }
        ]
      }
    },
    {
      desc: '4. AOC template format with template inside template object',
      payload: {
        recipient_type: 'individual',
        from, to: recipient, type: 'template',
        template: {
          name: 'invoice_ready_notification',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'WhatsApp Client' },
                { type: 'text', text: 'INV-8551890493-01' },
                { type: 'text', text: '21/08/2026' },
                { type: 'text', text: '1180.00' }
              ]
            }
          ]
        },
        templateName: 'invoice_ready_notification'
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

probeFilter();
