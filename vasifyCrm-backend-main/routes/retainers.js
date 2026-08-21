


const express = require("express");
const { body, validationResult, query } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const { getOwnershipClause, ensureCanAccessRecord } = require("../utils/demoScope"); // 🔒 NEW

const router = express.Router();

// ─── SOW §2.5 + §2.6: CONFIG ─────────────────────────────────────────────────

const RETAINER_STATUSES = ["active", "inactive", "expired"];

const RETAINER_SERVICES = [
  "whatsapp", "website", "digital_marketing", "crm",
  "lms", "mobile_app", "admin_panel", "devops", "social-media", "other",
];

const PAYMENT_STATUSES = ["paid", "pending", "partial"];
const PAYMENT_MODES    = ["upi", "bank_transfer", "cash"];

const RENEWAL_WARN_DAYS  = 30;
const RENEWAL_ALERT_DAYS = 7;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

// ─── ACCESS GUARD ──────────────────────────────────────────────────────────────
// 🔒 DEMO SCOPING: retainers are owned via created_by (already set correctly
// at creation time — see POST / below). This file previously had NO
// role-based filtering anywhere, so every route below gets this guard or
// the equivalent list-query scoping added.
const ensureCanAccessRetainer = async (req, res, retainerId) => {
  return ensureCanAccessRecord({
    pool,
    table: "retainers",
    column: "created_by",
    recordId: retainerId,
    req,
    res,
    notFoundMsg: "Retainer not found",
  });
};

// camelCase → snake_case field map for retainers
const retainerFieldMap = {
  clientName:      "client_name",
  client_name:     "client_name",
  service:         "service",
  monthlyAmount:   "monthly_amount",
  monthly_amount:  "monthly_amount",
  startDate:       "start_date",
  start_date:      "start_date",
  renewalDate:     "renewal_date",
  renewal_date:    "renewal_date",
  status:          "status",
  phone:           "phone",
  whatsappNumber:  "whatsapp_number",
  whatsapp_number: "whatsapp_number",
  notes:           "notes",
  customerId:      "customer_id",
  customer_id:     "customer_id",
};

// =============================================================================
// MIGRATION SQL — run once
// =============================================================================
//
// -- SOW §2.5: Retainer clients table
// CREATE TABLE IF NOT EXISTS retainers (
//   id               VARCHAR(36)    NOT NULL PRIMARY KEY,
//   client_name      VARCHAR(255)   NOT NULL,
//   customer_id      VARCHAR(36)    DEFAULT NULL,
//   service          VARCHAR(100)   NOT NULL,
//   monthly_amount   DECIMAL(12,2)  NOT NULL DEFAULT 0,
//   start_date       DATE           NOT NULL,
//   renewal_date     DATE           NOT NULL,
//   status           ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
//   phone            VARCHAR(30)    DEFAULT NULL,
//   whatsapp_number  VARCHAR(30)    DEFAULT NULL,
//   notes            TEXT           DEFAULT NULL,
//   created_by       VARCHAR(36)    DEFAULT NULL,
//   created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   INDEX idx_status        (status),
//   INDEX idx_renewal_date  (renewal_date),
//   INDEX idx_client_name   (client_name),
//   INDEX idx_customer_id   (customer_id)
// );
//
// -- SOW §2.6: Monthly retainer payment tracking table
// CREATE TABLE IF NOT EXISTS retainer_payments (
//   id               VARCHAR(36)    NOT NULL PRIMARY KEY,
//   retainer_id      VARCHAR(36)    NOT NULL,
//   payment_month    DATE           NOT NULL,
//   expected_amount  DECIMAL(12,2)  NOT NULL DEFAULT 0,
//   received_amount  DECIMAL(12,2)  NOT NULL DEFAULT 0,
//   payment_status   ENUM('paid','pending','partial') NOT NULL DEFAULT 'pending',
//   payment_date     DATE           DEFAULT NULL,
//   payment_mode     ENUM('upi','bank_transfer','cash') DEFAULT NULL,
//   remarks          TEXT           DEFAULT NULL,
//   recorded_by      VARCHAR(36)    DEFAULT NULL,
//   created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   UNIQUE KEY uq_retainer_month (retainer_id, payment_month),
//   CONSTRAINT fk_rp_retainer FOREIGN KEY (retainer_id) REFERENCES retainers(id) ON DELETE CASCADE,
//   INDEX idx_rp_month        (payment_month),
//   INDEX idx_rp_status       (payment_status),
//   INDEX idx_rp_retainer_id  (retainer_id)
// );

