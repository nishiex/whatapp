const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testCompKeys() {
  const variations = [
    {
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
      ],
      language: { code: 'en' }
    },
    {
      templateName: 'invoice_ready_notification',
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
      ],
      languageCode: 'en'
    },
    {
      templateName: 'invoice_ready_notification',
      components: [
        {
          type: 'body',
          parameters: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
        }
      ],
      languageCode: 'en'
    },
    {
      templateName: 'invoice_ready_notification',
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
      }
    },
    {
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
      }
    }
  ];

  for (let i = 0; i < variations.length; i++) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      ...variations[i]
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Var ${i + 1} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testCompKeys();
