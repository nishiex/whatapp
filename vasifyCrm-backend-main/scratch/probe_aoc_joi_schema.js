const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeJoiSchema() {
  const compItemsToTest = [
    { type: 'body', parameters: [] },
    { type: 'body', params: [] },
    { type: 'body', text: '' },
    { type: 'body', variables: [] },
    { component_type: 'body' },
    { type: 'header' },
    { type: 'footer' },
    { type: 'button' }
  ];

  for (const item of compItemsToTest) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      languageCode: 'en',
      components: [item]
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Comp Item: ${JSON.stringify(item)} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

probeJoiSchema();
