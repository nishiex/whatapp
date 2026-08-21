const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testTopLevelParams() {
  const tests = [
    { templateName: 'invoice_ready_notification', languageCode: 'en', body_values: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] },
    { templateName: 'invoice_ready_notification', languageCode: 'en', body_text: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] },
    { templateName: 'invoice_ready_notification', languageCode: 'en', body: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] },
    { templateName: 'invoice_ready_notification', languageCode: 'en', parameters: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] },
    { templateName: 'invoice_ready_notification', languageCode: 'en', values: ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'] },
    { templateName: 'invoice_ready_notification', languageCode: 'en', components: { type: 'body', parameters: [{ type: 'text', text: 'WhatsApp Client' }, { type: 'text', text: 'INV-8551890493-01' }, { type: 'text', text: '21/08/2026' }, { type: 'text', text: '1180.00' }] } }
  ];

  for (let i = 0; i < tests.length; i++) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      ...tests[i]
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Top Test ${i + 1} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testTopLevelParams();