// =============================================================================
// ROUTE ORDER (critical — Express matches top-to-bottom):
//
//   GET  /                      getAll
//   GET  /stats                 stats
//   GET  /export                CSV export
//   GET  /payments/summary      monthly summary   ← MUST be before /:id
//   GET  /payments/export       monthly CSV       ← MUST be before /:id
//   GET  /:id                   getById
//   POST /                      create
//   PUT  /:id                   update
//   PATCH/:id                   patch
//   POST /:id/renew             renew
//   DELETE /:id                 delete
//   GET  /:id/payments          getPayments
//   POST /:id/payments          createPayment
//   PUT  /:id/payments/:pid     updatePayment
// =============================================================================

// =============================================================================
// SOW §2.5: GET ALL RETAINERS
// =============================================================================

router.get(
  "/",
  authenticateToken,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("phone").optional().isString(),
    query("status").optional().isIn([...RETAINER_STATUSES, "all"]),
    query("service").optional().isIn([...RETAINER_SERVICES, "all"]),
    query("renewalFilter").optional().isIn(["all", "expired", "this-week", "this-month", "upcoming"]),
    query("dateSort").optional().isIn(["soonest", "latest", "amount-high", "amount-low", "newest"]),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      const pageRaw  = parseInt(req.query.page,  10);
      const limitRaw = parseInt(req.query.limit, 10);
      const page  = !isNaN(pageRaw)  && pageRaw  > 0 ? pageRaw  : 1;
      const limit = !isNaN(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 10;
      const offset = (page - 1) * limit;

      const {
        search,
        phone:         phoneSearch,
        status,
        service,
        renewalFilter = "all",
        dateSort      = "soonest",
      } = req.query;

      let whereClause = "WHERE 1=1";
      const queryParams = [];

      // 🔒 DEMO SCOPING — this route previously had NO role filtering at all.
      // Demo users now only see retainers they created; admin never sees a
      // retainer created by a demo user.
      {
        const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "created_by", "r");
        whereClause += ` AND ${ownerClause}`;
        queryParams.push(...ownerParams);
      }

      if (search) {
        whereClause += " AND r.client_name LIKE ?";
        queryParams.push(`%${search}%`);
      }
      if (phoneSearch) {
        whereClause += " AND (r.phone LIKE ? OR r.whatsapp_number LIKE ?)";
        queryParams.push(`%${phoneSearch}%`, `%${phoneSearch}%`);
      }
      if (status && status !== "all") {
        whereClause += " AND r.status = ?";
        queryParams.push(status);
      }
      if (service && service !== "all") {
        whereClause += " AND r.service = ?";
        queryParams.push(service);
      }
      if (renewalFilter !== "all") {
        if (renewalFilter === "expired") {
          whereClause += " AND r.renewal_date < CURDATE()";
        } else if (renewalFilter === "this-week") {
          whereClause += " AND r.renewal_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)";
        } else if (renewalFilter === "this-month" || renewalFilter === "upcoming") {
          whereClause += " AND r.renewal_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
        }
      }

      let orderClause;
      switch (dateSort) {
        case "latest":      orderClause = "r.renewal_date DESC";   break;
        case "amount-high": orderClause = "r.monthly_amount DESC"; break;
        case "amount-low":  orderClause = "r.monthly_amount ASC";  break;
        case "newest":      orderClause = "r.created_at DESC";     break;
        default:            orderClause = "r.renewal_date ASC";    break;
      }

      const [retainers] = await pool.execute(
        `SELECT
           r.*,
           u.name AS created_by_name,
           DATEDIFF(r.renewal_date, CURDATE()) AS days_to_renewal
         FROM retainers r
         LEFT JOIN users u ON r.created_by = u.id
         ${whereClause}
         ORDER BY ${orderClause}
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        sanitizeParams(...queryParams)
      );

      const [countResult] = await pool.execute(
        `SELECT COUNT(*) AS total FROM retainers r ${whereClause}`,
        sanitizeParams(...queryParams)
      );

      const total      = countResult[0]?.total || 0;
      const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

      res.json({
        retainers,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      });
    } catch (error) {
      console.error("Retainers fetch error:", error);
      res.status(500).json({ error: "Failed to fetch retainers" });
    }
  }
);

// =============================================================================
// SOW §2.5 + §2.8: RETAINER STATS
// Registered before /:id to prevent param clash.
// =============================================================================

router.get("/stats", authenticateToken, async (req, res) => {
  try {
    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all,
    // across all four queries below (main stats, service breakdown,
    // upcoming renewals, MRR trend).
    const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "created_by");

    const [rows] = await pool.execute(
      `SELECT
         COUNT(*)                                                                   AS totalRetainers,
         SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END)                     AS activeCount,
         SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END)                     AS inactiveCount,
         SUM(CASE WHEN status = 'expired'  THEN 1 ELSE 0 END)                     AS expiredCount,
         COALESCE(SUM(CASE WHEN status = 'active' THEN monthly_amount ELSE 0 END), 0) AS mrr,
         SUM(CASE WHEN status = 'active'
                   AND renewal_date BETWEEN CURDATE()
                   AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
              THEN 1 ELSE 0 END)                                                   AS renewingAlert,
         SUM(CASE WHEN status = 'active'
                   AND renewal_date BETWEEN CURDATE()
                   AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
              THEN 1 ELSE 0 END)                                                   AS renewingWarn,
         SUM(CASE WHEN status = 'active' AND renewal_date < CURDATE()
              THEN 1 ELSE 0 END)                                                   AS overdueRenewals
       FROM retainers
       WHERE ${ownerClause}`,
      sanitizeParams(RENEWAL_ALERT_DAYS, RENEWAL_WARN_DAYS, ...ownerParams)
    );

    const [serviceBreakdown] = await pool.execute(
      `SELECT service, COUNT(*) AS count, SUM(monthly_amount) AS revenue
       FROM retainers WHERE status = 'active' AND ${ownerClause}
       GROUP BY service ORDER BY revenue DESC`,
      sanitizeParams(...ownerParams)
    );

    const [upcomingRenewals] = await pool.execute(
      `SELECT id, client_name, service, monthly_amount, renewal_date,
              DATEDIFF(renewal_date, CURDATE()) AS days_until_renewal
       FROM retainers
       WHERE status = 'active'
         AND renewal_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         AND ${ownerClause}
       ORDER BY renewal_date ASC LIMIT 10`,
      sanitizeParams(RENEWAL_WARN_DAYS, ...ownerParams)
    );

    const [mrrTrend] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS month,
         SUM(monthly_amount)              AS mrr,
         COUNT(*)                         AS newRetainers
       FROM retainers
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         AND ${ownerClause}
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`,
      sanitizeParams(...ownerParams)
    );

    res.json({ stats: rows[0] || {}, serviceBreakdown, upcomingRenewals, mrrTrend });
  } catch (error) {
    console.error("Retainer stats error:", error);
    res.status(500).json({ error: "Failed to fetch retainer stats" });
  }
});

