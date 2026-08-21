const { v4: uuidv4 } = require("uuid");
const express = require("express");
const { body, validationResult, query } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { getOwnershipClause, ensureCanAccessRecord } = require("../utils/demoScope"); // 🔒 NEW

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sanitizeParams = (...params) =>
  params.map((p) => (p === undefined ? null : p));

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: "Validation failed", details: errors.array() });
    return true;
  }
  return false;
};

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
};

// ✅ FIX: MySQL DATE columns (closure_date, onboarding_date, renewal_date)
// reject full ISO datetime strings like "2026-07-13T00:00:00.000Z" under
// strict SQL mode (ER_TRUNCATED_WRONG_VALUE) because of the "T" separator
// and trailing "Z". The frontend date pickers send Date.toISOString(), so
// trim every date-only field down to "YYYY-MM-DD" before it reaches a
// query. Also normalizes "" -> null so untouched/collapsed form fields
// (e.g. assignedUser -> sales_rep, which may have an FK to users.id;
// or these same date columns) never get written as empty string.
const DATE_ONLY_FIELDS = ["closureDate", "onboardingDate", "renewalDate"];

const normalizeCustomerPayload = (input) => {
  const data = { ...input };

  for (const key of Object.keys(data)) {
    if (data[key] === "") {
      data[key] = null;
    }
  }

  for (const key of DATE_ONLY_FIELDS) {
    if (data[key] && typeof data[key] === "string") {
      data[key] = data[key].split("T")[0];
    }
  }

  return data;
};

// ─── ACCESS GUARD ──────────────────────────────────────────────────────────────
// 🔒 DEMO SCOPING: customers are owned via the assigned_to column (this is
// what your existing GET / list already scoped non-admins by — we're just
// applying it consistently everywhere, and tightening the admin side so
// admin never sees a client created/owned by a demo user).
const ensureCanAccessCustomer = async (req, res, customerId) => {
  return ensureCanAccessRecord({
    pool,
    table: "customers",
    column: "assigned_to",
    recordId: customerId,
    req,
    res,
    notFoundMsg: "Client not found",
  });
};

// ─── Field Map (camelCase → snake_case) ───────────────────────────────────────
// CHANGES: salesRep → assignedUser, renewalDate removed from visible columns,
//          closureDate + dealValue added

const customerFieldMap = {
  name:                      "name",
  email:                     "email",
  phone:                     "phone",
  company:                   "company",
  businessType:              "business_type",
  address:                   "address",
  city:                      "city",
  state:                     "state",
  zipCode:                   "zip_code",
  country:                   "country",
  status:                    "status",
  source:                    "source",
  tags:                      "tags",
  notes:                     "notes",
  totalValue:                "total_value",
  whatsappNumber:            "whatsapp_number",
  // CHANGED: salesRep → assignedUser (stored in same sales_rep column for DB compat)
  assignedUser:              "sales_rep",
  onboardingDate:            "onboarding_date",
  service:                   "service",
  // Invoice defaults
  defaultTaxRate:            "default_tax_rate",
  defaultDueDays:            "default_due_days",
  defaultInvoiceNotes:       "default_invoice_notes",
  // Recurring / retainer
  recurringEnabled:          "recurring_enabled",
  recurringInterval:         "recurring_interval",
  recurringAmount:           "recurring_amount",
  recurringService:          "recurring_service",
  renewalDate:               "renewal_date",
  // NEW fields
   closureDate:               "closure_date",          // ✅ NEW — replaces renewal in table
  dealValue:                 "deal_value",             // ✅ NEW — editable deal value column
  paidAmount:                "paid_amount",            // ✅ NEW — Deal Value sub-field: amount paid so far
  expectedAmount:         "expected_amount",         // ✅ NEW — Deal Value sub-field: expected amount to be received
};

// ─── AUTO-INVOICE HELPER ──────────────────────────────────────────────────────

