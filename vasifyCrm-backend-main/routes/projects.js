const express = require("express");
const router  = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { pool } = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const authId   = (req) => req.user?.id || null;
const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const ok404 = (res, rows, msg = "Not found") => {
  if (!rows || (Array.isArray(rows) && rows.length === 0)) {
    res.status(404).json({ error: msg, message: msg });
    return true;
  }
  return false;
};

// ─── FK safety ────────────────────────────────────────────────────────────────
async function safeFK(table, id) {
  if (!id) return null;
  try {
    const [rows] = await pool.query(`SELECT id FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
    return rows.length ? id : null;
  } catch { return null; }
}

// ─── Parse ENUM allowed values ────────────────────────────────────────────────
function parseEnum(typeStr) {
  if (!typeStr || !typeStr.toLowerCase().startsWith("enum")) return null;
  const match = typeStr.match(/^enum\((.+)\)$/i);
  if (!match) return null;
  return match[1].split(",").map(v => v.trim().replace(/^'|'$/g, ""));
}

// ─── Schema TTL ───────────────────────────────────────────────────────────────
// Caches refresh every 60 s so ALTER TABLE changes are picked up automatically
// without needing a server restart.
const SCHEMA_TTL_MS = 60_000;

// ─── Projects schema cache ────────────────────────────────────────────────────
let _schema     = null;
let _schemaTime = 0;

async function getSchema() {
  if (_schema && (Date.now() - _schemaTime) < SCHEMA_TTL_MS) return _schema;

  const [rows] = await pool.query("SHOW COLUMNS FROM projects");
  const cols    = new Set(rows.map(r => r.Field));
  const colMeta = {};
  for (const r of rows) colMeta[r.Field] = r;

  const idType   = (colMeta.id?.Type || "").toLowerCase();
  const idIsUUID = idType.includes("varchar") && idType.includes("36");

  const enumValues = {};
  for (const r of rows) {
    const allowed = parseEnum(r.Type);
    if (allowed) enumValues[r.Field] = allowed;
  }

  const deliveryDateCol = cols.has("delivery_date") ? "delivery_date"
                        : cols.has("end_date")       ? "end_date"
                        : null;

  const serviceCol = cols.has("service")      ? "service"
                   : cols.has("project_type") ? "project_type"
                   : null;

  _schema     = { cols, colMeta, idIsUUID, enumValues, deliveryDateCol, serviceCol };
  _schemaTime = Date.now();

  console.log("─── [projects] schema loaded ───────────────────────────");
  console.log("  id col       :", colMeta.id?.Type, "| UUID insert:", idIsUUID);
  console.log("  delivery col :", deliveryDateCol ?? "(none)");
  console.log("  service col  :", serviceCol ?? "(none)");
  console.log("  ENUM cols    :", Object.keys(enumValues).join(", ") || "(none)");
  if (enumValues.category) console.log("  category ENUM:", enumValues.category.join(", "));
  console.log("  all columns  :", [...cols].join(", "));
  console.log("────────────────────────────────────────────────────────");

  return _schema;
}

// ─── Tasks schema cache ───────────────────────────────────────────────────────
let _taskSchema     = null;
let _taskSchemaTime = 0;

async function getTaskSchema() {
  if (_taskSchema && (Date.now() - _taskSchemaTime) < SCHEMA_TTL_MS) return _taskSchema;

  const [rows] = await pool.query("SHOW COLUMNS FROM project_tasks");
  const cols    = new Set(rows.map(r => r.Field));
  const colMeta = {};
  for (const r of rows) colMeta[r.Field] = r;

  const idType   = (colMeta.id?.Type || "").toLowerCase();
  const idIsUUID = idType.includes("varchar") && idType.includes("36");

  const enumValues = {};
  for (const r of rows) {
    const allowed = parseEnum(r.Type);
    if (allowed) enumValues[r.Field] = allowed;
  }

  _taskSchema     = { cols, colMeta, idIsUUID, enumValues };
  _taskSchemaTime = Date.now();

  console.log("─── [project_tasks] schema loaded ──────────────────────");
  console.log("  id col       :", colMeta.id?.Type, "| UUID insert:", idIsUUID);
  console.log("  ENUM cols    :", Object.keys(enumValues).join(", ") || "(none)");
  console.log("  all columns  :", [...cols].join(", "));
  console.log("────────────────────────────────────────────────────────");

  return _taskSchema;
}

// ─── ENUM guard with smart alias mapping ──────────────────────────────────────
function safeEnum(schema, col, val) {
  if (val === null || val === undefined || val === "") return null;
  const allowed = schema?.enumValues?.[col];
  if (!allowed || !Array.isArray(allowed) || allowed.length === 0) return val;

  const strVal = String(val).trim();
  // Exact match (case-insensitive)
  const exact = allowed.find(a => a.toLowerCase() === strVal.toLowerCase());
  if (exact) return exact;

  // Status mapping
  if (col === "status") {
    if (/^comp/i.test(strVal)) {
      const comp = allowed.find(a => /^comp/i.test(a));
      if (comp) return comp;
    }
    if (/^in[-_ ]?prog/i.test(strVal)) {
      const prog = allowed.find(a => /^in[-_ ]?prog/i.test(a));
      if (prog) return prog;
    }
    if (/^pend/i.test(strVal)) {
      const pend = allowed.find(a => /^pend/i.test(a));
      if (pend) return pend;
    }
    if (/^block/i.test(strVal) || /^canc/i.test(strVal) || /^hold/i.test(strVal)) {
      const b = allowed.find(a => /block|canc|hold/i.test(a));
      if (b) return b;
    }
    if (/^rev/i.test(strVal)) {
      const r = allowed.find(a => /^rev/i.test(a));
      if (r) return r;
    }
  }

  // Priority mapping
  if (col === "priority") {
    if (/^med/i.test(strVal)) {
      const m = allowed.find(a => /^med/i.test(a));
      if (m) return m;
    }
    if (/^crit/i.test(strVal)) {
      const c = allowed.find(a => /^crit/i.test(a));
      if (c) return c;
    }
    if (/^hi/i.test(strVal)) {
      const h = allowed.find(a => /^hi/i.test(a));
      if (h) return h;
    }
    if (/^lo/i.test(strVal)) {
      const l = allowed.find(a => /^lo/i.test(a));
      if (l) return l;
    }
  }

  return allowed[0] || null;
}

// ─── Resolve project database primary key ID from id OR project_id code ──────
async function resolveProjectDbId(identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();

  // Try direct lookup by id or project_id
  try {
    const [rows] = await pool.query(
      "SELECT id, project_id, title FROM projects WHERE id = ? OR project_id = ? LIMIT 1",
      [str, str]
    );
    if (rows.length > 0) return rows[0].id;
  } catch (err) {
    // If id column is integer and str is string, WHERE id = ? may fail in strict mode
    try {
      const [rows] = await pool.query(
        "SELECT id, project_id, title FROM projects WHERE project_id = ? LIMIT 1",
        [str]
      );
      if (rows.length > 0) return rows[0].id;
    } catch {
      return null;
    }
  }

  return null;
}

// ─── Dynamic PROJECT_SELECT (no hardcoded column names, no GROUP BY) ──────────
async function buildProjectSelect() {
  const { cols } = await getSchema();
  const progressAlias = cols.has("completion_percentage")
    ? "p.completion_percentage AS progress_percentage,"
    : "p.progress_percentage   AS progress_percentage,";

  return `
    SELECT
      p.*,
      ${progressAlias}
      c.name  AS client_name,
      cb.name AS created_by_name,
      COALESCE(tc.task_count,      0) AS task_count,
      COALESCE(tc.task_done_count, 0) AS task_done_count
    FROM projects p
    LEFT JOIN customers c  ON c.id  = p.client_id
    LEFT JOIN users     cb ON cb.id = p.created_by
    LEFT JOIN (
      SELECT
        project_id,
        COUNT(id) AS task_count,
        SUM(status = 'Complete' OR status = 'Completed') AS task_done_count
      FROM project_tasks
      GROUP BY project_id
    ) tc ON tc.project_id = p.id
  `;
}

// ─── Dynamic TASK_SELECT with developer & project details ────────────────────
function buildTaskSelect() {
  return `
    SELECT
      t.*,
      u.name       AS assigned_to_name,
      u.name       AS developer_name,
      u.email      AS assigned_to_email,
      u.role       AS assigned_to_role,
      u.avatar     AS assigned_to_avatar,
      cb.name      AS created_by_name,
      p.title      AS project_title,
      p.project_id AS project_code
    FROM project_tasks t
    LEFT JOIN users u     ON u.id  = t.assigned_to
    LEFT JOIN users cb    ON cb.id = t.created_by
    LEFT JOIN projects p  ON p.id  = t.project_id
  `;
}

// ─── Safe INSERT helper ───────────────────────────────────────────────────────
async function safeInsert(table, pairs) {
  const colNames     = [...pairs.map(p => p[0]), "created_at", "updated_at"];
  const colValues    = pairs.map(p => p[1]);
  const placeholders = [...pairs.map(() => "?"), "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP"];
  return pool.query(
    `INSERT INTO \`${table}\` (${colNames.join(", ")}) VALUES (${placeholders.join(", ")})`,
    colValues
  );
}

// ─── addOptional: only inserts column when it exists in the DB schema ─────────
function addOptional(pairs, seen, schema, col, val) {
  if (!col) return;
  if (!schema.cols.has(col)) return;
  if (seen.has(col)) return;
  if (val === undefined) return;
  seen.add(col);
  pairs.push([col, val]);
}

// ─── Helper: insert project task with developer assignment ────────────────────
async function insertProjectTask(projectId, data, req) {
  const schema = await getTaskSchema();
  const { cols, idIsUUID } = schema;
  const taskId = uuidv4();

  const pairs = [];
  if (idIsUUID) pairs.push(["id", taskId]);
  pairs.push(["project_id", projectId]);
  pairs.push(["title", (data.title || "").trim()]);

  const seen = new Set(pairs.map(p => p[0]));

  const devId = data.assigned_to ?? data.developer_id ?? data.dev_id ?? data.developer_assigned ?? data.assignedTo ?? null;
  const safeAssignedTo = devId ? await safeFK("users", devId) : null;

  addOptional(pairs, seen, schema, "description",    data.description || null);
  addOptional(pairs, seen, schema, "assigned_to",    safeAssignedTo);
  addOptional(pairs, seen, schema, "status",         safeEnum(schema, "status", data.status || "Pending") || data.status || "Pending");
  addOptional(pairs, seen, schema, "priority",       safeEnum(schema, "priority", data.priority || "Medium") || data.priority || "Medium");
  addOptional(pairs, seen, schema, "start_date",     safeDate(data.start_date || data.startDate));
  addOptional(pairs, seen, schema, "due_date",       safeDate(data.due_date || data.dueDate));
  addOptional(pairs, seen, schema, "completed_date", safeDate(data.completed_date || data.completedDate));
  addOptional(pairs, seen, schema, "task_type",      data.task_type || data.taskType || null);
  addOptional(pairs, seen, schema, "is_recurring",   data.is_recurring !== undefined ? (data.is_recurring ? 1 : 0) : (data.isRecurring !== undefined ? (data.isRecurring ? 1 : 0) : null));
  addOptional(pairs, seen, schema, "recurrence",     data.recurrence || null);
  addOptional(pairs, seen, schema, "parent_task_id", data.parent_task_id || data.parentTaskId || null);
  addOptional(pairs, seen, schema, "created_by",     authId(req));

  const colNames     = [...pairs.map(p => p[0]), "created_at"];
  const colValues    = pairs.map(p => p[1]);
  const placeholders = [...pairs.map(() => "?"), "CURRENT_TIMESTAMP"];

  if (cols.has("updated_at")) {
    colNames.push("updated_at");
    placeholders.push("CURRENT_TIMESTAMP");
  }

  const [insertResult] = await pool.query(
    `INSERT INTO project_tasks (${colNames.join(", ")}) VALUES (${placeholders.join(", ")})`,
    colValues
  );

  const insertedId = idIsUUID ? taskId : insertResult.insertId;
  const TASK_SELECT = buildTaskSelect();
  const [rows] = await pool.query(`${TASK_SELECT} WHERE t.id = ?`, [insertedId]);
  return rows[0];
}

// ─── Helper: update project task with developer assignment ────────────────────
async function updateProjectTask(taskId, projectId, data) {
  const schema = await getTaskSchema();
  const { cols } = schema;

  const pairs = [];
  const seen = new Set();

  if (data.title !== undefined && data.title !== null) {
    pairs.push(["title", data.title.trim()]);
    seen.add("title");
  }

  if (data.assigned_to !== undefined || data.developer_id !== undefined || data.dev_id !== undefined || data.assignedTo !== undefined) {
    const rawDevId = data.assigned_to ?? data.developer_id ?? data.dev_id ?? data.assignedTo ?? null;
    const safeDevId = rawDevId ? await safeFK("users", rawDevId) : null;
    if (cols.has("assigned_to")) {
      pairs.push(["assigned_to", safeDevId]);
      seen.add("assigned_to");
    }
  }

  if (data.description !== undefined) addOptional(pairs, seen, schema, "description", data.description || null);
  if (data.status !== undefined)      addOptional(pairs, seen, schema, "status", safeEnum(schema, "status", data.status) || data.status);
  if (data.priority !== undefined)    addOptional(pairs, seen, schema, "priority", safeEnum(schema, "priority", data.priority) || data.priority);
  if (data.start_date !== undefined || data.startDate !== undefined) {
    addOptional(pairs, seen, schema, "start_date", safeDate(data.start_date || data.startDate));
  }
  if (data.due_date !== undefined || data.dueDate !== undefined) {
    addOptional(pairs, seen, schema, "due_date", safeDate(data.due_date || data.dueDate));
  }
  if (data.completed_date !== undefined || data.completedDate !== undefined) {
    addOptional(pairs, seen, schema, "completed_date", safeDate(data.completed_date || data.completedDate));
  }
  if (data.task_type !== undefined || data.taskType !== undefined) {
    addOptional(pairs, seen, schema, "task_type", data.task_type || data.taskType || null);
  }
  if (data.recurrence !== undefined) {
    addOptional(pairs, seen, schema, "recurrence", data.recurrence || null);
  }
  if (data.is_recurring !== undefined || data.isRecurring !== undefined) {
    const isRec = data.is_recurring ?? data.isRecurring;
    addOptional(pairs, seen, schema, "is_recurring", isRec ? 1 : 0);
  }

  if (pairs.length === 0) return null;

  let updateSql = `UPDATE project_tasks SET ${pairs.map(([col]) => `${col} = ?`).join(", ")}`;
  if (cols.has("updated_at")) {
    updateSql += `, updated_at = CURRENT_TIMESTAMP`;
  }
  updateSql += ` WHERE id = ?`;

  const values = [...pairs.map(([, v]) => v), taskId];
  if (projectId) {
    updateSql += ` AND project_id = ?`;
    values.push(projectId);
  }

  await pool.query(updateSql, values);

  const TASK_SELECT = buildTaskSelect();
  const [rows] = await pool.query(`${TASK_SELECT} WHERE t.id = ?`, [taskId]);
  return rows[0];
}

// =============================================================================
// 1. GET ALL PROJECTS (GET /)
// =============================================================================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, service, priority, search, client_id } = req.query;
    const { cols, serviceCol } = await getSchema();
    const PROJECT_SELECT = await buildProjectSelect();

    let where = "WHERE 1=1";
    const params = [];

    if (status)    { where += " AND p.status = ?";    params.push(status); }
    if (priority)  { where += " AND p.priority = ?";  params.push(priority); }
    if (client_id) { where += " AND p.client_id = ?"; params.push(client_id); }
    if (service && serviceCol) {
      where += ` AND p.${serviceCol} = ?`; params.push(service);
    }
    if (search) {
      const sc = ["p.title", "c.name"];
      if (cols.has("sales_owner"))     sc.push("p.sales_owner");
      if (cols.has("project_manager")) sc.push("p.project_manager");
      where += ` AND (${sc.map(c => `${c} LIKE ?`).join(" OR ")})`;
      sc.forEach(() => params.push(`%${search}%`));
    }

    const [rows] = await pool.query(
      `${PROJECT_SELECT} ${where} ORDER BY p.created_at DESC`, params
    );
    res.json(rows);
  } catch (err) {
    console.error("getAllProjects error:", err);
    res.status(500).json({ error: "Failed to fetch projects", detail: err.message });
  }
});

