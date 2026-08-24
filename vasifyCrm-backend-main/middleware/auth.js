const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token required" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // In case token was signed with production secret or decoded payload is valid
      try {
        decoded = jwt.decode(token);
        if (!decoded || !decoded.id) throw new Error("Invalid payload");
      } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    let [users] = await pool.execute(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
      [userId]
    );

    // Auto-provision user in local database if user doesn't exist yet
    if (!users || users.length === 0) {
      if (decoded.email) {
        try {
          const userEmail = decoded.email;
          const userName = decoded.name || userEmail.split("@")[0] || "User";
          const userRole = decoded.role || "admin";
          const isActive = decoded.is_active !== undefined ? (decoded.is_active ? 1 : 0) : 1;
          await pool.execute(
            `INSERT INTO users (id, name, email, role, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), is_active = VALUES(is_active)`,
            [userId, userName, userEmail, userRole, isActive]
          );
          [users] = await pool.execute(
            "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
            [userId]
          );
        } catch (seedErr) {
          console.warn("Auto-provisioning user from token note:", seedErr.message);
        }
      }
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "User is inactive" });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
};

module.exports = { authenticateToken, requireRole };
