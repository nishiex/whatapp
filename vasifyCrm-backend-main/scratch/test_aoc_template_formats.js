const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '+919769026133';

async function testAocTemplates() {
  const formats = [
    {
      name: 'Format 1: template_name at top level',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template_name: 'invoice_ready_notification',
        language: 'en',
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
      name: 'Format 2: template: { name: ... } without parameters inside template object',
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
    },
    {
      name: 'Format 3: template_name & template object with parameters',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template_name: 'invoice_ready_notification',
        template: {
          name: 'invoice_ready_notification',
          language: { code: 'en' },
          parameters: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
        }
      }
    },
    {
      name: 'Format 4: AOC simple template format (template_name + parameters array)',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template_name: 'invoice_ready_notification',
        parameters: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
      }
    },
    {
      name: 'Format 5: hello_world default template',
      payload: {
        recipient_type: 'individual',
        from,
        to: recipient,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' }
        }
      }
    }
  ];

  for (const fmt of formats) {
    console.log(`\n--- Testing ${fmt.name} ---`);
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(fmt.payload)
      });
      console.log('Status:', res.status, 'Response:', await res.text());
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

testAocTemplates();