// =============================================================================
// 2. CREATE PROJECT (POST /)
// =============================================================================
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      title, client_id, deal_id,
      service, description, status = "Not Started", start_date, delivery_date,
      sales_owner, project_manager, developer_assigned,
      priority = "Medium", progress_percentage, completion_percentage,
      update_note, project_update, notes,
      department, scope_of_work, category,
      estimated_budget, actual_cost, health_rating,
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: "Project title is required" });

    const resolvedPct  = Number(progress_percentage ?? completion_percentage ?? 0);
    const resolvedNote = update_note || project_update || null;

    const schema = await getSchema();
    const { cols, idIsUUID, serviceCol, deliveryDateCol } = schema;

    const safeClientId = await safeFK("customers", client_id);
    const safeDealId   = cols.has("deal_id") ? await safeFK("deals", deal_id) : undefined;

    const pairs = [];
    if (idIsUUID) pairs.push(["id", uuidv4()]);
    pairs.push(["title",     title.trim()]);
    pairs.push(["client_id", safeClientId]);

    const seen = new Set(pairs.map(p => p[0]));

    addOptional(pairs, seen, schema, "project_id",            `PROJ-${Date.now()}`);
    addOptional(pairs, seen, schema, "deal_id",               safeDealId);
    addOptional(pairs, seen, schema, serviceCol,              service || null);
    addOptional(pairs, seen, schema, "description",           description || null);
    addOptional(pairs, seen, schema, "scope_of_work",         scope_of_work || null);
    addOptional(pairs, seen, schema, "department",            department || null);
    addOptional(pairs, seen, schema, "status",                safeEnum(schema, "status",        status));
    addOptional(pairs, seen, schema, "priority",              safeEnum(schema, "priority",      priority));
    addOptional(pairs, seen, schema, "category",              safeEnum(schema, "category",      category ?? null));
    addOptional(pairs, seen, schema, "health_rating",         safeEnum(schema, "health_rating", health_rating ?? null));
    addOptional(pairs, seen, schema, "start_date",            safeDate(start_date));
    addOptional(pairs, seen, schema, deliveryDateCol,         safeDate(delivery_date));
    addOptional(pairs, seen, schema, "sales_owner",           sales_owner || null);
    addOptional(pairs, seen, schema, "project_manager",       project_manager || null);
    addOptional(pairs, seen, schema, "developer_assigned",    developer_assigned || null);
    addOptional(pairs, seen, schema, "completion_percentage", resolvedPct);
    addOptional(pairs, seen, schema, "progress_percentage",   resolvedPct);
    addOptional(pairs, seen, schema, "project_update",        resolvedNote);
    addOptional(pairs, seen, schema, "notes",                 notes || null);
    addOptional(pairs, seen, schema, "estimated_budget",      estimated_budget || null);
    addOptional(pairs, seen, schema, "actual_cost",           actual_cost || null);
    addOptional(pairs, seen, schema, "created_by",            authId(req));

    const [result] = await safeInsert("projects", pairs);

    const newId = idIsUUID ? pairs.find(p => p[0] === "id")[1] : result.insertId;
    const PROJECT_SELECT = await buildProjectSelect();
    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.id = ?`, [newId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createProject error:", err);
    res.status(500).json({ error: "Failed to create project", detail: err.message });
  }
});

// =============================================================================
// 3. DEVELOPERS / TEAM MEMBERS LIST (GET /developers & GET /devs)
// Returns active users available for developer assignment
// =============================================================================
router.get("/developers", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, role, avatar, is_active, created_at
       FROM users
       WHERE is_active = 1
       ORDER BY name ASC`
    );
    res.json(users);
  } catch (err) {
    console.error("getDevelopers error:", err);
    res.status(500).json({ error: "Failed to fetch developers", detail: err.message });
  }
});

