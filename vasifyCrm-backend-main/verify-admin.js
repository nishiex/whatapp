// verify-admin.js
process.env.NODE_ENV = process.env.NODE_ENV || "production"; // match what the live server uses
require("dotenv").config();
Object.assign(process.env, require(`./env/${process.env.NODE_ENV}.json`));

const bcrypt = require("bcryptjs");
const { pool } = require("./config/database");

(async () => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, password, role, is_active FROM users WHERE email = ?",
      ["admin@vasifytech.com"]
    );

    if (rows.length === 0) {
      console.log("No user found with that email.");
      process.exit(0);
    }

    const user = rows[0];
    console.log("User found:", { id: user.id, email: user.email, role: user.role, is_active: user.is_active });
    console.log("Hash length:", user.password.length); // should be 60

    const matches = await bcrypt.compare("Admin@123", user.password);
    console.log("Does 'Admin@123' match stored hash?", matches);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();