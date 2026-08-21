const express = require("express");
const { query, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { getOwnershipClause } = require("../utils/demoScope"); // 🆕 NEW

const router = express.Router();

// =============================================================================
// VALIDATION
// =============================================================================
// `period` was previously parsed with a defensive parseInt() but never run
// through the validation middleware that was already imported. This makes
// it explicit and rejects garbage input (negative numbers, strings, absurd
// ranges) before it reaches a query, instead of silently coercing it.
const periodValidator = query("period")
  .optional()
  .isInt({ min: 1, max: 730 })
  .withMessage("period must be an integer number of days between 1 and 730")
  .toInt();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: "Validation failed", details: errors.array() });
    return true;
  }
  return false;
};

const sanitize = (...params) => params.map((p) => (p === undefined ? null : p));

// =============================================================================
// STATUS CONSTANTS — avoid magic strings scattered across every query
// =============================================================================
const STATUS = {
  INVOICE_PAID: "paid",
  INVOICE_OVERDUE: "overdue",
  INVOICE_PENDING: ["sent", "pending"],
  LEAD_CONVERTED: "converted",
  LEAD_CLOSED_LOST: "closed-lost",
};

// =============================================================================
// DATE WINDOW — bound parameter instead of string interpolation
// =============================================================================
// `INTERVAL ? DAY` is valid prepared-statement syntax in MySQL — the unit
// stays a literal, only the numeric value is bound. This removes any
// reliance on upstream validation to stay injection-safe.
const DATE_FILTER_SQL = "DATE_SUB(NOW(), INTERVAL ? DAY)";
const days = (period) => {
  const n = parseInt(period, 10);
  return Number.isNaN(n) || n <= 0 ? 30 : n;
};

// =============================================================================
// ROLE / OWNERSHIP SCOPE
// =============================================================================
// 🔒 REPLACED — the previous local `roleFilter` had two bugs that together
// meant per-rep scoping never actually worked and could leak data between
// accounts:
//
//   1. It read `req.user.userId`, which is never set anywhere in this
//      codebase — every JWT payload and every other route file uses
//      `req.user.id` (see signToken() in auth.js). This made the bound
//      param `undefined` for every non-admin request, which sanitize()
//      turns into `= NULL` — always false. So the "your own records only"
//      filter for a plain "user"-role login was silently returning zero
//      rows for the *entire* dashboard, not correctly scoping.
//
//   2. cacheKeyFor() had the exact same typo: `user:${req.user.userId}`
//      evaluated to the literal string "user:undefined" for EVERY non-admin
//      account. Since this is a shared in-process cache, that meant two
//      different sales reps (or a sales rep and a demo client) could be
//      served each other's cached dashboard payload — a real cross-account
//      data leak, not just a scoping bug.
//
// This is now built on the same getOwnershipClause() used by leads.js /
// customers.js / retainers.js, for two reasons: it uses the correct
// req.user.id, and it also excludes demo ("user"-role) sandbox data from
// admin's real dashboard — which the old version never did (admin's rf.clause
// was simply empty, so a demo client's test leads/customers would have
// inflated your real admin KPIs).
//
// scopeClause() wraps it with a leading "AND " so it drops into the existing
// "WHERE ... ${clause}" string-interpolation style already used throughout
// this file, without having to restructure every query.
const scopeClause = (req, column, alias) => {
  const { clause, params } = getOwnershipClause(req, column, alias);
  return { clause: `AND ${clause}`, params };
};

// =============================================================================
// LIGHTWEIGHT IN-PROCESS CACHE
// =============================================================================
// Aggregate dashboard queries are the most expensive route in this router —
// a CEO/manager refreshing the page every few seconds shouldn't trigger 15+
// aggregate scans each time. This is intentionally simple (a Map with a
// TTL); swap for Redis if you run more than one app instance, since this
// cache is per-process and won't be shared/invalidated across replicas.
const CACHE_TTL_MS = 30_000;
const cache = new Map();
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};
const cacheSet = (key, value) => cache.set(key, { value, at: Date.now() });
// 🔒 FIXED — req.user.userId → req.user.id (see note above). Also namespaced
// by role, not just id, since an admin and a same-id-shaped demo/sales
// account should never be able to collide (belt-and-braces; ids are UUIDs
// so collision is already astronomically unlikely, but cheap to guard).
const cacheKeyFor = (req, ...parts) =>
  [req.user.role === "admin" ? "admin" : `${req.user.role}:${req.user.id}`, ...parts].join(":");