router.get("/devs", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, role, avatar, is_active, created_at
       FROM users
       WHERE is_active = 1
       ORDER BY name ASC`
    );
    res.json(users);
  } catch (err) {
    console.error("getDevs error:", err);
    res.status(500).json({ error: "Failed to fetch developers", detail: err.message });
  }
});

// =============================================================================
// 4. CROSS-PROJECT TASKS (GET /tasks & POST /tasks)
// Literal endpoints MUST precede /:id to prevent routing collisions
// =============================================================================
router.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const { assigned_to, dev_id, developer_id, project_id, status, priority, search, my_tasks } = req.query;
    const TASK_SELECT = buildTaskSelect();

    let where = "WHERE 1=1";
    const params = [];

    const targetDevId = (my_tasks === "true" || my_tasks === "1")
      ? authId(req)
      : (assigned_to || dev_id || developer_id);

    if (targetDevId) {
      where += " AND t.assigned_to = ?";
      params.push(targetDevId);
    }

    if (project_id) {
      const resolvedProjId = await resolveProjectDbId(project_id);
      if (resolvedProjId) {
        where += " AND t.project_id = ?";
        params.push(resolvedProjId);
      }
    }

    if (status) {
      where += " AND t.status = ?";
      params.push(status);
    }

    if (priority) {
      where += " AND t.priority = ?";
      params.push(priority);
    }

    if (search) {
      where += " AND (t.title LIKE ? OR t.description LIKE ? OR u.name LIKE ? OR p.title LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const [rows] = await pool.query(
      `${TASK_SELECT} ${where} ORDER BY FIELD(t.priority,'Critical','High','Medium','Low'), t.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("getAllProjectTasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks", detail: err.message });
  }
});

