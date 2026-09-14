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
  ["bots", "whatsapp_access_token", "TEXT DEFAULT ''"],
  ["messages", "rating", "TEXT"],
  ["vendors", "payment_provider", "TEXT NOT NULL DEFAULT 'pesepay'"],
  ["vendors", "pesepay_phone_number", "TEXT DEFAULT ''"],
  ["vendors", "next_charge_at", "TEXT"],
  ["vendors", "dunning_attempts", "INTEGER NOT NULL DEFAULT 0"],
  ["pesepay_charges", "plan_id", "TEXT NOT NULL DEFAULT 'starter'"],
  ["pesepay_charges", "method", "TEXT NOT NULL DEFAULT 'ecocash'"],
  ["pesepay_charges", "customer_reference", "TEXT DEFAULT ''"],
  ["vendors", "pesepay_payment_method", "TEXT DEFAULT ''"],
  ["vendors", "pesepay_currency", "TEXT DEFAULT ''"],
  // Running conversation-credit balance: renewals and top-ups both add to
  // it, every conversation subtracts one. Not a monthly cap that resets —
  // see pesepayBilling.js. conversations_limit stays as-is (now read as
  // "included per cycle" rather than a hard ceiling), conversations_used
  // stays a lifetime counter for analytics, neither gates access anymore.
  ["vendors", "conversation_credits", "INTEGER NOT NULL DEFAULT 0"],
  ["pesepay_charges", "charge_type", "TEXT NOT NULL DEFAULT 'subscription'"],
  // Marks a vendor row as internal (botimi's own dogfooding/test accounts,
  // e.g. the WhatsApp demo bot) rather than a real customer — excluded from
  // admin business metrics (MRR, churn, cohorts) so internal accounts don't
  // skew numbers meant to describe actual paying customers. Distinct from
  // is_superadmin, which is about platform access, not account "reality."
  ["vendors", "is_internal", "INTEGER NOT NULL DEFAULT 0"],
  // When a vendor's subscription_status became 'canceled' — needed for a real
  // point-in-time cohort retention curve (which cohort week was still active
  // N weeks later). Vendors that were already canceled before this column
  // existed have NULL here; the cohort view treats that as "unknown exact
  // date," not "never canceled" — see project_admin_dashboard memory.
  ["vendors", "canceled_at", "TEXT"],
  // Why a conversation got escalated ('bot_low_confidence' | 'credits_exhausted'),
  // tracked independently of whether the vendor pays for the ticket add-on.
  // Tickets (escalateToHuman in chat.js) only get created when ticket_addon
  // is on, but "which questions couldn't the bot confidently answer" is a
  // free-tier insight every vendor should see, not gated behind a paid
  // add-on that's about human-escalation convenience, not content gaps.
  ["conversations", "escalation_reason", "TEXT DEFAULT ''"],
  // Per-message confidence (1/0/NULL — NULL when there's no knowledge base
  // at all yet, so confidence doesn't apply). A conversation-level flag
  // isn't precise enough for "which questions couldn't the bot answer": a
  // single long conversation can have both confident and unconfident turns,
  // and only the message level can say exactly which question triggered
  // which answer.
  ["messages", "confident", "INTEGER"],
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

// knowledge_chunks_fts is a standalone shadow index (see schema.sql) with no
// real foreign key to knowledge_chunks, so CREATE TABLE IF NOT EXISTS alone
// leaves it empty for any chunk that existed before the table did. One-time
// backfill: if the fts table is empty but real chunks exist, populate it.
function backfillKnowledgeChunksFts() {
  const ftsCount = db.prepare("SELECT COUNT(*) as n FROM knowledge_chunks_fts").get().n;
  if (ftsCount > 0) return;

  const chunks = db.prepare("SELECT id, bot_id, content FROM knowledge_chunks").all();
  if (chunks.length === 0) return;

  const insert = db.prepare("INSERT INTO knowledge_chunks_fts (chunk_id, bot_id, content) VALUES (?, ?, ?)");
  const insertAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row.id, row.bot_id, row.content);
  });
  insertAll(chunks);
  console.log(`[DB] Backfilled ${chunks.length} chunk(s) into the FTS keyword index.`);
}

export function migrate() {
  const schemaPath = resolve(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  runColumnMigrations();
  backfillKnowledgeChunksFts();
  console.log("[DB] Migration complete.");
}

export default db;