const createAutoInvoice = async (customerId, customer, userId) => {
  try {
    const [lastInvoice] = await pool.execute(
      "SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1"
    );

    const nextNumber =
      lastInvoice.length > 0
        ? parseInt(lastInvoice[0].invoice_number.replace("INV-", ""), 10) + 1
        : 1;

    const invoiceNumber = `INV-${nextNumber.toString().padStart(3, "0")}`;

    const [existing] = await pool.execute(
      "SELECT id FROM invoices WHERE invoice_number = ?",
      sanitizeParams(invoiceNumber)
    );
    if (existing.length > 0) {
      console.warn(`Duplicate invoice number ${invoiceNumber}, skipping`);
      return null;
    }

    const invoiceAmount =
      Number(customer.recurring_amount) ||
      Number(customer.total_value) ||
      0;

    if (invoiceAmount === 0) {
      console.log(`Skipping auto-invoice for ${customerId} — amount is 0`);
      return null;
    }

    const taxRate  = Number(customer.default_tax_rate)  || 18;
    const dueDays  = Number(customer.default_due_days)  || 15;
    const taxAmt   = (invoiceAmount * taxRate) / 100;
    const total    = invoiceAmount + taxAmt;
    const service  = customer.recurring_service || customer.service || "Service Charges";

    const invoiceId = uuidv4();

    await pool.execute(
      `INSERT INTO invoices (
        id, customer_id, invoice_number,
        amount, tax, total,
        status, issue_date, due_date, notes
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?,
        'draft', CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?
      )`,
      sanitizeParams(
        invoiceId, customerId, invoiceNumber,
        invoiceAmount, taxAmt, total,
        dueDays,
        customer.default_invoice_notes ||
          `Auto-generated invoice for ${service}`
      )
    );

    await pool.execute(
      `INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount)
       VALUES (?, ?, ?, 1, ?, ?)`,
      sanitizeParams(uuidv4(), invoiceId, service, invoiceAmount, invoiceAmount)
    );

    console.log(`✅ Auto-created invoice ${invoiceNumber} for customer ${customerId}`);

    return { id: invoiceId, invoiceNumber, amount: invoiceAmount, total, status: "draft" };
  } catch (err) {
    console.error("Auto-invoice creation failed:", err);
    return null;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 🆕 Customer payment ledger (Monthly Payment Tracker)
// ────────────────────────────────────────────────────────────────────────────
// IMPORTANT: these two GET/`/payments`-prefixed routes are registered here,
// BEFORE "GET /:id" further down. Express matches routes in registration
// order, and "/:id" would otherwise treat a request to "/customers/payments"
// as if "payments" were a customer id (matching "/:id" first) and the real
// handler below would never run. Keep any new literal-path routes above the
// "/:id" routes for the same reason.
//
// Requires the customer_payments table — see migration_customer_payments.sql.
// This is purely additive: customers.paid_amount / expected_amount are still
// updated exactly as before, so every existing KPI / column stays accurate.
// This table just adds the dated history behind those running totals.
// ════════════════════════════════════════════════════════════════════════════

// ─── GET /customers/payments — all payment history (Monthly Payment Tracker) ─

router.get("/payments", authenticateToken, async (req, res) => {
  try {
    let where = "WHERE 1=1";
    const params = [];

    // 🔒 DEMO SCOPING — replaces "assigned_to = ? OR assigned_to IS NULL".
    // Demo users no longer fall back to seeing unassigned real payments;
    // admin never sees payments belonging to a demo user's clients.
    {
      const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "assigned_to", "c");
      where += ` AND ${ownerClause}`;
      params.push(...ownerParams);
    }

    const [payments] = await pool.execute(
      `SELECT p.*, COALESCE(c.name, 'Unknown Client') AS customer_name
       FROM customer_payments p
       LEFT JOIN customers c
         ON CONVERT(p.customer_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
          = CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci
       ${where}
       ORDER BY p.payment_date DESC, p.created_at DESC
       LIMIT 1000`,
      sanitizeParams(...params)
    );

    res.json({ payments });
  } catch (err) {
    console.error("Payments fetch error:", err);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

// ─── GET /customers/:id/payments — payment history for one client ───────────

router.get("/:id/payments", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 DEMO SCOPING — verify this client is in the requester's scope before
    // returning its payment history
    const access = await ensureCanAccessCustomer(req, res, id);
    if (!access.ok) return;

    const [payments] = await pool.execute(
      `SELECT * FROM customer_payments
       WHERE CONVERT(customer_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
           = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
       ORDER BY payment_date DESC, created_at DESC`,
      sanitizeParams(id)
    );

    res.json({ payments });
  } catch (err) {
    console.error("Customer payments fetch error:", err);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

// ─── POST /customers/:id/payments — record a dated payment ──────────────────
// Inserts a ledger row AND updates the customer's cumulative paid_amount /
// expected_amount (Due) — the same two fields the Deal Value column already
// reads — so the table/KPI tiles stay accurate without any other change.

router.post(
  "/:id/payments",
  authenticateToken,
  [
    body("amount").notEmpty().isNumeric().withMessage("amount must be a number"),
    body("paymentDate").notEmpty().isISO8601().withMessage("paymentDate must be a valid date"),
    body("notes").optional().isString(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      const { id } = req.params;

      // 🔒 DEMO SCOPING
      const access = await ensureCanAccessCustomer(req, res, id);
      if (!access.ok) return;

      const amount = Number(req.body.amount);
      const { paymentDate, notes } = req.body;

      if (amount <= 0) {
        return res.status(400).json({ error: "amount must be greater than 0" });
      }

      const [existing] = await pool.execute(
        "SELECT id, deal_value, paid_amount FROM customers WHERE id = ?",
        sanitizeParams(id)
      );
      if (!existing.length) {
        return res.status(404).json({ error: "Client not found" });
      }

      const customer = existing[0];
      if (customer.deal_value == null) {
        return res.status(400).json({ error: "Set a total deal value before recording a payment" });
      }

      const newPaid = Number(customer.paid_amount || 0) + amount;
      if (newPaid > Number(customer.deal_value)) {
        return res.status(400).json({ error: "This payment would exceed the total deal value" });
      }
      const newDue = Math.max(Number(customer.deal_value) - newPaid, 0);

      const paymentId = uuidv4();

      await pool.execute(
        `INSERT INTO customer_payments (id, customer_id, amount, payment_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sanitizeParams(paymentId, id, amount, paymentDate, notes || null, req.user.id)
      );

      await pool.execute(
        `UPDATE customers SET paid_amount = ?, expected_amount = ?, updated_at = NOW() WHERE id = ?`,
        sanitizeParams(newPaid, newDue, id)
      );

      const [[updatedCustomer]] = await pool.execute(
        `SELECT c.*, u.name AS assigned_user_name
         FROM customers c LEFT JOIN users u ON c.assigned_to = u.id
         WHERE c.id = ?`,
        sanitizeParams(id)
      );
      updatedCustomer.tags = parseTags(updatedCustomer.tags);

      const [[payment]] = await pool.execute(
        "SELECT * FROM customer_payments WHERE id = ?",
        sanitizeParams(paymentId)
      );

      res.status(201).json({
        message: "Payment recorded",
        payment,
        customer: updatedCustomer,
      });
    } catch (err) {
      console.error("Add payment error:", err);
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.status(500).json({ error: "customer_payments table doesn't exist — run migration_customer_payments.sql first" });
      }
      res.status(500).json({ error: "Failed to record payment" });
    }
  }
);

// ─── DELETE /customers/:id/payments/:paymentId — remove a payment record ────
// Also rolls back the customer's cumulative paid_amount / expected_amount by
// the same amount, so the running totals stay in sync with the ledger.

router.delete("/:id/payments/:paymentId", authenticateToken, async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    // 🔒 DEMO SCOPING
    const access = await ensureCanAccessCustomer(req, res, id);
    if (!access.ok) return;

    const [rows] = await pool.execute(
      "SELECT amount FROM customer_payments WHERE id = ? AND customer_id = ?",
      sanitizeParams(paymentId, id)
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Payment record not found" });
    }
    const amount = Number(rows[0].amount);

    const [[customer]] = await pool.execute(
      "SELECT deal_value, paid_amount FROM customers WHERE id = ?",
      sanitizeParams(id)
    );

    const newPaid = Math.max(Number(customer.paid_amount || 0) - amount, 0);
    const newDue  = customer.deal_value != null ? Math.max(Number(customer.deal_value) - newPaid, 0) : null;

    await pool.execute("DELETE FROM customer_payments WHERE id = ?", sanitizeParams(paymentId));
    await pool.execute(
      "UPDATE customers SET paid_amount = ?, expected_amount = ?, updated_at = NOW() WHERE id = ?",
      sanitizeParams(newPaid, newDue, id)
    );

    res.json({ message: "Payment removed", id: paymentId });
  } catch (err) {
    console.error("Delete payment error:", err);
    res.status(500).json({ error: "Failed to remove payment" });
  }
});

// ─── GET /customers ───────────────────────────────────────────────────────────

router.get(
  "/",
  authenticateToken,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("status").optional().isIn(["active", "inactive", "prospect"]),
    query("service").optional().isString(),
    query("assignedTo").optional().isString(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const { search, status, service, assignedTo } = req.query;

      let where = "WHERE 1=1";
      const params = [];

      // 🔒 DEMO SCOPING — replaces the old plain
      //   "c.assigned_to = ?" (non-admin) / optional filter (admin) rule.
      // Demo users only ever see clients they created; admin never sees a
      // client owned by a demo user. Admin's optional ?assignedTo= filter
      // still works as before, layered on top of the base scope.
      {
        const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "assigned_to", "c");
        where += ` AND ${ownerClause}`;
        params.push(...ownerParams);
      }
      if (req.user.role === "admin" && assignedTo) {
        where += " AND c.assigned_to = ?";
        params.push(assignedTo);
      }

      if (search) {
        where += " AND (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ? OR c.phone LIKE ?)";
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }

      if (status)  { where += " AND c.status = ?";  params.push(status);  }
      if (service) { where += " AND c.service = ?"; params.push(service); }

      const [customers] = await pool.execute(
        `SELECT c.*, u.name AS assigned_user_name
         FROM customers c
         LEFT JOIN users u ON c.assigned_to = u.id
         ${where}
         ORDER BY c.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        sanitizeParams(...params)
      );

      const [[{ total }]] = await pool.execute(
        `SELECT COUNT(*) AS total FROM customers c ${where}`,
        sanitizeParams(...params)
      );

      res.json({
        customers: customers.map((c) => ({ ...c, tags: parseTags(c.tags) })),
        pagination: {
          page, limit, total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      console.error("Customers fetch error:", err);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  }
);

// ─── GET /customers/:id ───────────────────────────────────────────────────────

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 DEMO SCOPING — this route previously had NO role check at all
    const access = await ensureCanAccessCustomer(req, res, id);
    if (!access.ok) return;

    const [customers] = await pool.execute(
      `SELECT c.*, u.name AS assigned_user_name
       FROM customers c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = ?`,
      sanitizeParams(id)
    );

    if (!customers.length) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = { ...customers[0], tags: parseTags(customers[0].tags) };

    const [deals] = await pool.execute(
      "SELECT id, title, value, stage, probability FROM deals WHERE customer_id = ?",
      sanitizeParams(id)
    );

    const [invoices] = await pool.execute(
      `SELECT id, invoice_number, amount, tax, total, status, issue_date, due_date
       FROM invoices WHERE customer_id = ? ORDER BY created_at DESC`,
      sanitizeParams(id)
    );

    const [tasks] = await pool.execute(
      `SELECT id, title, type, status, due_date FROM tasks
       WHERE related_type = 'customer' AND related_id = ?`,
      sanitizeParams(id)
    );

    res.json({ customer, related: { deals, invoices, tasks } });
  } catch (err) {
    console.error("Customer fetch error:", err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// ─── POST /customers ──────────────────────────────────────────────────────────

router.post(
  "/",
  authenticateToken,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").optional({ checkFalsy: true }).isEmail().withMessage("Valid email required"),
    body("phone").notEmpty().withMessage("Phone is required"),
    body("company").optional().isString(),
    body("businessType").optional().isString(),
    body("address").optional().isString(),
    body("city").optional().isString(),
    body("state").optional().isString(),
    body("zipCode").optional().isString(),
    body("country").optional().isString(),
    body("status").optional().isIn(["active", "inactive", "prospect"]),
    body("source").optional().isString(),
    body("tags").optional(),
    body("notes").optional().isString(),
    body("totalValue").optional().isNumeric(),
    body("whatsappNumber").optional().isString(),
    body("assignedUser").optional().isString(),       // ✅ CHANGED from salesRep
    body("onboardingDate").optional({ checkFalsy: true }).isISO8601(),
    body("service").optional().isString(),
    body("defaultTaxRate").optional().isNumeric(),
    body("defaultDueDays").optional().isInt(),
    body("defaultInvoiceNotes").optional().isString(),
    body("recurringEnabled").optional().isBoolean(),
    body("recurringInterval").optional().isIn(["weekly", "monthly", "quarterly", "yearly"]),
    body("recurringAmount").optional().isNumeric(),
    body("recurringService").optional().isString(),
    body("renewalDate").optional({ checkFalsy: true }).isISO8601(),
    body("closureDate").optional({ checkFalsy: true }).isISO8601(),       // ✅ NEW
    body("dealValue").optional().isNumeric(),          // ✅ NEW
    body("paidAmount").optional().isNumeric(),         // ✅ NEW
    body("expectedAmount").optional().isNumeric(),     // ✅ NEW
    body("leadId").optional().isString(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

  
      const body_ = normalizeCustomerPayload(req.body);

      const {
        name, email, phone, company, businessType,
        address, city, state, zipCode, country,
        status = "prospect", source, tags = [], notes,
        totalValue, whatsappNumber, assignedUser, onboardingDate,
        service,
        defaultTaxRate, defaultDueDays, defaultInvoiceNotes,
        recurringEnabled, recurringInterval, recurringAmount,
        recurringService, renewalDate,
        closureDate, dealValue,                        // ✅ NEW
        leadId,
      } = body_;

   
      const assignedTo = req.user.id;
      const id = uuidv4();

      let resolvedService = service;
      let resolvedNotes   = notes;
      if (leadId && !resolvedService) {
        const [lead] = await pool.execute(
          "SELECT service FROM leads WHERE id = ?",
          sanitizeParams(leadId)
        );
        if (lead.length > 0 && lead[0].service) {
          resolvedService = lead[0].service;
          resolvedNotes = resolvedNotes
            ? `${resolvedNotes}\n\n[From Lead] Service: ${resolvedService}`
            : `[From Lead] Service: ${resolvedService}`;
        }
      }

      if (email) {
        const [existing] = await pool.execute(
          "SELECT id FROM customers WHERE email = ?",
          sanitizeParams(email)
        );
        if (existing.length > 0) {
          return res.status(400).json({ error: "A client with this email already exists" });
        }
      }

      // NOTE: Run this migration on your DB if closure_date / deal_value columns don't exist:
      // ALTER TABLE customers
      //   ADD COLUMN closure_date DATE NULL,
      //   ADD COLUMN deal_value DECIMAL(15,2) NULL;
      await pool.execute(
        `INSERT INTO customers (
          id, name, email, phone, company, business_type,
          address, city, state, zip_code, country,
          status, source, assigned_to, tags, notes,
          total_value, whatsapp_number,
          sales_rep, onboarding_date,
          service,
          default_tax_rate, default_due_days, default_invoice_notes,
          recurring_enabled, recurring_interval, recurring_amount,
          recurring_service, renewal_date,
          closure_date, deal_value
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?
        )`,
        sanitizeParams(
          id, name, email || null, phone, company || null, businessType || null,
          address || null, city || null, state || null, zipCode || null, country || "India",
          status, source || null, assignedTo, JSON.stringify(tags), resolvedNotes || null,
          totalValue != null ? Number(totalValue) : 0,
          whatsappNumber || null,
          assignedUser || null, onboardingDate || null,  // ✅ assignedUser → sales_rep column
          resolvedService || null,
          defaultTaxRate != null ? Number(defaultTaxRate) : 18,
          defaultDueDays != null ? Number(defaultDueDays) : 15,
          defaultInvoiceNotes || null,
          recurringEnabled ? 1 : 0,
          recurringInterval || "monthly",
          recurringAmount != null && recurringAmount !== "" ? Number(recurringAmount) : null,
          recurringService || null,
          renewalDate || null,
          closureDate || null,                           // ✅ NEW
          dealValue != null && dealValue !== "" ? Number(dealValue) : null  // ✅ NEW
        )
      );

      if (leadId) {
        await pool.execute(
          `UPDATE leads SET status = 'converted', converted_customer_id = ?, updated_at = NOW()
           WHERE id = ?`,
          sanitizeParams(id, leadId)
        );
      }

      const [[customer]] = await pool.execute(
        `SELECT c.*, u.name AS assigned_user_name
         FROM customers c LEFT JOIN users u ON c.assigned_to = u.id
         WHERE c.id = ?`,
        sanitizeParams(id)
      );
      customer.tags = parseTags(customer.tags);

      const autoInvoice = await createAutoInvoice(id, customer, req.user.id);

      res.status(201).json({
        message: `Client created successfully${leadId ? " from lead" : ""}`,
        customer,
        invoice: autoInvoice,
      });
    } catch (err) {
      console.error("Customer creation error:", err);
      res.status(500).json({
        error: "Failed to create client",
        ...(process.env.NODE_ENV !== "production" ? { detail: err.message, code: err.code } : {}),
      });
    }
  }
);

// ─── PUT /customers/:id ───────────────────────────────────────────────────────

router.put(
  "/:id",
  authenticateToken,
  [
    body("name").optional().trim().notEmpty(),
    body("email").optional({ checkFalsy: true }).isEmail(),
    body("phone").optional().isString(),
    body("company").optional().isString(),
    body("businessType").optional().isString(),
    body("address").optional().isString(),
    body("city").optional().isString(),
    body("state").optional().isString(),
    body("zipCode").optional().isString(),
    body("country").optional().isString(),
    body("status").optional().isIn(["active", "inactive", "prospect"]),
    body("source").optional().isString(),
    body("tags").optional(),
    body("notes").optional().isString(),
    body("totalValue").optional().isNumeric(),
    body("whatsappNumber").optional().isString(),
    body("assignedUser").optional().isString(),       // ✅ CHANGED from salesRep
    body("onboardingDate").optional({ checkFalsy: true }).isISO8601(),
    body("service").optional().isString(),
    body("defaultTaxRate").optional().isNumeric(),
    body("defaultDueDays").optional().isInt(),
    body("defaultInvoiceNotes").optional().isString(),
    body("recurringEnabled").optional().isBoolean(),
    body("recurringInterval").optional().isIn(["weekly", "monthly", "quarterly", "yearly"]),
    body("recurringAmount").optional().isNumeric(),
    body("recurringService").optional().isString(),
    body("renewalDate").optional({ checkFalsy: true }).isISO8601(),
    body("closureDate").optional({ checkFalsy: true }).isISO8601(),       // ✅ NEW
    body("dealValue").optional().isNumeric(),          // ✅ NEW
    body("paidAmount").optional().isNumeric(),         // ✅ NEW
    body("expectedAmount").optional().isNumeric(),     // ✅ NEW

  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      const { id } = req.params;

      // 🔒 DEMO SCOPING — this route previously had NO role check at all
      const access = await ensureCanAccessCustomer(req, res, id);
      if (!access.ok) return;

      const [existing] = await pool.execute(
        "SELECT id FROM customers WHERE id = ?",
        sanitizeParams(id)
      );
      if (!existing.length) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (req.body.email) {
        const [emailCheck] = await pool.execute(
          "SELECT id FROM customers WHERE email = ? AND id != ?",
          sanitizeParams(req.body.email, id)
        );
        if (emailCheck.length > 0) {
          return res.status(400).json({ error: "Email already used by another client" });
        }
      }

     
      const updateData = normalizeCustomerPayload(req.body);

      if ("totalValue"       in updateData) updateData.totalValue       = updateData.totalValue       !== null ? Number(updateData.totalValue)       : 0;
      if ("recurringEnabled" in updateData) updateData.recurringEnabled = updateData.recurringEnabled ? 1 : 0;
      if ("recurringAmount"  in updateData) updateData.recurringAmount  = updateData.recurringAmount  !== null ? Number(updateData.recurringAmount)  : null;
      if ("defaultTaxRate"   in updateData) updateData.defaultTaxRate   = updateData.defaultTaxRate   !== null ? Number(updateData.defaultTaxRate)   : null;
      if ("defaultDueDays"   in updateData) updateData.defaultDueDays   = updateData.defaultDueDays   !== null ? Number(updateData.defaultDueDays)   : null;
      if ("dealValue"        in updateData) updateData.dealValue        = updateData.dealValue        !== null ? Number(updateData.dealValue)        : null;
      if ("paidAmount"       in updateData) updateData.paidAmount       = updateData.paidAmount       !== null ? Number(updateData.paidAmount)       : null;       // ✅ this is the actual bug fix
      if ("expectedAmount"   in updateData) updateData.expectedAmount   = updateData.expectedAmount   !== null ? Number(updateData.expectedAmount)   : null; // ✅ this is the actual bug fix

      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (value === undefined) continue;
        const col = customerFieldMap[key];
        if (!col) continue;
        fields.push(`${col} = ?`);
        values.push(key === "tags" ? JSON.stringify(value) : value);
      }

      if (!fields.length) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      values.push(id);
      await pool.execute(
        `UPDATE customers SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
        sanitizeParams(...values)
      );

      const [[customer]] = await pool.execute(
        `SELECT c.*, u.name AS assigned_user_name
         FROM customers c LEFT JOIN users u ON c.assigned_to = u.id
         WHERE c.id = ?`,
        sanitizeParams(id)
      );
      customer.tags = parseTags(customer.tags);

      res.json({ message: "Client updated successfully", customer });
    } catch (err) {
      console.error("Customer update error:", err);
      res.status(500).json({
        error: "Failed to update client",
        ...(process.env.NODE_ENV !== "production" ? { detail: err.message, code: err.code } : {}),
      });
    }
  }
);

// ─── PATCH /customers/:id/deal-value ─────────────────────────────────────────
// Dedicated lightweight endpoint for inline deal-value editing from the table

router.patch(
  "/:id/deal-value",
  authenticateToken,
  [body("dealValue").notEmpty().isNumeric().withMessage("dealValue must be a number")],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const { id } = req.params;

      // 🔒 DEMO SCOPING — this route previously had NO role check at all
      const access = await ensureCanAccessCustomer(req, res, id);
      if (!access.ok) return;

      const dealValue = Number(req.body.dealValue);

      const [existing] = await pool.execute(
        "SELECT id FROM customers WHERE id = ?",
        sanitizeParams(id)
      );
      if (!existing.length) return res.status(404).json({ error: "Client not found" });

      await pool.execute(
        "UPDATE customers SET deal_value = ?, updated_at = NOW() WHERE id = ?",
        sanitizeParams(dealValue, id)
      );

      res.json({ message: "Deal value updated", id, dealValue });
    } catch (err) {
      console.error("Deal value update error:", err);
      res.status(500).json({ error: "Failed to update deal value" });
    }
  }
);

// ─── DELETE /customers/:id ────────────────────────────────────────────────────

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 DEMO SCOPING — this route previously had NO role check at all
    const access = await ensureCanAccessCustomer(req, res, id);
    if (!access.ok) return;

    const [existing] = await pool.execute(
      "SELECT id FROM customers WHERE id = ?",
      sanitizeParams(id)
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Client not found" });
    }

    const [[{ deals }]]    = await pool.execute("SELECT COUNT(*) AS deals FROM deals WHERE customer_id = ?",    sanitizeParams(id));
    const [[{ invoices }]] = await pool.execute("SELECT COUNT(*) AS invoices FROM invoices WHERE customer_id = ?", sanitizeParams(id));

    if (deals > 0 || invoices > 0) {
      return res.status(400).json({
        error: "Cannot delete client with existing deals or invoices",
        details: { deals, invoices },
      });
    }

    await pool.execute("DELETE FROM customers WHERE id = ?", sanitizeParams(id));

    res.json({ message: "Client deleted successfully", id });
  } catch (err) {
    console.error("Customer deletion error:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// ─── POST /customers/:id/move-to-lead ────────────────────────────────────────

router.post("/:id/move-to-lead", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 DEMO SCOPING — this route previously had NO role check at all
    const access = await ensureCanAccessCustomer(req, res, id);
    if (!access.ok) return;

    const [customers] = await pool.execute(
      "SELECT * FROM customers WHERE id = ?",
      sanitizeParams(id)
    );
    if (!customers.length) {
      return res.status(404).json({ error: "Client not found" });
    }

    const c      = customers[0];
    const leadId = uuidv4();

    await pool.execute(
      `INSERT INTO leads (
        id, name, email, phone, company, source, status, priority,
        assigned_to, estimated_value, notes, whatsapp_number, service
      ) VALUES (?, ?, ?, ?, ?, ?, 'new', 'medium', ?, ?, ?, ?, ?)`,
      sanitizeParams(
        leadId,
        c.name, c.email, c.phone, c.company,
        c.source || "manual",
        c.assigned_to,
        c.total_value || 0,
        (c.notes || "") + "\n\n[Restored from client]",
        c.whatsapp_number,
        c.service || null
      )
    );

    await pool.execute(
      "UPDATE customers SET status = 'inactive', updated_at = NOW() WHERE id = ?",
      sanitizeParams(id)
    );

    await pool.execute(
      `UPDATE tasks SET related_type = 'lead', related_id = ?
       WHERE related_type = 'customer' AND related_id = ?`,
      sanitizeParams(leadId, id)
    );

    res.json({ message: "Client moved back to leads successfully", leadId });
  } catch (err) {
    console.error("Move to lead error:", err);
    res.status(500).json({ error: "Failed to move client to leads" });
  }
});

module.exports = router;