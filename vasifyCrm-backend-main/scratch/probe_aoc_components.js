const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeComponents() {
  const componentStructures = [
    // Meta standard format inside components
    [
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
    // Array of string parameters directly in body component
    [
      {
        type: 'body',
        parameters: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
      }
    ],
    // AOC simple parameters inside components
    [
      {
        type: 'body',
        variables: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00']
      }
    ],
    // components as parameter list
    [
      'WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'
    ],
    // components with text array
    [
      { type: 'text', text: 'WhatsApp Client' },
      { type: 'text', text: 'INV-8551890493-01' },
      { type: 'text', text: '21/08/2026' },
      { type: 'text', text: '1180.00' }
    ]
  ];

  for (let i = 0; i < componentStructures.length; i++) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      language: 'en',
      components: componentStructures[i]
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Comp test ${i + 1} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

probeComponents();
