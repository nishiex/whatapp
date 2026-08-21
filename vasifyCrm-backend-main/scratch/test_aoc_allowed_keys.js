const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function testAllowedKeys() {
  const keysToTry = [
    'components',
    'language',
    'languageCode',
    'header',
    'body',
    'footer',
    'buttons',
    'templateData',
    'template_data',
    'template',
    'vars',
    'bodyValues',
    'body_values',
    'placeholders',
    'params',
    'parameters',
    'variables'
  ];

  for (const k of keysToTry) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      [k]: {}
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Key "${k}" => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testAllowedKeys();