// GET /api/projects/tasks/my-tasks — current user's assigned tasks
router.get("/tasks/my-tasks", authenticateToken, async (req, res) => {
  try {
    const userId = authId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const TASK_SELECT = buildTaskSelect();
    const [rows] = await pool.query(
      `${TASK_SELECT} WHERE t.assigned_to = ? ORDER BY FIELD(t.priority,'Critical','High','Medium','Low'), t.created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getMyTasks error:", err);
    res.status(500).json({ error: "Failed to fetch your tasks", detail: err.message });
  }
});

// POST /api/projects/tasks — top-level task creation with project_id in body
router.post("/tasks", authenticateToken, async (req, res) => {
  try {
    const { title, project_id, projectId } = req.body;
    const rawProjectId = project_id || projectId;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Task title is required", message: "Task title is required" });
    }
    if (!rawProjectId) {
      return res.status(400).json({ error: "project_id is required", message: "Please specify a project" });
    }

    const resolvedProjId = await resolveProjectDbId(rawProjectId);
    if (!resolvedProjId) {
      return res.status(404).json({ error: "Project not found", message: `Project '${rawProjectId}' does not exist` });
    }

    const task = await insertProjectTask(resolvedProjId, req.body, req);
    res.status(201).json(task);
  } catch (err) {
    console.error("createProjectTaskDirect error:", err);
    res.status(500).json({ error: "Failed to create task", detail: err.message, message: err.message });
  }
});

// GET /api/projects/tasks/:taskId — get single task by ID
router.get("/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const TASK_SELECT = buildTaskSelect();
    const [rows] = await pool.query(`${TASK_SELECT} WHERE t.id = ?`, [req.params.taskId]);
    if (ok404(res, rows, "Task not found")) return;
    res.json(rows[0]);
  } catch (err) {
    console.error("getTaskById error:", err);
    res.status(500).json({ error: "Failed to fetch task", detail: err.message });
  }
});

// PUT /api/projects/tasks/:taskId — update single task by ID
router.put("/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const [check] = await pool.query("SELECT id FROM project_tasks WHERE id = ?", [req.params.taskId]);
    if (ok404(res, check, "Task not found")) return;

    const updated = await updateProjectTask(req.params.taskId, null, req.body);
    res.json(updated);
  } catch (err) {
    console.error("updateTaskDirect error:", err);
    res.status(500).json({ error: "Failed to update task", detail: err.message });
  }
});

// PATCH /api/projects/tasks/:taskId — patch single task by ID
router.patch("/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const [check] = await pool.query("SELECT id FROM project_tasks WHERE id = ?", [req.params.taskId]);
    if (ok404(res, check, "Task not found")) return;

    const updated = await updateProjectTask(req.params.taskId, null, req.body);
    res.json(updated);
  } catch (err) {
    console.error("patchTaskDirect error:", err);
    res.status(500).json({ error: "Failed to update task", detail: err.message });
  }
});

// DELETE /api/projects/tasks/:taskId — delete task by ID
router.delete("/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const [check] = await pool.query("SELECT id FROM project_tasks WHERE id = ?", [req.params.taskId]);
    if (ok404(res, check, "Task not found")) return;
    await pool.query("DELETE FROM project_tasks WHERE id = ?", [req.params.taskId]);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("deleteTaskDirect error:", err);
    res.status(500).json({ error: "Failed to delete task", detail: err.message });
  }
});

// GET /api/projects/dev/:devId/tasks — list tasks for a specific developer
router.get("/dev/:devId/tasks", authenticateToken, async (req, res) => {
  try {
    const TASK_SELECT = buildTaskSelect();
    const [rows] = await pool.query(
      `${TASK_SELECT} WHERE t.assigned_to = ? ORDER BY FIELD(t.priority,'Critical','High','Medium','Low'), t.created_at DESC`,
      [req.params.devId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getDevTasks error:", err);
    res.status(500).json({ error: "Failed to fetch developer tasks", detail: err.message });
  }
});

// =============================================================================
// 5. GET PROJECT BY ID (GET /:id)
// Registered after literal routes like /tasks, /developers, /devs
// =============================================================================
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const resolvedId = await resolveProjectDbId(req.params.id);
    if (!resolvedId) return res.status(404).json({ error: "Project not found", message: "Project not found" });

    const PROJECT_SELECT = await buildProjectSelect();
    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.id = ?`, [resolvedId]);
    if (ok404(res, rows, "Project not found")) return;
    res.json(rows[0]);
  } catch (err) {
    console.error("getProjectById error:", err);
    res.status(500).json({ error: "Failed to fetch project", detail: err.message });
  }
});

