const AOC_API_URL = 'https://api.aoc-portal.com/v1/whatsapp';
const apiKey = 'kliu2IuLezqOxzzIuOXipDYaFnxubQ';
const recipient = '918551890493';

async function testPayloads() {
  console.log('--- Testing AOC WhatsApp Payload Combinations ---');

  // Test 1: Template Message (invoice_ready_notification)
  console.log('\n[Test 1] Template Message (invoice_ready_notification)...');
  const templatePayload = {
    from: '+919769026133',
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
            { type: 'text', text: '₹1,180.00' }
          ]
        }
      ]
    }
  };
  const res1 = await fetch(AOC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify(templatePayload)
  });
  console.log('Res 1 Status:', res1.status, await res1.text());

  // Test 2: Text message with +91 in from
  console.log('\n[Test 2] Text message (from: +919769026133)...');
  const textPayload1 = {
    recipient_type: 'individual',
    from: '+919769026133',
    to: recipient,
    type: 'text',
    text: { body: 'Hello WhatsApp Client! Your invoice INV-8551890493-01 of ₹1180.00 is ready. Vasify Technologies Team' }
  };
  const res2 = await fetch(AOC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify(textPayload1)
  });
  console.log('Res 2 Status:', res2.status, await res2.text());

  // Test 3: Text message with 91 in from (digits only)
  console.log('\n[Test 3] Text message (from: 919769026133)...');
  const textPayload2 = {
    recipient_type: 'individual',
    from: '919769026133',
    to: recipient,
    type: 'text',
    text: { body: 'Hello WhatsApp Client! Your invoice INV-8551890493-01 of ₹1180.00 is ready. Vasify Technologies Team' }
  };
  const res3 = await fetch(AOC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify(textPayload2)
  });
  console.log('Res 3 Status:', res3.status, await res3.text());

  // Test 4: Document message with public HTTPS link
  console.log('\n[Test 4] Document message with catbox.moe HTTPS link...');
  const docPayload = {
    recipient_type: 'individual',
    from: '+919769026133',
    to: recipient,
    type: 'document',
    document: {
      link: 'https://files.catbox.moe/2bmdzs.pdf',
      filename: 'invoice-INV-8551890493-01.pdf',
      caption: 'Hi WhatsApp Client, please find attached your Invoice PDF.'
    }
  };
  const res4 = await fetch(AOC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify(docPayload)
  });
  console.log('Res 4 Status:', res4.status, await res4.text());
}

testPayloads();
