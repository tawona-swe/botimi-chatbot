import Database from "better-sqlite3";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || resolve(__dirname, "../../data/botimi.db");

// Ensure the data directory exists
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Lightweight ad-hoc column migrations. schema.sql's CREATE TABLE IF NOT EXISTS
// only helps for brand-new tables — it won't retroactively add columns to a
// table that already exists. Each of these is idempotent: SQLite throws on a
// duplicate column, which we just swallow.
const COLUMN_MIGRATIONS = [
  ["sessions", "team_member_id", "TEXT REFERENCES team_members(id) ON DELETE CASCADE"],
  ["tickets", "assigned_team_member_id", "TEXT REFERENCES team_members(id) ON DELETE SET NULL"],
  ["tickets", "csat_rating", "INTEGER"],
  ["tickets", "csat_comment", "TEXT DEFAULT ''"],
  ["tickets", "ai_summary", "TEXT DEFAULT ''"],
  ["vendors", "sla_policy", "TEXT DEFAULT ''"],
  ["bots", "proactive_message", "TEXT DEFAULT ''"],
  ["bots", "proactive_delay_seconds", "INTEGER NOT NULL DEFAULT 15"],
  ["bots", "whatsapp_phone_number_id", "TEXT DEFAULT ''"],
];

function runColumnMigrations() {
  for (const [table, column, definition] of COLUMN_MIGRATIONS) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (err) {
      if (!/duplicate column name/i.test(err.message)) throw err;
    }
  }
}

export function migrate() {
  const schemaPath = resolve(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  runColumnMigrations();
  console.log("[DB] Migration complete.");
}

export default db;