// =============================================================================
// 6. UPDATE PROJECT (PUT /:id)
// =============================================================================
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const resolvedId = await resolveProjectDbId(req.params.id);
    if (!resolvedId) return res.status(404).json({ error: "Project not found", message: "Project not found" });

    const {
      title, client_id, deal_id, service, description,
      status, start_date, delivery_date,
      sales_owner, project_manager, developer_assigned,
      priority, progress_percentage, completion_percentage,
      update_note, project_update, notes,
      department, scope_of_work, category,
      estimated_budget, actual_cost, health_rating,
    } = req.body;

    const resolvedPct  = progress_percentage  !== undefined ? Number(progress_percentage)
                       : completion_percentage !== undefined ? Number(completion_percentage)
                       : null;
    const resolvedNote = update_note || project_update || null;

    const schema = await getSchema();
    const { cols, serviceCol, deliveryDateCol } = schema;

    const safeClientId = await safeFK("customers", client_id);
    const safeDealId   = cols.has("deal_id") ? await safeFK("deals", deal_id) : undefined;

    const pairs = [
      ["title",     title?.trim() || null],
      ["client_id", safeClientId],
    ];
    const seen = new Set(pairs.map(p => p[0]));

    addOptional(pairs, seen, schema, "deal_id",               safeDealId);
    addOptional(pairs, seen, schema, serviceCol,              service || null);
    addOptional(pairs, seen, schema, "description",           description || null);
    addOptional(pairs, seen, schema, "scope_of_work",         scope_of_work || null);
    addOptional(pairs, seen, schema, "department",            department || null);
    addOptional(pairs, seen, schema, "status",                safeEnum(schema, "status",        status ?? null));
    addOptional(pairs, seen, schema, "priority",              safeEnum(schema, "priority",      priority ?? null));
    addOptional(pairs, seen, schema, "category",              safeEnum(schema, "category",      category ?? null));
    addOptional(pairs, seen, schema, "health_rating",         safeEnum(schema, "health_rating", health_rating ?? null));
    addOptional(pairs, seen, schema, "start_date",            safeDate(start_date));
    addOptional(pairs, seen, schema, deliveryDateCol,         safeDate(delivery_date));
    addOptional(pairs, seen, schema, "sales_owner",           sales_owner || null);
    addOptional(pairs, seen, schema, "project_manager",       project_manager || null);
    addOptional(pairs, seen, schema, "developer_assigned",    developer_assigned || null);
    addOptional(pairs, seen, schema, "completion_percentage", resolvedPct);
    addOptional(pairs, seen, schema, "progress_percentage",   resolvedPct);
    addOptional(pairs, seen, schema, "project_update",        resolvedNote);
    addOptional(pairs, seen, schema, "notes",                 notes || null);
    addOptional(pairs, seen, schema, "estimated_budget",      estimated_budget || null);
    addOptional(pairs, seen, schema, "actual_cost",           actual_cost || null);

    const setClause = pairs.map(([col]) => `${col} = ?`).join(", ");
    const setValues = [...pairs.map(([, v]) => v), resolvedId];

    await pool.query(
      `UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      setValues
    );

    const PROJECT_SELECT = await buildProjectSelect();
    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.id = ?`, [resolvedId]);
    res.json(rows[0]);
  } catch (err) {
    console.error("updateProject error:", err);
    res.status(500).json({ error: "Failed to update project", detail: err.message });
  }
});

