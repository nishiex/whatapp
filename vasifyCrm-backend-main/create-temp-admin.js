// create-temp-admin.js
// FIX: index.js loads env/{NODE_ENV}.json and merges it into process.env
// via Object.assign BEFORE requiring config/database.js. Standalone debug
// scripts that only do `require("./config/database")` skip that step
// entirely, so DB_NAME/DB_USER/DB_PASSWORD are all undefined and
// config/database.js silently falls back to its hardcoded defaults
// (host 13.203.39.243, db "vasifytech_dev" — an empty/unused database).
// That's why every previous run hit "Table 'vasifytech_dev.users'
// doesn't exist" — it was never talking to the real database.
//
// Run with:   set NODE_ENV=production && node create-temp-admin.js   (cmd.exe)
//        or:  $env:NODE_ENV="production"; node create-temp-admin.js  (PowerShell)
//
// Use "production" to match whatever crm-api.vasifytech.com actually runs as,
// or "development" if you specifically want to seed the dev database instead.

process.env.NODE_ENV = process.env.NODE_ENV || "production";
require("dotenv").config();
Object.assign(process.env, require(`./env/${process.env.NODE_ENV}.json`));

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("./config/database");

(async () => {
  try {
    console.log("Connecting to DB:", process.env.DB_NAME, "on host", process.env.DB_HOST);

    const email = "tempadmin@vasifytech.com";
    const plain = "TempAdmin@2026";
    const hash = await bcrypt.hash(plain, 10);
    const id = crypto.randomUUID();

    // Sanity check: confirm we're hitting the real table with real data
    const [existing] = await pool.execute("SELECT COUNT(*) as count FROM users");
    console.log("Total existing users in this DB:", existing[0].count);

    const [check] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (check.length > 0) {
      console.log("User already exists, updating password instead.");
      await pool.execute(
        "UPDATE users SET password = ?, is_active = 1 WHERE email = ?",
        [hash, email]
      );
    } else {
      await pool.execute(
        "INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [id, "Temp Admin", email, hash, "admin", 1]
      );
    }

    const [rows] = await pool.execute("SELECT password FROM users WHERE email = ?", [email]);
    const matches = await bcrypt.compare(plain, rows[0].password);
    console.log("Created/updated user:", email);
    console.log("Password verifies:", matches);
    console.log("Login with:", email, "/", plain);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();