// =============================================================================
// GET /reports/dashboard  — Main dashboard overview
// =============================================================================
router.get("/dashboard", authenticateToken, periodValidator, async (req, res) => {
  if (handleValidation(req, res)) return;

  try {
    const { period = "30" } = req.query;
    const d = days(period);
    const key = cacheKeyFor(req, "dashboard", d);
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    // 🔒 CHANGED — customers scoped by assigned_to (unchanged column, now via
    // getOwnershipClause so admin also excludes demo-user sandbox rows).
    // Leads scoped by created_by, matching leads.js's ownership model
    // (previously this used assigned_to for leads too, which didn't match
    // how leads.js actually determines "yours").
    const rf = scopeClause(req, "assigned_to", "c");
    const rfL = scopeClause(req, "created_by", "l");
    // For leads queries below that don't alias the table as "l"
    const rfLNoAlias = scopeClause(req, "created_by");

    // All of these are independent reads — running them sequentially (as
    // the previous version did) turns one page load into 16 round trips
    // back to back. They have no shared state, so they're safe to fire in
    // parallel and let the pool schedule them.
    const [
      activePatientsRows,
      newLeadsRows,
      newLeadsPrevRows,
      convertedLeadsRows,
      convertedLeadsPrevRows,
      revenueStatsRows,
      revenuePrevRows,
      gstRows,
      recurringStats,
      leadsByStatus,
      leadsBySource,
      leadsByService,
      followUpRows,
      monthlyRevenue,
      leadTrend,
      serviceDemand,
      topReferrals,
      collectionRateRows,
      overdueInvoices,
      recentLeads,
    ] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS activePatients FROM customers c WHERE status = 'active' ${rf.clause}`,
        sanitize(...rf.params)
      ),
      pool.execute(
        `SELECT COUNT(*) AS newLeads FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}`,
        sanitize(d, ...rfL.params)
      ),
      // Previous period (same length window, immediately before the current
      // one) — computed server-side so the frontend doesn't need to pull
      // full history just to render a trend arrow.
      pool.execute(
        `SELECT COUNT(*) AS newLeadsPrev FROM leads l
         WHERE l.created_at >= ${DATE_FILTER_SQL.replace("?", "(? * 2)")}
           AND l.created_at <  ${DATE_FILTER_SQL} ${rfL.clause}`,
        sanitize(d, d, ...rfL.params)
      ),
      pool.execute(
        `SELECT COUNT(*) AS convertedLeads FROM leads l
         WHERE l.status = ? AND l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}`,
        sanitize(STATUS.LEAD_CONVERTED, d, ...rfL.params)
      ),
      pool.execute(
        `SELECT COUNT(*) AS convertedLeadsPrev FROM leads l
         WHERE l.status = ?
           AND l.created_at >= ${DATE_FILTER_SQL.replace("?", "(? * 2)")}
           AND l.created_at <  ${DATE_FILTER_SQL} ${rfL.clause}`,
        sanitize(STATUS.LEAD_CONVERTED, d, d, ...rfL.params)
      ),
      // ⚠️ NOT SCOPED — invoices has no owner/rep column of its own (only
      // customer_id). Scoping this to "my invoices" would require joining
      // to customers and filtering on customers.assigned_to, touching every
      // invoice/revenue query in this file. Left as company-wide for now —
      // flagging this explicitly rather than guessing you want it changed.
      // If you want per-rep revenue numbers too, say so and I'll wire the
      // join through all of these (revenueStatsRows, revenuePrevRows,
      // gstRows, recurringStats, monthlyRevenue, collectionRateRows,
      // overdueInvoices, and the whole /revenue endpoint below).
      pool.execute(
        `SELECT
           COALESCE(SUM(CASE WHEN status = ?    THEN total ELSE 0 END), 0) AS paidRevenue,
           COALESCE(SUM(CASE WHEN status IN (?, ?) THEN total ELSE 0 END), 0) AS pendingRevenue,
           COALESCE(SUM(CASE WHEN status = ?    THEN total ELSE 0 END), 0) AS overdueRevenue,
           COUNT(CASE WHEN status = ? THEN 1 END)  AS overdueCount,
           COUNT(CASE WHEN status = ? THEN 1 END)  AS paidCount,
           COUNT(*)                                AS totalInvoices,
           COALESCE(SUM(total), 0)                 AS totalBilled
         FROM invoices
         WHERE created_at >= ${DATE_FILTER_SQL}`,
        sanitize(
          STATUS.INVOICE_PAID,
          STATUS.INVOICE_PENDING[0],
          STATUS.INVOICE_PENDING[1],
          STATUS.INVOICE_OVERDUE,
          STATUS.INVOICE_OVERDUE,
          STATUS.INVOICE_PAID,
          d
        )
      ),
      pool.execute(
        `SELECT COALESCE(SUM(CASE WHEN status = ? THEN total ELSE 0 END), 0) AS paidRevenuePrev
         FROM invoices
         WHERE created_at >= ${DATE_FILTER_SQL.replace("?", "(? * 2)")}
           AND created_at <  ${DATE_FILTER_SQL}`,
        sanitize(STATUS.INVOICE_PAID, d, d)
      ),
      pool.execute(
        `SELECT COALESCE(SUM(amount * tax / 100), 0) AS totalGstCollected
         FROM invoices WHERE status = ? AND created_at >= ${DATE_FILTER_SQL}`,
        sanitize(STATUS.INVOICE_PAID, d)
      ),
      pool.execute(`
        SELECT
          SUM(CASE WHEN is_recurring = 1 THEN 1 ELSE 0 END) AS recurringCount,
          SUM(CASE WHEN is_recurring = 0 THEN 1 ELSE 0 END) AS oneTimeCount,
          SUM(CASE WHEN is_recurring = 1 THEN total ELSE 0 END) AS recurringRevenue
        FROM invoices WHERE created_at >= ${DATE_FILTER_SQL}
      `, [d]),
      pool.execute(
        `SELECT status, COUNT(*) AS count FROM leads l
         WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}
         GROUP BY status`,
        sanitize(d, ...rfL.params)
      ),
      pool.execute(
        `SELECT COALESCE(source, 'unknown') AS source, COUNT(*) AS count
         FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}
         GROUP BY source`,
        sanitize(d, ...rfL.params)
      ),
      pool.execute(
        `SELECT COALESCE(service, 'other') AS service, COUNT(*) AS count
         FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}
         GROUP BY service`,
        sanitize(d, ...rfL.params)
      ),
      // 🔒 CHANGED — previously completely unscoped: every login, including
      // a plain non-admin "user", saw company-wide pending follow-ups here.
      pool.execute(
        `SELECT COUNT(*) AS followUpsDue FROM leads
         WHERE follow_up_date <= CURDATE() AND status NOT IN (?, ?) ${rfLNoAlias.clause}`,
        sanitize(STATUS.LEAD_CONVERTED, STATUS.LEAD_CLOSED_LOST, ...rfLNoAlias.params)
      ),
      pool.execute(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          DATE_FORMAT(created_at, '%b %Y') AS label,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)  AS paid,
          COALESCE(SUM(CASE WHEN status != 'paid' THEN total ELSE 0 END), 0) AS pending,
          COUNT(*) AS invoiceCount
        FROM invoices
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
        ORDER BY month ASC
      `),
      pool.execute(
        `SELECT
           DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
           DATE_FORMAT(created_at, '%d %b')     AS label,
           COUNT(*) AS count,
           SUM(CASE WHEN source = 'whatsapp'       THEN 1 ELSE 0 END) AS whatsapp,
           SUM(CASE WHEN source = 'booking-engine' THEN 1 ELSE 0 END) AS booking,
           SUM(CASE WHEN source = 'website'        THEN 1 ELSE 0 END) AS website,
           SUM(CASE WHEN source = 'referral'       THEN 1 ELSE 0 END) AS referral,
           SUM(CASE WHEN source = 'manual'         THEN 1 ELSE 0 END) AS manual
         FROM leads l
         WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), DATE_FORMAT(created_at, '%d %b')
         ORDER BY day ASC`,
        sanitize(d, ...rfL.params)
      ),
      // 🔒 CHANGED — previously unscoped (no WHERE at all — literally every
      // lead in the table, from every rep, every login).
      pool.execute(
        `SELECT
           COALESCE(service, 'other') AS service,
           COUNT(*) AS leadCount,
           SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS convertedCount
         FROM leads
         WHERE 1=1 ${rfLNoAlias.clause}
         GROUP BY service
         ORDER BY leadCount DESC`,
        sanitize(...rfLNoAlias.params)
      ),
      // 🔒 CHANGED — previously unscoped, same issue as above.
      pool.execute(
        `SELECT referred_by, COUNT(*) AS count
         FROM leads
         WHERE referred_by IS NOT NULL AND referred_by != '' ${rfLNoAlias.clause}
         GROUP BY referred_by
         ORDER BY count DESC
         LIMIT 10`,
        sanitize(...rfLNoAlias.params)
      ),
      // ⚠️ NOT SCOPED — invoices, same gap noted above.
      pool.execute(
        `SELECT
           CASE WHEN SUM(total) > 0
             THEN ROUND(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) / SUM(total) * 100, 1)
             ELSE 0
           END AS collectionRate
         FROM invoices
         WHERE created_at >= ${DATE_FILTER_SQL}`,
        [d]
      ),
      // ⚠️ NOT SCOPED — invoices, same gap noted above.
      pool.execute(`
        SELECT i.invoice_number, c.name AS customerName,
               i.total, i.due_date,
               DATEDIFF(CURDATE(), i.due_date) AS daysOverdue
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'overdue'
        ORDER BY i.due_date ASC
        LIMIT 5
      `),
      // 🔒 CHANGED — previously unscoped (no WHERE at all).
      pool.execute(
        `SELECT name, source, service, status, created_at
         FROM leads
         WHERE 1=1 ${rfLNoAlias.clause}
         ORDER BY created_at DESC
         LIMIT 5`,
        sanitize(...rfLNoAlias.params)
      ),
    ]);

    const activePatients = activePatientsRows[0][0].activePatients;
    const newLeads = newLeadsRows[0][0].newLeads;
    const newLeadsPrev = newLeadsPrevRows[0][0].newLeadsPrev;
    const convertedLeads = convertedLeadsRows[0][0].convertedLeads;
    const convertedLeadsPrev = convertedLeadsPrevRows[0][0].convertedLeadsPrev;
    const revenueStats = revenueStatsRows[0][0];
    const paidRevenuePrev = +revenuePrevRows[0][0].paidRevenuePrev;
    const totalGstCollected = gstRows[0][0].totalGstCollected;
    const followUpsDue = followUpRows[0][0].followUpsDue;
    const collectionRate = collectionRateRows[0][0].collectionRate;

    const pctChange = (cur, prev) => (prev > 0 ? +(((cur - prev) / prev) * 100).toFixed(1) : cur > 0 ? 100 : 0);

    const payload = {
      summary: {
        activePatients,
        newLeads,
        newLeadsTrend: pctChange(newLeads, newLeadsPrev),
        convertedLeads,
        convertedLeadsTrend: pctChange(convertedLeads, convertedLeadsPrev),
        followUpsDue,
        conversionRate: newLeads > 0 ? +((convertedLeads / newLeads) * 100).toFixed(1) : 0,
        collectionRate: collectionRate || 0,
      },
      revenue: {
        paid: +revenueStats.paidRevenue,
        paidTrend: pctChange(+revenueStats.paidRevenue, paidRevenuePrev),
        pending: +revenueStats.pendingRevenue,
        overdue: +revenueStats.overdueRevenue,
        totalBilled: +revenueStats.totalBilled,
        overdueCount: revenueStats.overdueCount,
        paidCount: revenueStats.paidCount,
        totalInvoices: revenueStats.totalInvoices,
        gstCollected: +totalGstCollected,
        recurringCount: +(recurringStats[0][0]?.recurringCount || 0),
        oneTimeCount: +(recurringStats[0][0]?.oneTimeCount || 0),
        recurringRevenue: +(recurringStats[0][0]?.recurringRevenue || 0),
      },
      charts: {
        monthlyRevenue: monthlyRevenue[0],
        leadTrend: leadTrend[0],
        leadsByStatus: leadsByStatus[0],
        leadsBySource: leadsBySource[0],
        leadsByService: leadsByService[0],
        serviceDemand: serviceDemand[0],
      },
      lists: {
        topReferrals: topReferrals[0],
        overdueInvoices: overdueInvoices[0],
        recentLeads: recentLeads[0],
      },
      meta: { period: d, generatedAt: new Date().toISOString() },
    };

    // 🆕 NEW — sales reps see their own lead/pipeline numbers but not
    // company financials. Redacting here (rather than not querying the
    // data at all) keeps the query logic above untouched and simple; the
    // cost of running these aggregate queries for a sales login is small
    // compared to restructuring every query with a role branch. Redacted
    // AFTER the numbers are computed but BEFORE caching, so the cached
    // entry for this user (cache key is already role+id-scoped — see
    // cacheKeyFor above) never holds financial data a sales login could
    // later retrieve from cache.
    if (req.user.role === "sales") {
      delete payload.revenue;
      delete payload.summary.collectionRate;
      delete payload.charts.monthlyRevenue;
      delete payload.lists.overdueInvoices;
    }

    cacheSet(key, payload);
    res.json(payload);
  } catch (err) {
    console.error("Dashboard stats error:", { period: req.query.period, userId: req.user?.id, err });
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

// =============================================================================
// GET /reports/leads  — Detailed lead analytics
// =============================================================================
router.get("/leads", authenticateToken, periodValidator, async (req, res) => {
  if (handleValidation(req, res)) return;

  try {
    const { period = "30" } = req.query;
    const d = days(period);
    // 🔒 CHANGED — created_by (matches leads.js), not assigned_to; and now
    // routed through getOwnershipClause so admin excludes demo sandbox data.
    const rfL = scopeClause(req, "created_by", "l");

    const [byStatus, bySource, byService, byPriority, conversionFunnel] = await Promise.all([
      pool.execute(
        `SELECT status, COUNT(*) AS count FROM leads l
         WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause} GROUP BY status`,
        sanitize(d, ...rfL.params)
      ),
      pool.execute(
        `SELECT COALESCE(source,'unknown') AS source, COUNT(*) AS count
         FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause} GROUP BY source`,
        sanitize(d, ...rfL.params)
      ),
      pool.execute(
        `SELECT COALESCE(service,'other') AS service, COUNT(*) AS count
         FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause} GROUP BY service`,
        sanitize(d, ...rfL.params)
      ),
      pool.execute(
        `SELECT priority, COUNT(*) AS count
         FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause} GROUP BY priority`,
        sanitize(d, ...rfL.params)
      ),
      pool.execute(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status IN ('qualified','quotation-sent','converted') THEN 1 ELSE 0 END) AS qualified,
           SUM(CASE WHEN status = 'quotation-sent' THEN 1 ELSE 0 END) AS quotationSent,
           SUM(CASE WHEN status = 'converted'      THEN 1 ELSE 0 END) AS converted,
           SUM(CASE WHEN status = 'closed-lost'    THEN 1 ELSE 0 END) AS lost
         FROM leads l WHERE l.created_at >= ${DATE_FILTER_SQL} ${rfL.clause}`,
        sanitize(d, ...rfL.params)
      ),
    ]);

    res.json({
      byStatus: byStatus[0],
      bySource: bySource[0],
      byService: byService[0],
      byPriority: byPriority[0],
      conversionFunnel: conversionFunnel[0][0],
    });
  } catch (err) {
    console.error("Lead analytics error:", { period: req.query.period, err });
    res.status(500).json({ error: "Failed to generate lead analytics" });
  }
});

// =============================================================================
// GET /reports/revenue  — Invoice / billing analytics (+ AR aging)
// =============================================================================
// 🔒 CHANGED — admin only. This endpoint is exclusively financial data
// (revenue, GST, AR aging, billing concentration); since sales logins now
// have the equivalent numbers stripped out of /dashboard, calling this
// endpoint directly would otherwise bypass that redaction entirely.
router.get("/revenue", authenticateToken, periodValidator, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Revenue analytics are only visible to admins" });
  }
  if (handleValidation(req, res)) return;

  try {
    const { period = "90" } = req.query;
    const d = days(period);

    const [monthly, byStatus, topPatients, arAging] = await Promise.all([
      pool.execute(
        `SELECT
           DATE_FORMAT(created_at, '%Y-%m') AS month,
           DATE_FORMAT(created_at, '%b %Y') AS label,
           COALESCE(SUM(amount), 0) AS subtotal,
           COALESCE(SUM(amount * tax / 100), 0) AS gstAmount,
           COALESCE(SUM(total), 0)  AS totalWithGst,
           COALESCE(SUM(CASE WHEN status = 'paid'    THEN total ELSE 0 END), 0) AS paid,
           COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) AS overdue,
           COUNT(*) AS invoiceCount,
           COUNT(CASE WHEN is_recurring = 1 THEN 1 END) AS recurringCount
         FROM invoices
         WHERE created_at >= ${DATE_FILTER_SQL}
         GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
         ORDER BY month`,
        [d]
      ),
      pool.execute(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS totalAmount
         FROM invoices WHERE created_at >= ${DATE_FILTER_SQL}
         GROUP BY status`,
        [d]
      ),
      // Top clients by billing — also the basis for the revenue-concentration
      // check on the frontend (what % of revenue sits in the top 3 clients).
      pool.execute(
        `SELECT c.name, c.company,
                COUNT(i.id) AS invoiceCount,
                COALESCE(SUM(i.total), 0) AS totalBilled,
                COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total ELSE 0 END), 0) AS totalPaid
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.id
         WHERE i.created_at >= ${DATE_FILTER_SQL}
         GROUP BY i.customer_id, c.name, c.company
         ORDER BY totalBilled DESC
         LIMIT 10`,
        [d]
      ),
      // AR aging buckets — what a CEO actually wants from "overdue
      // invoices" beyond a single count: how overdue, in standard
      // 0-30 / 31-60 / 61-90 / 90+ buckets.
      pool.execute(`
        SELECT
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 0  AND 30  THEN total ELSE 0 END) AS bucket0_30,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60  THEN total ELSE 0 END) AS bucket31_60,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90  THEN total ELSE 0 END) AS bucket61_90,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90               THEN total ELSE 0 END) AS bucket90Plus
        FROM invoices WHERE status = 'overdue'
      `),
    ]);

    const totalBilled = monthly[0].reduce((s, m) => s + Number(m.totalWithGst), 0);
    const topPatientsWithShare = topPatients[0].map((p) => ({
      ...p,
      revenueShare: totalBilled > 0 ? +((Number(p.totalBilled) / totalBilled) * 100).toFixed(1) : 0,
    }));
    const top3Share = topPatientsWithShare.slice(0, 3).reduce((s, p) => s + p.revenueShare, 0);

    res.json({
      monthly: monthly[0],
      byStatus: byStatus[0],
      topPatients: topPatientsWithShare,
      concentration: { top3Share: +top3Share.toFixed(1) },
      arAging: arAging[0][0],
    });
  } catch (err) {
    console.error("Revenue analytics error:", { period: req.query.period, err });
    res.status(500).json({ error: "Failed to generate revenue analytics" });
  }
});