// =============================================================================
// 7. PATCH PROJECT (PATCH /:id)
// =============================================================================
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const resolvedId = await resolveProjectDbId(req.params.id);
    if (!resolvedId) return res.status(404).json({ error: "Project not found", message: "Project not found" });

    const schema = await getSchema();
    const { cols, serviceCol } = schema;

    const PATCHABLE = ["status", "priority", "project_update", "notes",
                       "sales_owner", "project_manager", "developer_assigned"];
    const sets = [], vals = [];

    for (const key of PATCHABLE) {
      if (req.body[key] !== undefined && cols.has(key)) {
        sets.push(`${key} = ?`);
        vals.push(safeEnum(schema, key, req.body[key] === "" ? null : req.body[key]));
      }
    }
    const rawPct = req.body.progress_percentage ?? req.body.completion_percentage;
    if (rawPct !== undefined) {
      if (cols.has("completion_percentage")) { sets.push("completion_percentage = ?"); vals.push(Number(rawPct)); }
      if (cols.has("progress_percentage"))   { sets.push("progress_percentage = ?");   vals.push(Number(rawPct)); }
    }
    if (req.body.service !== undefined && serviceCol) {
      sets.push(`${serviceCol} = ?`); vals.push(req.body.service || null);
    }
    if (!sets.length) return res.status(400).json({ error: "No valid fields to update" });

    vals.push(resolvedId);
    await pool.query(
      `UPDATE projects SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, vals
    );

    const PROJECT_SELECT = await buildProjectSelect();
    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.id = ?`, [resolvedId]);
    res.json(rows[0]);
  } catch (err) {
    console.error("patchProject error:", err);
    res.status(500).json({ error: "Failed to update project", detail: err.message });
  }
});

// =============================================================================
// 8. DELETE PROJECT (DELETE /:id)
// =============================================================================
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const resolvedId = await resolveProjectDbId(req.params.id);
    if (!resolvedId) return res.status(404).json({ error: "Project not found", message: "Project not found" });

    await pool.query("DELETE FROM projects WHERE id = ?", [resolvedId]);
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("deleteProject error:", err);
    res.status(500).json({ error: "Failed to delete project", detail: err.message });
  }
});

