Vasify CRM Backend — Routes Notes
Last updated: August 24, 2026

Location: `vasifyCrm-backend-main/routes`

Quick summary:
- Routes implement authentication, CRM resources (customers, deals, projects, leads), invoice generation/delivery, WhatsApp integration, and reporting.
- `authenticateToken` is widely used; check any public endpoints (notably `routes/tasks.js`).
- `routes/invoices.js` contains PDF generation (PDFKit) and a public upload/send flow (now configured to use 0x0.st). This file is high-risk and needs tests and centralization of uploader configuration.
- `routes/whatsapp-webhook.js` should validate webhook authenticity and include idempotency/dedupe.

Per-file highlights (short):
- `invoices.js` — invoice CRUD, PDF generation, `POST /:id/send-whatsapp`, file upload helper usage. (PDF + uploader)
- `whatsapp.js` — WhatsApp settings, alerts, stats, send flows.
- `whatsapp-webhook.js` — incoming webhook endpoint; requires signature verification and dedupe.
- `auth.js` — login/registration/profile; token-based protection for protected routes.
- `customers.js`, `deals.js`, `projects.js`, `leads.js` — standard CRUD; add validation and tests.
- `retainers.js` — payments/exports; ensure export endpoints are efficient and secure.
- `tasks.js` — task endpoints appear public (no `authenticateToken`) — review immediately.
- `users.js` — user management; enforce RBAC for delete/update operations.

Cross-cutting recommendations:
- Centralize file uploader and a `FILE_UPLOAD_URL` env var.
- Add `express-validator` to validate inputs at route boundaries.
- Introduce centralized error-handling middleware and structured logging (mask secrets).
- Normalize phone numbers to E.164 using `libphonenumber-js`.
- Add unit and integration tests for critical flows (PDF gen, upload, WhatsApp payloads).

Next concrete steps: review `routes/tasks.js`, centralize uploader (invoices flow), harden webhook verification, add validators and tests.
