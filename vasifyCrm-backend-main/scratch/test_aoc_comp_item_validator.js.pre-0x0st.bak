const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testCompItemValidator() {
  const vars4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const items = [
    { type: 'body', parameters: vars4.map(t => ({ type: 'text', text: t })) },
    { type: 'body', sub_type: 'url', parameters: vars4.map(t => ({ type: 'text', text: t })) },
    { type: 'body', index: '0', parameters: vars4.map(t => ({ type: 'text', text: t })) },
    { type: 'body', parameters: vars4.map((t, idx) => ({ type: 'text', text: t, parameter_name: `param_${idx+1}` })) },
    { type: 'body', parameters: vars4.map((t, idx) => ({ type: 'text', text: t, name: `param_${idx+1}` })) },
    { type: 'header', parameters: [{ type: 'document', document: { link: 'https://files.catbox.moe/2bmdzs.pdf' } }] },
    { type: 'body', text: 'WhatsApp Client, INV-8551890493-01, 21/08/2026, 1180.00' }
  ];

  for (let i = 0; i < items.length; i++) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      languageCode: 'en',
      components: [items[i]]
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Comp Item ${i + 1} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testCompItemValidator();
