#!/usr/bin/env node
"use strict";

/**
 * Idempotent migration: add the customer columns the app's INSERT/UPDATE paths
 * require but that older databases are missing. Fixes:
 *   ER_BAD_FIELD_ERROR: Unknown column 'business_type' in 'field list'
 * (and the same class of error for sales_rep, *_date, deal_value, etc.)
 *
 * Targets the DB for the current NODE_ENV, loaded exactly like server.js:
 *   NODE_ENV=development  -> env/development.json  (default)
 *   NODE_ENV=production   -> env/production.json
 *
 * Run:  node scripts/add-customer-columns.js
 *       NODE_ENV=production node scripts/add-customer-columns.js
 */

process.env.NODE_ENV = process.env.NODE_ENV || "development";
try { require("dotenv").config(); } catch (_) {}
Object.assign(process.env, require(`../env/${process.env.NODE_ENV}.json`));

const { pool } = require("../config/database");

// Column name -> full ADD COLUMN definition. Types match how routes/customers.js
// reads/writes each field (money = DECIMAL(15,2), dates = DATE, text = VARCHAR).
const COLUMNS = [
  { name: "business_type",   def: "`business_type` VARCHAR(100) NULL" },
  { name: "sales_rep",       def: "`sales_rep` VARCHAR(255) NULL" },
  { name: "onboarding_date", def: "`onboarding_date` DATE NULL" },
  { name: "renewal_date",    def: "`renewal_date` DATE NULL" },
  { name: "closure_date",    def: "`closure_date` DATE NULL" },
  { name: "deal_value",      def: "`deal_value` DECIMAL(15,2) NULL" },
  { name: "paid_amount",     def: "`paid_amount` DECIMAL(15,2) NULL" },
  { name: "expected_amount", def: "`expected_amount` DECIMAL(15,2) NULL" },
];

const TABLE = "customers";

async function columnExists(dbName, table, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column]
  );
  return Number(rows[0] && rows[0].cnt) > 0;
}

async function main() {
  const dbName = process.env.DB_NAME;
  console.log(`[migrate] NODE_ENV=${process.env.NODE_ENV}  DB=${dbName} @ ${process.env.DB_HOST}`);

  let added = 0;
  let skipped = 0;

  for (const col of COLUMNS) {
    try {
      if (await columnExists(dbName, TABLE, col.name)) {
        console.log(`  = ${col.name} already exists — skipping`);
        skipped += 1;
        continue;
      }
      await pool.execute(`ALTER TABLE \`${TABLE}\` ADD COLUMN ${col.def}`);
      console.log(`  + added ${col.name}`);
      added += 1;
    } catch (err) {
      console.error(`  ! failed to add ${col.name}: ${err.code || ""} ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log(`[migrate] done — ${added} added, ${skipped} already present.`);
}

main()
  .catch((err) => {
    console.error("[migrate] fatal:", err.code || "", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await pool.end(); } catch (_) {}
  });
