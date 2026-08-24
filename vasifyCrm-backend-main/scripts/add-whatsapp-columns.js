#!/usr/bin/env node

// Load env exactly like server.js so this targets the SAME DB the app uses
// (env/<NODE_ENV>.json), not the hardcoded fallbacks in config/database.js.
process.env.NODE_ENV = process.env.NODE_ENV || "development";
try { require("dotenv").config(); } catch (_) {}
Object.assign(process.env, require(`../env/${process.env.NODE_ENV}.json`));

const { pool } = require('../config/database');

async function columnExists(dbName, tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, tableName, columnName]
  );
  return rows[0] && (rows[0].cnt || rows[0]['COUNT(*)'] || Object.values(rows[0])[0]) > 0;
}

async function addColumn(tableName, columnDef) {
  await pool.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDef}`);
}

async function main() {
  try {
    const dbName = process.env.DB_NAME || 'vasify_crm_new_dev';
    const table = 'invoices';
    const columns = [
      { name: 'whatsapp_sent', def: "`whatsapp_sent` TINYINT(1) NOT NULL DEFAULT 0" },
      { name: 'whatsapp_sent_at', def: "`whatsapp_sent_at` DATETIME NULL" },
      { name: 'whatsapp_status', def: "`whatsapp_status` VARCHAR(50) NULL" },
    ];

    console.log(`Using DB: ${dbName}`);

    for (const col of columns) {
      const exists = await columnExists(dbName, table, col.name);
      if (exists) {
        console.log(`Column '${col.name}' already exists on '${table}'. Skipping.`);
        continue;
      }

      console.log(`Adding column '${col.name}' to '${table}'...`);
      try {
        await addColumn(table, col.def);
        console.log(`Added column '${col.name}'.`);
      } catch (err) {
        console.error(`Failed to add column '${col.name}':`, err.message || err);
        // mark non-zero exit but continue trying other columns
        process.exitCode = 1;
      }
    }
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch(e){}
  }
}

main();