// =============================================================================
// GET /reports/patients  — Patient / customer analytics
// =============================================================================
// Previously had no `period` support at all, unlike every other endpoint in
// this router — that inconsistency is the kind of thing that produces
// "wait, why doesn't the date filter do anything here?" bug reports.
router.get("/patients", authenticateToken, periodValidator, async (req, res) => {
  if (handleValidation(req, res)) return;

  try {
    const { period } = req.query;
    const d = period ? days(period) : null;
    const periodClause = d ? `AND created_at >= ${DATE_FILTER_SQL}` : "";
    // 🔒 CHANGED — now via getOwnershipClause (correct req.user.id, and
    // admin excludes demo sandbox customers from real KPIs).
    const rf = scopeClause(req, "assigned_to", "c");

    const [byStatus, byService, acquisitionTrend, topByValue] = await Promise.all([
      pool.execute(
        `SELECT status, COUNT(*) AS count FROM customers c
         WHERE 1=1 ${periodClause} ${rf.clause} GROUP BY status`,
        sanitize(...(d ? [d] : []), ...rf.params)
      ),
      pool.execute(
        `SELECT COALESCE(service,'other') AS service, COUNT(*) AS count
         FROM customers c WHERE 1=1 ${periodClause} ${rf.clause} GROUP BY service`,
        sanitize(...(d ? [d] : []), ...rf.params)
      ),
      pool.execute(
        `SELECT
           DATE_FORMAT(created_at, '%Y-%m') AS month,
           DATE_FORMAT(created_at, '%b %Y') AS label,
           COUNT(*) AS count
         FROM customers c
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) ${rf.clause}
         GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
         ORDER BY month`,
        sanitize(...rf.params)
      ),
      pool.execute(
        `SELECT name, company, total_value, status
         FROM customers c WHERE 1=1 ${periodClause} ${rf.clause}
         ORDER BY total_value DESC LIMIT 10`,
        sanitize(...(d ? [d] : []), ...rf.params)
      ),
    ]);

    // 🆕 NEW — total_value is a financial figure (deal size); strip it for
    // sales logins the same way /dashboard's revenue section is stripped,
    // while keeping the rest of the row (name/company/status) visible since
    // those aren't financial.
    const topByValueOut = req.user.role === "sales"
      ? topByValue[0].map(({ total_value, ...rest }) => rest)
      : topByValue[0];

    res.json({
      byStatus: byStatus[0],
      byService: byService[0],
      acquisitionTrend: acquisitionTrend[0],
      topByValue: topByValueOut,
    });
  } catch (err) {
    console.error("Patient analytics error:", { period: req.query.period, err });
    res.status(500).json({ error: "Failed to generate patient analytics" });
  }
});

