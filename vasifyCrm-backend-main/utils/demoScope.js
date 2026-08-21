
/**
 * Builds a WHERE fragment + params enforcing ownership scope for list queries.
 *
 * @param {object} req - Express request (needs req.user.id, req.user.role)
 * @param {string} column - the "owner" column on the table, e.g. "created_by" or "assigned_to"
 * @param {string} [alias] - optional table alias, e.g. "l" for "l.created_by"
 * @returns {{ clause: string, params: any[] }}
 */
function getOwnershipClause(req, column, alias) {
  const col = alias ? `${alias}.${column}` : column;
  if (req.user.role === "admin") {
    // NULL-safe: "NULL NOT IN (...)" evaluates to unknown/false in SQL, so
    // without the explicit "col IS NULL OR" branch, any legacy row whose
    // owner column was never set (created before this scoping existed)
    // would silently disappear from admin's view too, even though the row
    // is still in the DB. Treat unowned rows as admin's own.
    return {
      clause: `(${col} IS NULL OR ${col} NOT IN (SELECT id FROM users WHERE role = 'user'))`,
      params: [],
    };
  }
  return {
    clause: `${col} = ?`,
    params: [req.user.id],
  };
}

/**
 * Guards a single-record route (GET/PUT/PATCH/DELETE /:id). Looks up the
 * record's owner + the owner's role, and 404s (never 403 — a demo client
 * should never learn a real record even exists, and vice versa) if the
 * requester is out of scope.
 *
 * Sends the response itself on failure — callers just do:
 *   const access = await ensureCanAccessRecord({ ... });
 *   if (!access.ok) return;
 *
 * @param {object} opts
 * @param {object} opts.pool - mysql2 pool
 * @param {string} opts.table - table name, e.g. "leads"
 * @param {string} opts.column - owner column, e.g. "created_by"
 * @param {string|number} opts.recordId
 * @param {object} opts.req
 * @param {object} opts.res
 * @param {string} [opts.notFoundMsg]
 */
async function ensureCanAccessRecord({ pool, table, column, recordId, req, res, notFoundMsg }) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.${column} AS owner_id, u.role AS owner_role
       FROM ${table} t
       LEFT JOIN users u ON u.id = t.${column}
      WHERE t.id = ?`,
    [recordId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: notFoundMsg || "Record not found" });
    return { ok: false };
  }

  const row = rows[0];

  if (req.user.role === "admin") {
    // Only demo ("user"-role) rows are hidden from admin. Rows owned by a
    // "sales"-role account (or by admin themselves, or unowned legacy rows)
    // are all visible — sales data is real company data, not sandbox data.
    if (row.owner_role === "user") {
      res.status(404).json({ error: notFoundMsg || "Record not found" });
      return { ok: false };
    }
    return { ok: true };
  }

  // Non-admin — covers both demo "user" logins and "sales" logins. Both
  // only ever see records they personally own.
  if (String(row.owner_id) === String(req.user.id)) {
    return { ok: true };
  }
  res.status(404).json({ error: notFoundMsg || "Record not found" });
  return { ok: false };
}

module.exports = { getOwnershipClause, ensureCanAccessRecord };