// =============================================================================
// SOW §2.8: EXPORT RETAINERS AS CSV
// Registered before /:id to prevent param clash.
// =============================================================================

router.get("/export", authenticateToken, async (req, res) => {
  try {
    const { status, service } = req.query;

    let whereClause = "WHERE 1=1";
    const queryParams = [];

    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
    {
      const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "created_by", "r");
      whereClause += ` AND ${ownerClause}`;
      queryParams.push(...ownerParams);
    }

    if (status && status !== "all") {
      whereClause += " AND r.status = ?";
      queryParams.push(status);
    }
    if (service && service !== "all") {
      whereClause += " AND r.service = ?";
      queryParams.push(service);
    }

    const [retainers] = await pool.execute(
      `SELECT
         r.client_name      AS "Client Name",
         r.service          AS "Service",
         r.monthly_amount   AS "Monthly Amount (₹)",
         r.start_date       AS "Start Date",
         r.renewal_date     AS "Renewal Date",
         DATEDIFF(r.renewal_date, CURDATE()) AS "Days to Renewal",
         r.status           AS "Status",
         r.phone            AS "Phone",
         r.whatsapp_number  AS "WhatsApp",
         r.notes            AS "Notes",
         r.created_at       AS "Created At"
       FROM retainers r
       ${whereClause}
       ORDER BY r.renewal_date ASC`,
      sanitizeParams(...queryParams)
    );

    if (!retainers.length) {
      return res.status(404).json({ error: "No retainers found to export" });
    }

    const headers = Object.keys(retainers[0]);
    const csvRows = [
      headers.join(","),
      ...retainers.map((row) =>
        headers
          .map((h) => {
            const val = row[h] ?? "";
            const str = String(val).replace(/"/g, '""');
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str}"`
              : str;
          })
          .join(",")
      ),
    ];

    const csv      = csvRows.join("\n");
    const filename = `retainers-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Retainer export error:", error);
    res.status(500).json({ error: "Failed to export retainers" });
  }
});

// =============================================================================
// SOW §2.6: MONTHLY SUMMARY — all retainers for a given month
// FIX: moved BEFORE /:id — without this Express matches "payments" as :id
//      and returns 404 instead of running this handler.
// =============================================================================

router.get("/payments/summary", authenticateToken, async (req, res) => {
  try {
    const { month } = req.query; // e.g. "2026-06" or "2026-06-01"

    let monthStart;
    if (month) {
      monthStart = month.length === 7 ? `${month}-01` : month;
    } else {
      // Default to current month
      const now = new Date();
      monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const safeMonth = safeDate(monthStart);
    if (!safeMonth) return res.status(400).json({ error: "Invalid month" });

    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
    const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "created_by", "r");

    // All active retainers LEFT JOINed with their payment row for this month
    const [rows] = await pool.execute(
      `SELECT
         r.id              AS retainer_id,
         r.client_name,
         r.service,
         r.monthly_amount  AS expected_amount,
         r.phone,
         r.whatsapp_number,
         r.status          AS retainer_status,
         rp.id             AS payment_id,
         rp.payment_month,
         rp.received_amount,
         rp.payment_status,
         rp.payment_date,
         rp.payment_mode,
         rp.remarks
       FROM retainers r
       LEFT JOIN retainer_payments rp
         ON rp.retainer_id = r.id AND rp.payment_month = ?
       WHERE r.status = 'active' AND ${ownerClause}
       ORDER BY r.client_name ASC`,
      sanitizeParams(safeMonth, ...ownerParams)
    );

    const totalExpected = rows.reduce((s, r) => s + Number(r.expected_amount || 0), 0);
    const totalReceived = rows.reduce((s, r) => s + Number(r.received_amount || 0), 0);
    const paidCount     = rows.filter((r) => r.payment_status === "paid").length;
    const pendingCount  = rows.filter((r) => !r.payment_status || r.payment_status === "pending").length;

    res.json({
      month:    safeMonth,
      summary:  { totalExpected, totalReceived, paidCount, pendingCount, total: rows.length },
      retainers: rows,
    });
  } catch (error) {
    console.error("Monthly summary error:", error);
    res.status(500).json({ error: "Failed to fetch monthly summary" });
  }
});

// =============================================================================
// SOW §2.8: EXPORT MONTHLY RETAINER TRACKING AS CSV
// FIX: moved BEFORE /:id — same reason as /payments/summary above.
// =============================================================================

router.get("/payments/export", authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;

    let monthStart;
    if (month) {
      monthStart = month.length === 7 ? `${month}-01` : month;
    } else {
      const now  = new Date();
      monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const safeMonth = safeDate(monthStart);
    if (!safeMonth) return res.status(400).json({ error: "Invalid month" });

    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
    const { clause: ownerClause, params: ownerParams } = getOwnershipClause(req, "created_by", "r");

    const [rows] = await pool.execute(
      `SELECT
         r.client_name                           AS "Client Name",
         r.service                               AS "Service",
         r.monthly_amount                        AS "Expected Amount (₹)",
         COALESCE(rp.received_amount, 0)         AS "Received Amount (₹)",
         COALESCE(rp.payment_status, 'pending')  AS "Payment Status",
         rp.payment_date                         AS "Payment Date",
         rp.payment_mode                         AS "Payment Mode",
         rp.remarks                               AS "Remarks"
       FROM retainers r
       LEFT JOIN retainer_payments rp
         ON rp.retainer_id = r.id AND rp.payment_month = ?
       WHERE r.status = 'active' AND ${ownerClause}
       ORDER BY r.client_name ASC`,
      sanitizeParams(safeMonth, ...ownerParams)
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No records found for this month" });
    }

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"` : str;
        }).join(",")
      ),
    ];

    const filename = `retainer-tracking-${safeMonth}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvRows.join("\n"));
  } catch (error) {
    console.error("Payment export error:", error);
    res.status(500).json({ error: "Failed to export payment tracking" });
  }
});

// =============================================================================
// SOW §2.5: GET RETAINER BY ID
// Placed AFTER all /stats, /export, /payments/* fixed routes.
// =============================================================================

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
    const access = await ensureCanAccessRetainer(req, res, req.params.id);
    if (!access.ok) return;

    const [retainers] = await pool.execute(
      `SELECT
         r.*,
         u.name AS created_by_name,
         DATEDIFF(r.renewal_date, CURDATE()) AS days_to_renewal
       FROM retainers r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = ?`,
      sanitizeParams(req.params.id)
    );

    if (retainers.length === 0) {
      return res.status(404).json({ error: "Retainer not found" });
    }

    res.json({ retainer: retainers[0] });
  } catch (error) {
    console.error("Retainer fetch error:", error);
    res.status(500).json({ error: "Failed to fetch retainer" });
  }
});

// =============================================================================
// SOW §2.5: CREATE RETAINER
// =============================================================================

router.post(
  "/",
  authenticateToken,
  [
    body("clientName").trim().notEmpty().withMessage("Client name is required"),
    body("service").notEmpty().isIn(RETAINER_SERVICES).withMessage("Valid service is required"),
    body("monthlyAmount").notEmpty().isNumeric().withMessage("Monthly amount is required"),
    body("startDate").notEmpty().isISO8601().withMessage("Valid start date is required"),
    body("renewalDate").notEmpty().isISO8601().withMessage("Valid renewal date is required"),
    body("status").optional().isIn(RETAINER_STATUSES),
    body("customerId").optional().isString(),
    body("phone").optional().isString(),
    body("whatsappNumber").optional().isString(),
    body("notes").optional().isString(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      const {
        clientName,
        service,
        monthlyAmount,
        startDate,
        renewalDate,
        status         = "active",
        customerId     = null,
        phone          = null,
        whatsappNumber = null,
        notes          = null,
      } = req.body;

      const safeAmount = Number(monthlyAmount);
      if (isNaN(safeAmount) || safeAmount < 0) {
        return res.status(400).json({ error: "Monthly amount must be a valid non-negative number" });
      }

      const safeStartDate   = safeDate(startDate);
      const safeRenewalDate = safeDate(renewalDate);
      if (!safeStartDate)   return res.status(400).json({ error: "Invalid start date" });
      if (!safeRenewalDate) return res.status(400).json({ error: "Invalid renewal date" });

      const retainerId = uuidv4();

      // 🔒 DEMO SCOPING: created_by already stamps the correct owner for both
      // admin and demo users — no change needed here, this was already right.
      await pool.execute(
        `INSERT INTO retainers (
           id, client_name, customer_id, service, monthly_amount,
           start_date, renewal_date, status,
           phone, whatsapp_number, notes,
           created_by, created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?, ?,
           ?, ?, ?,
           ?, ?, ?,
           ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )`,
        sanitizeParams(
          retainerId, clientName.trim(), customerId, service, safeAmount,
          safeStartDate, safeRenewalDate, status,
          phone, whatsappNumber, notes,
          req.user.id
        )
      );

      const [retainers] = await pool.execute(
        `SELECT r.*, u.name AS created_by_name,
                DATEDIFF(r.renewal_date, CURDATE()) AS days_to_renewal
         FROM retainers r
         LEFT JOIN users u ON r.created_by = u.id
         WHERE r.id = ?`,
        sanitizeParams(retainerId)
      );

      res.status(201).json({ message: "Retainer created successfully", retainer: retainers[0] });
    } catch (error) {
      console.error("Retainer creation error:", error);
      res.status(500).json({ error: "Failed to create retainer" });
    }
  }
);

// =============================================================================
// SOW §2.5: UPDATE RETAINER (full update)
// =============================================================================

router.put(
  "/:id",
  authenticateToken,
  [
    body("clientName").optional().trim().notEmpty(),
    body("client_name").optional().trim().notEmpty(),
    body("service").optional().isIn(RETAINER_SERVICES),
    body("monthlyAmount").optional().isNumeric(),
    body("monthly_amount").optional().isNumeric(),
    body("startDate").optional().isISO8601(),
    body("start_date").optional().isISO8601(),
    body("renewalDate").optional().isISO8601(),
    body("renewal_date").optional().isISO8601(),
    body("status").optional().isIn(RETAINER_STATUSES),
    body("customerId").optional().isString(),
    body("phone").optional().isString(),
    body("whatsappNumber").optional().isString(),
    body("whatsapp_number").optional().isString(),
    body("notes").optional().isString(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
      const access = await ensureCanAccessRetainer(req, res, req.params.id);
      if (!access.ok) return;

      const [existing] = await pool.execute(
        "SELECT id FROM retainers WHERE id = ?",
        sanitizeParams(req.params.id)
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: "Retainer not found" });
      }

      const updateData = { ...req.body };

      // Normalise camelCase → snake_case
      const aliases = [
        ["clientName",     "client_name"],
        ["monthlyAmount",  "monthly_amount"],
        ["startDate",      "start_date"],
        ["renewalDate",    "renewal_date"],
        ["whatsappNumber", "whatsapp_number"],
        ["customerId",     "customer_id"],
      ];
      for (const [camel, snake] of aliases) {
        if (updateData[camel] !== undefined && updateData[snake] === undefined) {
          updateData[snake] = updateData[camel];
        }
        delete updateData[camel];
      }

      if (updateData.start_date)   updateData.start_date   = safeDate(updateData.start_date);
      if (updateData.renewal_date) updateData.renewal_date = safeDate(updateData.renewal_date);

      if (updateData.monthly_amount !== undefined) {
        const n = Number(updateData.monthly_amount);
        if (isNaN(n) || n < 0) {
          return res.status(400).json({ error: "Monthly amount must be a valid non-negative number" });
        }
        updateData.monthly_amount = n;
      }

      // Auto-activate when renewal date is pushed forward
      if (updateData.renewal_date) {
        const renewalDate = new Date(updateData.renewal_date);
        if (!isNaN(renewalDate.getTime()) && renewalDate > new Date()) {
          if (updateData.status !== "inactive") {
            updateData.status = "active";
          }
        }
      }

      const updateFields = [];
      const updateValues = [];
      const seenDbFields = new Set();

      for (const [key, value] of Object.entries(updateData)) {
        if (value === undefined) continue;
        const dbField = retainerFieldMap[key];
        if (!dbField || seenDbFields.has(dbField)) continue;
        seenDbFields.add(dbField);
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value === "" ? null : value);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      updateValues.push(req.params.id);
      await pool.execute(
        `UPDATE retainers SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        sanitizeParams(...updateValues)
      );

      const [retainers] = await pool.execute(
        `SELECT r.*, u.name AS created_by_name,
                DATEDIFF(r.renewal_date, CURDATE()) AS days_to_renewal
         FROM retainers r
         LEFT JOIN users u ON r.created_by = u.id
         WHERE r.id = ?`,
        sanitizeParams(req.params.id)
      );

      res.json({ message: "Retainer updated successfully", retainer: retainers[0] });
    } catch (error) {
      console.error("Retainer update error:", error);
      res.status(500).json({ error: "Failed to update retainer" });
    }
  }
);

