"use strict";

const test = require("node:test");
const assert = require("node:assert");

// Requiring the invoices router also constructs the mysql pool (lazily — no
// connection is made until a query runs), so this is safe without a live DB.
const invoices = require("../routes/invoices");

test("generateInvoicePdfBuffer: is exported for testing", () => {
  assert.strictEqual(typeof invoices.generateInvoicePdfBuffer, "function");
});

test("generateInvoicePdfBuffer: returns a non-empty PDF buffer (with items)", async () => {
  const inv = {
    invoice_number: "INV-TEST-0001",
    status: "unpaid",
    tax: 18,
    amount: 1000,
    customer_name: "Acme Test Co.",
    place_of_supply: "Maharashtra (27)",
    issue_date: "2026-08-24",
    due_date: "2026-08-31",
  };
  const items = [
    { description: "Consulting", quantity: 2, rate: 250, amount: 500, hsn: "998313" },
    { description: "Support", quantity: 1, rate: 500, amount: 500, hsn: "998313" },
  ];

  const buf = await invoices.generateInvoicePdfBuffer(inv, items);

  assert.ok(Buffer.isBuffer(buf), "should return a Buffer");
  assert.ok(buf.length > 500, "PDF should be non-trivial in size");
  assert.strictEqual(buf.subarray(0, 5).toString("latin1"), "%PDF-", "should start with the PDF signature");
});

test("generateInvoicePdfBuffer: works with no line items (falls back to invoice amount)", async () => {
  const inv = {
    invoice_number: "INV-TEST-0002",
    status: "paid",
    tax: 18,
    amount: 4200,
    customer_name: "Solo Client",
  };

  const buf = await invoices.generateInvoicePdfBuffer(inv, []);

  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 500);
  assert.strictEqual(buf.subarray(0, 5).toString("latin1"), "%PDF-");
});