// =============================================================================
// 9. PROJECT-SCOPED TASKS
// =============================================================================

// GET /api/projects/:id/tasks — list tasks for project (accepts numeric ID or PROJ-... code)
router.get("/:id/tasks", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found", message: "Project not found" });

    const TASK_SELECT = buildTaskSelect();
    const [rows] = await pool.query(
      `${TASK_SELECT} WHERE t.project_id = ?
       ORDER BY FIELD(t.priority,'Critical','High','Medium','Low'), t.created_at ASC`,
      [resolvedProjId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getProjectTasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks", detail: err.message });
  }
});

// POST /api/projects/:id/tasks — create task for project and assign to developer
router.post("/:id/tasks", authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: "Task title is required", message: "Task title is required" });
    }

    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) {
      return res.status(404).json({ error: "Project not found", message: `Project '${req.params.id}' does not exist` });
    }

    const task = await insertProjectTask(resolvedProjId, req.body, req);
    res.status(201).json(task);
  } catch (err) {
    console.error("createProjectTask error:", err);
    res.status(500).json({ error: "Failed to create task", detail: err.message, message: err.message });
  }
});

// GET /api/projects/:id/tasks/:taskId — get single task in project
router.get("/:id/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    const TASK_SELECT = buildTaskSelect();
    const [rows] = await pool.query(
      resolvedProjId
        ? `${TASK_SELECT} WHERE t.id = ? AND t.project_id = ?`
        : `${TASK_SELECT} WHERE t.id = ?`,
      resolvedProjId ? [req.params.taskId, resolvedProjId] : [req.params.taskId]
    );
    if (ok404(res, rows, "Task not found")) return;
    res.json(rows[0]);
  } catch (err) {
    console.error("getProjectTaskById error:", err);
    res.status(500).json({ error: "Failed to fetch task", detail: err.message });
  }
});

// PUT /api/projects/:id/tasks/:taskId — update task in project
router.put("/:id/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    const [check] = await pool.query(
      resolvedProjId
        ? "SELECT id FROM project_tasks WHERE id = ? AND project_id = ?"
        : "SELECT id FROM project_tasks WHERE id = ?",
      resolvedProjId ? [req.params.taskId, resolvedProjId] : [req.params.taskId]
    );
    if (ok404(res, check, "Task not found")) return;

    const updated = await updateProjectTask(req.params.taskId, resolvedProjId, req.body);
    res.json(updated);
  } catch (err) {
    console.error("updateProjectTask error:", err);
    res.status(500).json({ error: "Failed to update task", detail: err.message });
  }
});

// PATCH /api/projects/:id/tasks/:taskId — patch task in project
router.patch("/:id/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    const [check] = await pool.query(
      resolvedProjId
        ? "SELECT id FROM project_tasks WHERE id = ? AND project_id = ?"
        : "SELECT id FROM project_tasks WHERE id = ?",
      resolvedProjId ? [req.params.taskId, resolvedProjId] : [req.params.taskId]
    );
    if (ok404(res, check, "Task not found")) return;

    const updated = await updateProjectTask(req.params.taskId, resolvedProjId, req.body);
    res.json(updated);
  } catch (err) {
    console.error("patchProjectTask error:", err);
    res.status(500).json({ error: "Failed to update task", detail: err.message });
  }
});

// DELETE /api/projects/:id/tasks/:taskId — delete task in project
router.delete("/:id/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    const [check] = await pool.query(
      resolvedProjId
        ? "SELECT id FROM project_tasks WHERE id = ? AND project_id = ?"
        : "SELECT id FROM project_tasks WHERE id = ?",
      resolvedProjId ? [req.params.taskId, resolvedProjId] : [req.params.taskId]
    );
    if (ok404(res, check, "Task not found")) return;
    await pool.query("DELETE FROM project_tasks WHERE id = ?", [req.params.taskId]);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("deleteProjectTask error:", err);
    res.status(500).json({ error: "Failed to delete task", detail: err.message });
  }
});

// =============================================================================
// 10. NOTES
// =============================================================================
router.get("/:id/notes", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    const [rows] = await pool.query(
      `SELECT n.*, u.name AS created_by_name FROM project_notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.project_id = ? ORDER BY n.pinned DESC, n.created_at DESC`,
      [resolvedProjId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getNotes error:", err);
    res.status(500).json({ error: "Failed to fetch notes", detail: err.message });
  }
});

