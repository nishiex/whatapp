const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeLanguage() {
  const langFormats = [
    { languageCode: 'en' },
    { language_code: 'en' },
    { language: { code: 'en' } },
    { language: 'en' },
    { lang: 'en' },
    { templateLanguage: 'en' },
    { template_language: 'en' }
  ];

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'WhatsApp Client' },
        { type: 'text', text: 'INV-8551890493-01' },
        { type: 'text', text: '21/08/2026' },
        { type: 'text', text: '1180.00' }
      ]
    }
  ];

  for (const lang of langFormats) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      components,
      ...lang
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Lang format: ${JSON.stringify(lang)} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

probeLanguage();
