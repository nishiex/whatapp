
const fs = require("fs")
const path = require("path")
const { pool } = require("../config/database")

async function runMigration() {
  try {
    console.log("🚀 Starting database migration...")

    const schemaPath = path.join(__dirname, "../database/schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--") && !stmt.startsWith("/*"))

    for (const statement of statements) {
      await pool.execute(statement)
    }

    console.log("✅ Database migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