// =============================================================================
// SOW §2.5: PATCH RETAINER — quick partial update (status-only, amount-only)
// =============================================================================

router.patch(
  "/:id",
  authenticateToken,
  [
    body("status").optional().isIn(RETAINER_STATUSES),
    body("monthlyAmount").optional().isNumeric(),
    body("monthly_amount").optional().isNumeric(),
    body("renewalDate").optional().isISO8601(),
    body("renewal_date").optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
      const access = await ensureCanAccessRetainer(req, res, req.params.id);
      if (!access.ok) return;

      const [existing] = await pool.execute(
        "SELECT id FROM retainers WHERE id = ?",
        sanitizeParams(req.params.id)
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: "Retainer not found" });
      }

      const setClauses = [];
      const values     = [];

      if (req.body.status !== undefined) {
        setClauses.push("status = ?");
        values.push(req.body.status);
      }

      const rDate = req.body.renewalDate || req.body.renewal_date;
      if (rDate !== undefined) {
        const safe = safeDate(rDate);
        if (!safe) return res.status(400).json({ error: "Invalid renewal date" });
        setClauses.push("renewal_date = ?");
        values.push(safe);
        // Auto-activate on renewal date extension
        if (!req.body.status && new Date(safe) > new Date()) {
          setClauses.push("status = ?");
          values.push("active");
        }
      }

      const amt = req.body.monthlyAmount ?? req.body.monthly_amount;
      if (amt !== undefined) {
        const n = Number(amt);
        if (isNaN(n) || n < 0) {
          return res.status(400).json({ error: "Monthly amount must be valid" });
        }
        setClauses.push("monthly_amount = ?");
        values.push(n);
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      values.push(req.params.id);
      await pool.execute(
        `UPDATE retainers SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        sanitizeParams(...values)
      );

      const [retainers] = await pool.execute(
        `SELECT r.*, u.name AS created_by_name,
                DATEDIFF(r.renewal_date, CURDATE()) AS days_to_renewal
         FROM retainers r LEFT JOIN users u ON r.created_by = u.id
         WHERE r.id = ?`,
        sanitizeParams(req.params.id)
      );

      res.json({ message: "Retainer updated successfully", retainer: retainers[0] });
    } catch (error) {
      console.error("Retainer patch error:", error);
      res.status(500).json({ error: "Failed to update retainer" });
    }
  }
);

// =============================================================================
// SOW §2.5: RENEW RETAINER — sets new date + forces status = active
// =============================================================================

router.post(
  "/:id/renew",
  authenticateToken,
  [
    body("renewalDate").notEmpty().isISO8601().withMessage("Valid renewal date is required"),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
      const access = await ensureCanAccessRetainer(req, res, req.params.id);
      if (!access.ok) return;

      const [existing] = await pool.execute(
        "SELECT id, client_name FROM retainers WHERE id = ?",
        sanitizeParams(req.params.id)
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: "Retainer not found" });
      }

      const safeRenewalDate = safeDate(req.body.renewalDate);
      if (!safeRenewalDate) {
        return res.status(400).json({ error: "Invalid renewal date" });
      }

      await pool.execute(
        `UPDATE retainers
         SET renewal_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        sanitizeParams(safeRenewalDate, req.params.id)
      );

      const [retainers] = await pool.execute(
        `SELECT r.*, u.name AS created_by_name,
                DATEDIFF(r.renewal_date, CURDATE()) AS days_to_renewal
         FROM retainers r LEFT JOIN users u ON r.created_by = u.id
         WHERE r.id = ?`,
        sanitizeParams(req.params.id)
      );

      res.json({ message: "Retainer renewed successfully", retainer: retainers[0] });
    } catch (error) {
      console.error("Retainer renewal error:", error);
      res.status(500).json({ error: "Failed to renew retainer" });
    }
  }
);

