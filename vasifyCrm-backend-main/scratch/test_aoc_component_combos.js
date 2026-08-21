const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';
const from = '919769026133';

async function probeCombos() {
  const params4 = ['WhatsApp Client', 'INV-8551890493-01', '21/08/2026', '1180.00'];

  const combos = [
    // 1. parameters: [{ text: "..." }]
    [{ type: 'body', parameters: params4.map(t => ({ text: t })) }],
    // 2. parameters: [{ type: "text", text: "..." }]
    [{ type: 'body', parameters: params4.map(t => ({ type: 'text', text: t })) }],
    // 3. parameters: [{ type: "text", value: "..." }]
    [{ type: 'body', parameters: params4.map(t => ({ type: 'text', value: t })) }],
    // 4. parameters: [{ value: "..." }]
    [{ type: 'body', parameters: params4.map(t => ({ value: t })) }],
    // 5. parameters: strings
    [{ type: 'body', parameters: params4 }],
    // 6. params: strings
    [{ type: 'body', params: params4 }],
    // 7. variables: strings
    [{ type: 'body', variables: params4 }],
    // 8. values: strings
    [{ type: 'body', values: params4 }]
  ];

  for (let i = 0; i < combos.length; i++) {
    const payload = {
      from,
      to: recipient,
      type: 'template',
      templateName: 'invoice_ready_notification',
      languageCode: 'en',
      components: combos[i]
    };
    try {
      const res = await fetch(AOC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      console.log(`Combo ${i + 1} => Status: ${res.status}, Response: ${txt}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

probeCombos();
