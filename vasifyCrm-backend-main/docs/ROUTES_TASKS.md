ROUTES — Developer Tasks (assigned)
Created: August 24, 2026
Assignee: developer

High Priority (Due: 2026-09-01)
1) Centralize uploader & harden uploads (routes/invoices.js)
   - Add `config/fileUploader.js` with `uploadFile(buffer, filename)` (retries, timeout, parse/validate returned URL).
   - Update `routes/invoices.js` to use the helper and write unit tests.

2) Secure WhatsApp webhook (routes/whatsapp-webhook.js)
   - Verify signatures/tokens and add idempotency/dedupe.

3) Require auth on `routes/tasks.js` where appropriate
   - Add `authenticateToken` and tests asserting endpoints are protected.

4) Add unit test for PDF generation (routes/invoices.js)
   - Ensure `generateInvoicePdfBuffer(...)` returns a non-empty Buffer for sample data.

Medium Priority (Due: 2026-09-07)
5) Add input validation (express-validator) to key routes.
6) Add centralized error handler & structured logging (mask secrets).
7) Add phone normalization helper and apply to invoices/customers.

Low Priority (Due: 2026-09-14)
8) Add RBAC checks for user management.
9) Add CI job (lint + tests).
10) Archive/remove backup files containing old Catbox references once verified.

How to claim tasks
- Edit this file and mark a task as `In progress — developer — <date>` when starting, and `Done — developer — <date>` on completion. Open a PR linking the change to the task.

If you want, I can start implementing task #1 (uploader). Reply: `implement uploader` to proceed.