// =============================================================================
// SOW §2.5: DELETE RETAINER
// =============================================================================

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
    const access = await ensureCanAccessRetainer(req, res, req.params.id);
    if (!access.ok) return;

    const [existing] = await pool.execute(
      "SELECT id FROM retainers WHERE id = ?",
      sanitizeParams(req.params.id)
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Retainer not found" });
    }

    await pool.execute("DELETE FROM retainers WHERE id = ?", sanitizeParams(req.params.id));
    res.json({ message: "Retainer deleted successfully" });
  } catch (error) {
    console.error("Retainer deletion error:", error);
    res.status(500).json({ error: "Failed to delete retainer" });
  }
});

// =============================================================================
// SOW §2.6: GET ALL PAYMENTS FOR A RETAINER
// =============================================================================

router.get("/:id/payments", authenticateToken, async (req, res) => {
  try {
    const { month } = req.query; // optional ?month=2026-05

    // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
    const access = await ensureCanAccessRetainer(req, res, req.params.id);
    if (!access.ok) return;

    const [retainer] = await pool.execute(
      "SELECT id, client_name, service, monthly_amount FROM retainers WHERE id = ?",
      sanitizeParams(req.params.id)
    );
    if (retainer.length === 0) {
      return res.status(404).json({ error: "Retainer not found" });
    }

    let sql = `
      SELECT
        rp.*,
        r.client_name,
        r.service,
        r.monthly_amount AS retainer_monthly_amount
      FROM retainer_payments rp
      JOIN retainers r ON r.id = rp.retainer_id
      WHERE rp.retainer_id = ?
    `;
    const params = [req.params.id];

    if (month) {
      const monthStart = month.length === 7 ? `${month}-01` : month;
      sql += " AND rp.payment_month = ?";
      params.push(monthStart);
    }

    sql += " ORDER BY rp.payment_month DESC";

    const [payments] = await pool.execute(sql, sanitizeParams(...params));

    res.json({ retainer: retainer[0], payments });
  } catch (error) {
    console.error("Retainer payments fetch error:", error);
    res.status(500).json({ error: "Failed to fetch retainer payments" });
  }
});

