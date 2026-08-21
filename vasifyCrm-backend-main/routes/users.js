const express = require("express");
const bcrypt = require("bcryptjs"); 
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.json({ users: [], total: 0 });
    }

    const { role } = req.query;
    const allowedRoles = ["admin", "sales", "user"];

    let sql = `SELECT 
        id, 
        name, 
        email, 
        role,
        avatar,
        is_active,
        created_at,
        updated_at
       FROM users 
       WHERE is_active = 1`;
    const params = [];

    if (role) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role filter" });
      }
      sql += " AND role = ?";
      params.push(role);
    }

    sql += " ORDER BY name ASC";

    const [users] = await pool.execute(sql, params);

    return res.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
      total: users.length,
    });
  } catch (error) {
    console.error("Users fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/me — current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT 
        id, 
        name, 
        email, 
        role,
        avatar,
        is_active,
        created_at,
        updated_at
       FROM users 
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
  
    const user = users[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// GET /api/users/:id — admin or self only
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin" && String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [users] = await pool.execute(
      `SELECT 
        id, 
        name, 
        email, 
        role,
        avatar,
        is_active,
        created_at,
        updated_at
       FROM users 
       WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("User fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});


router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { id } = req.params;
    const { name, email, role, isActive, password } = req.body;
    const allowedRoles = ["admin", "sales", "user"];

    if (role !== undefined && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push("name = ?");
      params.push(name);
    }
    if (email !== undefined) {
      fields.push("email = ?");
      params.push(email);
    }
    if (role !== undefined) {
      fields.push("role = ?");
      params.push(role);
    }
    if (isActive !== undefined) {
      fields.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push("password = ?");
      params.push(hashedPassword);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    fields.push("updated_at = NOW()");
    params.push(id);

    await pool.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT id, name, email, role, avatar, is_active, created_at, updated_at
         FROM users WHERE id = ?`,
      [id]
    );

    const user = rows[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("User update error:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

// 🆕 NEW — DELETE /api/users/:id — admin only
// Hard-deletes the user row. If the user has linked records elsewhere
// (leads, invoices, etc. via created_by/assigned_to foreign keys), MySQL
// will reject the delete with a FK constraint error — caught below and
// turned into a friendly message pointing the admin at deactivation instead
// of silently orphaning data.
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
      return res
        .status(400)
        .json({ error: "You cannot delete your own account" });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    try {
      await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    } catch (fkError) {
      if (
        fkError.code === "ER_ROW_IS_REFERENCED_2" ||
        fkError.code === "ER_ROW_IS_REFERENCED"
      ) {
        return res.status(409).json({
          error:
            "This user has leads, invoices, or other records linked to them and can't be deleted. Deactivate the account instead.",
        });
      }
      throw fkError;
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("User delete error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;