// =============================================================================
// GET /reports/team  — Rep / team leaderboard (admin only)
// =============================================================================
// Surfaces who's actually converting leads, not just who has the most
// assigned to them. Assumes a `users` table with (id, name); adjust the
// join if your schema names it differently.
router.get("/team", authenticateToken, periodValidator, async (req, res) => {
  if (handleValidation(req, res)) return;
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Team performance is only visible to admins" });
  }

  try {
    const { period = "30" } = req.query;
    const d = days(period);

    // 🔒 CHANGED — added `u.role != 'user'` so demo/sandbox client accounts
    // never show up on the real sales team leaderboard. This still counts
    // by assigned_to (not created_by) deliberately — this is "who's working
    // leads assigned to them", a different, legitimate question from the
    // created_by ownership scoping used elsewhere, and admin explicitly
    // assigns leads to reps for exactly this purpose.
    const [rows] = await pool.execute(
      `SELECT
         u.id, u.name, u.role,
         COUNT(l.id) AS totalLeads,
         SUM(CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END) AS converted,
         ROUND(
           SUM(CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END) / COUNT(l.id) * 100, 1
         ) AS conversionRate
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id AND l.created_at >= ${DATE_FILTER_SQL}
       WHERE u.role != 'user'
       GROUP BY u.id, u.name, u.role
       HAVING totalLeads > 0
       ORDER BY conversionRate DESC`,
      [d]
    );

    res.json({ team: rows, period: d });
  } catch (err) {
    console.error("Team performance error:", { period: req.query.period, err });
    res.status(500).json({ error: "Failed to generate team performance report" });
  }
});

module.exports = router;