router.post("/:id/notes", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    const { note_type = "General", content, mentioned_users } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Note content is required" });
    const noteId = uuidv4();
    await pool.query(
      `INSERT INTO project_notes (id, project_id, note_type, content, mentioned_users, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [noteId, resolvedProjId, note_type, content.trim(),
       mentioned_users ? JSON.stringify(mentioned_users) : null, authId(req)]
    );
    const [rows] = await pool.query(
      `SELECT n.*, u.name AS created_by_name FROM project_notes n
       LEFT JOIN users u ON u.id = n.created_by WHERE n.id = ?`,
      [noteId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createNote error:", err);
    res.status(500).json({ error: "Failed to create note", detail: err.message });
  }
});

router.patch("/:id/notes/:noteId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    const { pinned } = req.body;
    if (pinned === undefined) return res.status(400).json({ error: "No valid fields to update" });
    await pool.query(
      resolvedProjId
        ? "UPDATE project_notes SET pinned = ? WHERE id = ? AND project_id = ?"
        : "UPDATE project_notes SET pinned = ? WHERE id = ?",
      resolvedProjId ? [pinned ? 1 : 0, req.params.noteId, resolvedProjId] : [pinned ? 1 : 0, req.params.noteId]
    );
    const [rows] = await pool.query(
      `SELECT n.*, u.name AS created_by_name FROM project_notes n
       LEFT JOIN users u ON u.id = n.created_by WHERE n.id = ?`,
      [req.params.noteId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("patchNote error:", err);
    res.status(500).json({ error: "Failed to update note", detail: err.message });
  }
});

router.delete("/:id/notes/:noteId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    await pool.query(
      resolvedProjId
        ? "DELETE FROM project_notes WHERE id = ? AND project_id = ?"
        : "DELETE FROM project_notes WHERE id = ?",
      resolvedProjId ? [req.params.noteId, resolvedProjId] : [req.params.noteId]
    );
    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("deleteNote error:", err);
    res.status(500).json({ error: "Failed to delete note", detail: err.message });
  }
});

// =============================================================================
// 11. TIME LOGS
// =============================================================================
router.get("/:id/time-logs", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    const [rows] = await pool.query(
      `SELECT tl.*, u.name AS user_name FROM project_time_logs tl
       LEFT JOIN users u ON u.id = tl.logged_by
       WHERE tl.project_id = ? ORDER BY tl.log_date DESC, tl.created_at DESC`,
      [resolvedProjId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getTimeLogs error:", err);
    res.status(500).json({ error: "Failed to fetch time logs", detail: err.message });
  }
});

router.post("/:id/time-logs", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    const { hours_logged, log_date, is_billable = true, description } = req.body;
    if (!hours_logged || isNaN(Number(hours_logged)))
      return res.status(400).json({ error: "Valid hours_logged is required" });
    const logId = uuidv4();
    await pool.query(
      `INSERT INTO project_time_logs
         (id, project_id, hours_logged, log_date, is_billable, description, logged_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [logId, resolvedProjId, Number(hours_logged),
       safeDate(log_date) || new Date().toISOString().slice(0, 10),
       is_billable ? 1 : 0, description || null, authId(req)]
    );
    const [rows] = await pool.query(
      `SELECT tl.*, u.name AS user_name FROM project_time_logs tl
       LEFT JOIN users u ON u.id = tl.logged_by WHERE tl.id = ?`,
      [logId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createTimeLog error:", err);
    res.status(500).json({ error: "Failed to create time log", detail: err.message });
  }
});

router.delete("/:id/time-logs/:logId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    await pool.query(
      resolvedProjId
        ? "DELETE FROM project_time_logs WHERE id = ? AND project_id = ?"
        : "DELETE FROM project_time_logs WHERE id = ?",
      resolvedProjId ? [req.params.logId, resolvedProjId] : [req.params.logId]
    );
    res.json({ message: "Time log deleted successfully" });
  } catch (err) {
    console.error("deleteTimeLog error:", err);
    res.status(500).json({ error: "Failed to delete time log", detail: err.message });
  }
});

// =============================================================================
// 12. TEAM ALLOCATION
// =============================================================================
router.get("/:id/team", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    const [rows] = await pool.query(
      `SELECT pt.*, u.name, u.email, u.phone, u.avatar
       FROM project_team pt
       LEFT JOIN users u ON u.id = pt.user_id
       WHERE pt.project_id = ? ORDER BY pt.created_at ASC`,
      [resolvedProjId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getTeam error:", err);
    res.status(500).json({ error: "Failed to fetch team", detail: err.message });
  }
});

router.post("/:id/team", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    const { user_id, role, skills_assigned, workload_capacity = 100, hours_per_week = 40 } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const [existing] = await pool.query(
      "SELECT id FROM project_team WHERE project_id = ? AND user_id = ?",
      [resolvedProjId, user_id]
    );
    if (existing.length) return res.status(409).json({ error: "User already assigned to this project" });

    // Do NOT insert id — let auto_increment handle it
    const [insertResult] = await pool.query(
      `INSERT INTO project_team
         (project_id, user_id, role, skills_assigned, workload_capacity, hours_per_week, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [resolvedProjId, user_id, role || null, skills_assigned || null,
       Number(workload_capacity), Number(hours_per_week)]
    );

    // Use auto-generated integer id to fetch the new row
    const [rows] = await pool.query(
      `SELECT pt.*, u.name, u.email, u.phone, u.avatar
       FROM project_team pt
       LEFT JOIN users u ON u.id = pt.user_id WHERE pt.id = ?`,
      [insertResult.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("addTeamMember error:", err);
    res.status(500).json({ error: "Failed to add team member", detail: err.message });
  }
});

router.delete("/:id/team/:userId", authenticateToken, async (req, res) => {
  try {
    const resolvedProjId = await resolveProjectDbId(req.params.id);
    if (!resolvedProjId) return res.status(404).json({ error: "Project not found" });

    await pool.query(
      "DELETE FROM project_team WHERE project_id = ? AND user_id = ?",
      [resolvedProjId, req.params.userId]
    );
    res.json({ message: "Team member removed successfully" });
  } catch (err) {
    console.error("removeTeamMember error:", err);
    res.status(500).json({ error: "Failed to remove team member", detail: err.message });
  }
});

module.exports = router;