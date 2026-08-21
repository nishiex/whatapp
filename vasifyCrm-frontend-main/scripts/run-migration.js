const mysql = require("mysql2/promise")

async function runMigration() {
  console.log("[v0] Starting database migration...")

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  })

  console.log("[v0] Connected to MySQL database")
  console.log(`[v0] Database: ${process.env.DB_NAME}`)
  console.log(`[v0] Host: ${process.env.DB_HOST}`)
  console.log(`[v0] Port: ${process.env.DB_PORT || 3306}`)

  try {
    // Read and execute the schema
    const fs = require("fs")
    const path = require("path")
    const schemaPath = path.join(__dirname, "..", "backend", "database", "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    console.log("[v0] Executing database schema...")
    await connection.execute(schema)

    console.log("[v0] ✅ Database schema created successfully!")

    // Insert default admin user
    const bcrypt = require("bcryptjs")
    const hashedPassword = await bcrypt.hash("admin123", 10)

    await connection.execute(
      `
      INSERT IGNORE INTO users (name, email, password, role, created_at, updated_at) 
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `,
      ["Admin User", "admin@vasifytech.com", hashedPassword, "admin"],
    )

    console.log("[v0] ✅ Default admin user created!")
    console.log("[v0] Login credentials:")
    console.log("[v0] Email: admin@vasifytech.com")
    console.log("[v0] Password: admin123")

    // Insert sample data
    console.log("[v0] Inserting sample data...")

    // Sample customers
    await connection.execute(`
      INSERT IGNORE INTO customers (name, email, phone, company, status, created_at, updated_at) VALUES
      ('John Doe', 'john@example.com', '+1234567890', 'Tech Corp', 'active', NOW(), NOW()),
      ('Jane Smith', 'jane@example.com', '+1234567891', 'Digital Solutions', 'active', NOW(), NOW()),
      ('Mike Johnson', 'mike@example.com', '+1234567892', 'Innovation Labs', 'inactive', NOW(), NOW())
    `)

    // Sample leads
    await connection.execute(`
      INSERT IGNORE INTO leads (name, email, phone, company, source, status, created_at, updated_at) VALUES
      ('Sarah Wilson', 'sarah@prospect.com', '+1234567893', 'Future Tech', 'website', 'new', NOW(), NOW()),
      ('David Brown', 'david@startup.com', '+1234567894', 'Startup Inc', 'referral', 'qualified', NOW(), NOW()),
      ('Lisa Davis', 'lisa@enterprise.com', '+1234567895', 'Enterprise Co', 'cold_call', 'contacted', NOW(), NOW())
    `)

    // Sample deals
    await connection.execute(`
      INSERT IGNORE INTO deals (title, customer_id, value, stage, probability, expected_close_date, created_at, updated_at) VALUES
      ('Website Development', 1, 15000.00, 'proposal', 75, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW()),
      ('Mobile App Project', 2, 25000.00, 'negotiation', 60, DATE_ADD(NOW(), INTERVAL 45 DAY), NOW(), NOW()),
      ('Consulting Services', 1, 8000.00, 'closed_won', 100, NOW(), NOW(), NOW())
    `)

    console.log("[v0] ✅ Sample data inserted successfully!")
    console.log("[v0] 🎉 Database migration completed successfully!")
    console.log("[v0] Your CRM system is now ready to use!")
  } catch (error) {
    console.error("[v0] ❌ Migration failed:", error.message)
    throw error
  } finally {
    await connection.end()
    console.log("[v0] Database connection closed")
  }
}

runMigration().catch(console.error)
