const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeHeaderComponents() {
  const tests = [
    {
      desc: 'Header (document) + Body (4 text params)',
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
    },
    {
      desc: 'Header (text) + Body (4 text params)',
      components: [
        {
          type: 'header',
          parameters: [
            { type: 'text', text: 'Invoice Notification' }
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
    },
    {
      desc: 'Header (image) + Body (4 text params)',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: { link: 'https://catbox.moe/user/api.php' }
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
  ];

  for (const t of tests) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      languageCode: 'en',
      components: t.components
    };
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

probeHeaderComponents();