// =============================================================================
// SOW §2.6: CREATE MONTHLY PAYMENT RECORD
// POST /retainers/:id/payments
// Uses ON DUPLICATE KEY UPDATE so calling it twice for the same month is safe.
// =============================================================================

router.post(
  "/:id/payments",
  authenticateToken,
  [
    body("paymentMonth").notEmpty().withMessage("Payment month is required (YYYY-MM or YYYY-MM-DD)"),
    body("expectedAmount").optional().isNumeric(),
    body("receivedAmount").optional().isNumeric(),
    body("paymentStatus").optional().isIn(PAYMENT_STATUSES),
    body("paymentDate").optional().isISO8601(),
    body("paymentMode").optional().isIn(PAYMENT_MODES),
    body("remarks").optional().isString(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      // 🔒 DEMO SCOPING — this route previously had NO role filtering at all
      const access = await ensureCanAccessRetainer(req, res, req.params.id);
      if (!access.ok) return;

      const [retainer] = await pool.execute(
        "SELECT id, monthly_amount FROM retainers WHERE id = ?",
        sanitizeParams(req.params.id)
      );
      if (retainer.length === 0) {
        return res.status(404).json({ error: "Retainer not found" });
      }

      const {
        paymentMonth,
        expectedAmount,
        receivedAmount = 0,
        paymentStatus  = "pending",
        paymentDate    = null,
        paymentMode    = null,
        remarks        = null,
      } = req.body;

      // Normalise month → first day of month
      let monthStart = paymentMonth;
      if (paymentMonth.length === 7) monthStart = `${paymentMonth}-01`;
      const safeMonth = safeDate(monthStart);
      if (!safeMonth) return res.status(400).json({ error: "Invalid payment month" });

      // Use retainer's monthly_amount as expected if not provided
      const safeExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : Number(retainer[0].monthly_amount);
      const safeReceived = Number(receivedAmount);

      const paymentId = uuidv4();

      await pool.execute(
        `INSERT INTO retainer_payments (
           id, retainer_id, payment_month,
           expected_amount, received_amount, payment_status,
           payment_date, payment_mode, remarks,
           recorded_by, created_at, updated_at
         ) VALUES (
           ?, ?, ?,
           ?, ?, ?,
           ?, ?, ?,
           ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )
         ON DUPLICATE KEY UPDATE
           expected_amount = VALUES(expected_amount),
           received_amount = VALUES(received_amount),
           payment_status  = VALUES(payment_status),
           payment_date    = VALUES(payment_date),
           payment_mode    = VALUES(payment_mode),
           remarks         = VALUES(remarks),
           recorded_by     = VALUES(recorded_by),
           updated_at      = CURRENT_TIMESTAMP`,
        sanitizeParams(
          paymentId, req.params.id, safeMonth,
          safeExpected, safeReceived, paymentStatus,
          safeDate(paymentDate), paymentMode, remarks,
          req.user.id
        )
      );

      const [payments] = await pool.execute(
        "SELECT * FROM retainer_payments WHERE retainer_id = ? AND payment_month = ?",
        sanitizeParams(req.params.id, safeMonth)
      );

      res.status(201).json({ message: "Payment record saved", payment: payments[0] });
    } catch (error) {
      console.error("Retainer payment create error:", error);
      res.status(500).json({ error: "Failed to save payment record" });
    }
  }
);

