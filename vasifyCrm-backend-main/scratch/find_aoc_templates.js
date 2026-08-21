const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function findTemplates() {
  const possibleNames = [
    'hello_world',
    'invoice_ready_notification',
    'invoice_notification',
    'invoice_ready',
    'send_invoice',
    'invoice_pdf',
    'vasify_invoice',
    'invoice_details'
  ];

  for (const name of possibleNames) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: name
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Template "${name}" => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

findTemplates();
