(async () => {
  try {
    // Load env from project
    Object.assign(process.env, require('./env/development.json'));
    const fetch = global.fetch;

    // Minimal valid PDF content
    const pdfStr = '%PDF-1.1\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n72 712 Td\n(Hello) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000067 00000 n \n0000000120 00000 n \n0000000217 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n308\n%%EOF';
    const pdfBuf = Buffer.from(pdfStr, 'binary');

    // Upload to Catbox
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([pdfBuf], { type: 'application/pdf' }), 'test-invoice.pdf');

    const uploadRes = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData });
    const uploadTextRaw = (await uploadRes.text()).trim();
    console.log('[BACKEND-TEST] Catbox response (raw):', JSON.stringify(uploadTextRaw));

    if (!(uploadRes.ok && /^https?:\/\//i.test(uploadTextRaw))) {
      console.error('[BACKEND-TEST] Catbox did not return a valid URL');
      process.exit(1);
    }

    // The media URL Catbox returned
    const mediaUrl = uploadTextRaw;
    console.log('mediaUrl:', mediaUrl);

    // Verify reachable + Content-Type
    const pdfCheck = await fetch(mediaUrl, { method: 'GET' });
    const contentType = (pdfCheck.headers.get('content-type') || '').toLowerCase();
    console.log('[BACKEND-TEST] PDF Content-Type:', contentType);

    // Build payload for AOC and send one document message
    const apiKey = process.env.AOC_API_KEY || process.env.WHATSAPP_API_TOKEN || '';
    const from = (process.env.AOC_FROM_NUMBER || process.env.WHATSAPP_PHONE_NUMBER_ID || '').replace(/\+/g, '');
    const adminNumbers = (process.env.ADMIN_PHONE_NUMBER || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean);
    const to = adminNumbers.length ? adminNumbers[0] : '';

    if (!to) {
      console.error('[BACKEND-TEST] No admin phone configured to send to in env; please set ADMIN_PHONE_NUMBER or change `to` in script.');
      process.exit(1);
    }

    const docPayload = {
      recipient_type: 'individual',
      from,
      to,
      type: 'document',
      document: { link: mediaUrl },
    };

    // Print a sanitized payload so we don't leak phone in logs
    console.log('[BACKEND-TEST] AOC docPayload (sanitized):', JSON.stringify({
      recipient_type: docPayload.recipient_type,
      from: '***FROM***',
      to: '***TO***',
      type: docPayload.type,
      document: { link: mediaUrl },
    }, null, 2));

    // Send the single document request to AOC
    const aocRes = await fetch('https://api.aoc-portal.com/v1/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify(docPayload),
    });

    let aocTextRaw = await aocRes.text();
    // Mask API key and long digit sequences (phones) for safety
    aocTextRaw = aocTextRaw.replace(new RegExp(apiKey, 'g'), '***API_KEY***');
    aocTextRaw = aocTextRaw.replace(/\d{8,15}/g, '***PHONE***');

    console.log('[BACKEND-TEST] [AOC] Status:', aocRes.status);
    console.log('[BACKEND-TEST] [AOC] Response (masked):', aocTextRaw);

  } catch (e) {
    console.error('[BACKEND-TEST] ERROR:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();