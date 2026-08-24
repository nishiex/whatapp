process.env.NODE_ENV = process.env.NODE_ENV || "development";
require("dotenv").config();
try {
  Object.assign(process.env, require(`../env/${process.env.NODE_ENV}.json`));
} catch {}

const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

(async () => {
  try {
    console.log("Seeding user into DB:", process.env.DB_NAME, "on host:", process.env.DB_HOST);

    const userId = "36b69865-2cbf-49cd-aae1-cb5545bc4526";
    const name = "Nishit Patel";
    const email = "nishit@vasifytech.com";
    const plainPassword = "password123"; // default password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const role = "admin"; // Admin role grants full CRM access

    const [existing] = await pool.execute(
      "SELECT id, email, role FROM users WHERE id = ? OR email = ?",
      [userId, email]
    );

    if (existing.length > 0) {
      console.log(`User already exists (id: ${existing[0].id}, email: ${existing[0].email}). Updating record...`);
      await pool.execute(
        "UPDATE users SET id = ?, name = ?, password = ?, role = ?, is_active = 1, updated_at = NOW() WHERE email = ? OR id = ?",
        [userId, name, hashedPassword, role, email, userId]
      );
    } else {
      console.log("Inserting new user...");
      await pool.execute(
        `INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [userId, name, email, hashedPassword, role]
      );
    }

    console.log("✅ User seeded successfully!");
    console.log("-----------------------------------------");
    console.log(`User ID:   ${userId}`);
    console.log(`Name:      ${name}`);
    console.log(`Email:     ${email}`);
    console.log(`Password:  ${plainPassword}`);
    console.log(`Role:      ${role}`);
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
})();
