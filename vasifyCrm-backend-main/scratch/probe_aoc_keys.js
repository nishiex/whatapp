const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeKeys() {
  const keysToTest = [
    { templateName: 'hello_world' },
    { template_name: 'hello_world' },
    { templateName: 'invoice_ready_notification' },
    { template_name: 'invoice_ready_notification' },
    { template: 'hello_world' },
    { template: 'invoice_ready_notification' },
    { templateId: 'hello_world' },
    { template_id: 'hello_world' },
    { name: 'hello_world' },
    { name: 'invoice_ready_notification' }
  ];

  for (const extra of keysToTest) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      ...extra
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Key: ${JSON.stringify(extra)} => Status: ${res.status}, Text: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

probeKeys();
