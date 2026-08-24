DEVELOPER TASKS
Assignee: developer
Created: August 24, 2026

High Priority
1) Implement robust 0x0.st uploader (Assignee: developer)
   - Replace ad-hoc domain string changes with a single FILE_UPLOAD_URL config.
   - Ensure request uses the correct multipart field and parse the response safely (extract URL, trim wrapping chars).
   - Add retry (3 attempts), timeout (e.g., 10s), and validation that returned URL is HTTPS and reachable.
   - Acceptance: outes/invoices.js uses process.env.FILE_UPLOAD_URL, uploads succeed end-to-end in a local test, and logs sanitized.
   - Suggested due date: September 1, 2026.

2) Add automated tests for WhatsApp document flow (Assignee: developer)
   - Unit tests for PDF generation function returning a non-empty Buffer.
   - Integration test (mocked HTTP) to assert upload and AOC payload generation.
   - Acceptance: CI runs tests and they pass.

Medium Priority
3) Clean up backup files and archive originals (Assignee: developer)
   - Move .pre-0x0st.bak files into rchive/backups/ or remove after verification.
   - Acceptance: no active code references catbox.

4) Improve logging and error handling (Assignee: developer)
   - Mask API keys and phone numbers in logs.
   - Add clearer error messages for upload failures and fallback behavior.

5) Centralize uploader config (Assignee: developer)
   - Add config/fileUploader.js (or env FILE_UPLOAD_URL) and update code to import it.

Low Priority
6) Update scripts/apply_catbox_fix.js to a more generic scripts/normalize_uploader.js (Assignee: developer)
7) Add README notes about the upload change and required env vars (Assignee: developer)
8) Add a small CI job that runs lint and 
pm test on PRs (Assignee: developer)
9) Security audit checklist for file uploads (scan file types, size limits) (Assignee: developer)

How to claim a task
- Edit docs/DEVELOPER_TASKS.md and mark the task as In progress — developer — <date>.
- When finished, mark it Done — developer — <date> and open a PR referencing this file.

If you want, I can convert these tasks into GitHub issues or create a simple JSON-based task file to integrate with a lightweight task runner. Tell me which you prefer.