// =============================================================================
// SOW §2.6: UPDATE MONTHLY PAYMENT RECORD
// PUT /retainers/:id/payments/:paymentId
// =============================================================================

router.put(
  "/:id/payments/:paymentId",
  authenticateToken,
  [
    body("receivedAmount").optional().isNumeric(),
    body("paymentStatus").optional().isIn(PAYMENT_STATUSES),
    body("paymentDate").optional().isISO8601(),
    body("paymentMode").optional().isIn(PAYMENT_MODES),
    body("remarks").optional().isString(),
    body("expectedAmount").optional().isNumeric(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;

      // 🔒 DEMO SCOPING — :id here is the retainer id the payment belongs to;
      // this route previously had NO role filtering at all
      const access = await ensureCanAccessRetainer(req, res, req.params.id);
      if (!access.ok) return;

      const [existing] = await pool.execute(
        "SELECT id FROM retainer_payments WHERE id = ? AND retainer_id = ?",
        sanitizeParams(req.params.paymentId, req.params.id)
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      const setClauses = [];
      const values     = [];

      const fieldMap = {
        receivedAmount: "received_amount",
        paymentStatus:  "payment_status",
        paymentMode:    "payment_mode",
        remarks:        "remarks",
        expectedAmount: "expected_amount",
      };

      for (const [camel, snake] of Object.entries(fieldMap)) {
        if (req.body[camel] !== undefined) {
          setClauses.push(`${snake} = ?`);
          const val = ["receivedAmount", "expectedAmount"].includes(camel)
            ? Number(req.body[camel])
            : req.body[camel];
          values.push(val);
        }
      }

      if (req.body.paymentDate !== undefined) {
        setClauses.push("payment_date = ?");
        values.push(safeDate(req.body.paymentDate));
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // param order: [...field values, recorded_by, paymentId]
      values.push(req.params.paymentId);
      await pool.execute(
        `UPDATE retainer_payments
         SET ${setClauses.join(", ")}, recorded_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        sanitizeParams(req.user.id, ...values)
      );

      const [payments] = await pool.execute(
        "SELECT * FROM retainer_payments WHERE id = ?",
        sanitizeParams(req.params.paymentId)
      );

      res.json({ message: "Payment updated successfully", payment: payments[0] });
    } catch (error) {
      console.error("Retainer payment update error:", error);
      res.status(500).json({ error: "Failed to update payment record" });
    }
  }
);

module.exports = router;