-- botimi Database Schema (SQLite)
-- Multi-tenant SaaS chatbot platform

-- ============================================================
-- VENDORS (tenants / business accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  name              TEXT NOT NULL DEFAULT '',
  company_name      TEXT NOT NULL DEFAULT '',
  industry          TEXT DEFAULT '',
  logo_url          TEXT DEFAULT '',
  brand_color       TEXT DEFAULT '#c0c1ff',
  country           TEXT DEFAULT '',
  subscription_plan TEXT NOT NULL DEFAULT 'trial',  -- trial | starter | growth | scale
  subscription_status TEXT NOT NULL DEFAULT 'active', -- active | past_due | canceled | trialing
  stripe_customer_id TEXT DEFAULT '',
  stripe_subscription_id TEXT DEFAULT '',
  conversations_used INTEGER NOT NULL DEFAULT 0,
  conversations_limit INTEGER NOT NULL DEFAULT 500,
  ticket_addon       INTEGER NOT NULL DEFAULT 0,    -- 0 or 1
  trial_ends_at      TEXT,
  is_suspended       INTEGER NOT NULL DEFAULT 0,
  is_superadmin      INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at     TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SESSIONS (JWT refresh / session management)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BOTS (chatbot instances per vendor)
-- ============================================================
CREATE TABLE IF NOT EXISTS bots (
  id                  TEXT PRIMARY KEY,
  vendor_id           TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name                TEXT NOT NULL DEFAULT 'botimi AI',
  description         TEXT DEFAULT '',
  avatar_icon         TEXT DEFAULT 'smart_toy',
  welcome_message     TEXT DEFAULT 'Hello! I''ve analyzed your documentation. How can I help you today?',
  response_tone       TEXT NOT NULL DEFAULT 'professional', -- professional | friendly | concise
  model_provider      TEXT NOT NULL DEFAULT 'groq',
  model_name          TEXT NOT NULL DEFAULT 'llama3-70b',
  confidence_threshold REAL NOT NULL DEFAULT 0.7,
  widget_position     TEXT NOT NULL DEFAULT 'bottom-right', -- bottom-left | bottom-right
  widget_theme        TEXT NOT NULL DEFAULT 'dark', -- dark | light
  brand_color         TEXT DEFAULT '#c0c1ff',
  bot_greeting        TEXT DEFAULT 'Hi there! 👋',
  working_hours_start TEXT DEFAULT '09:00',
  working_hours_end   TEXT DEFAULT '18:00',
  working_hours_enabled INTEGER NOT NULL DEFAULT 0,
  offline_message     TEXT DEFAULT 'We''re currently offline. Leave a message and we''ll get back to you!',
  blacklist_topics    TEXT DEFAULT '[]', -- JSON array
  quick_replies       TEXT DEFAULT '["Pricing plans","API docs","Integrations","Talk to sales"]', -- JSON array
  is_active           INTEGER NOT NULL DEFAULT 1,
  installation_detected INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- KNOWLEDGE SOURCES (training data for bots)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id         TEXT PRIMARY KEY,
  bot_id     TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type       TEXT NOT NULL, -- website_crawl | document_upload | manual_text | qa_pairs | product_catalog
  title      TEXT NOT NULL DEFAULT '',
  url        TEXT DEFAULT '',
  file_path  TEXT DEFAULT '',
  file_type  TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending', -- pending | processing | indexed | error
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- KNOWLEDGE CHUNKS (vector store — embedded content)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id         TEXT PRIMARY KEY,
  source_id  TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  bot_id     TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  embedding  TEXT, -- JSON array of floats (stored as text for SQLite)
  chunk_index INTEGER NOT NULL DEFAULT 0,
  metadata   TEXT DEFAULT '{}', -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- CONVERSATIONS (chat sessions between visitors and bots)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY,
  bot_id     TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT DEFAULT '',
  visitor_email TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active', -- active | resolved | escalated | abandoned
  source     TEXT DEFAULT 'widget', -- widget | api | test_console
  metadata   TEXT DEFAULT '{}', -- JSON
  message_count INTEGER NOT NULL DEFAULT 0,
  resolved_by_bot INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- MESSAGES (individual chat messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL, -- user | bot | system
  content         TEXT NOT NULL,
  model_used      TEXT DEFAULT '',
  tokens_used     INTEGER DEFAULT 0,
  latency_ms      INTEGER DEFAULT 0,
  sources         TEXT DEFAULT '[]', -- JSON array of source references
  flagged         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TICKETS (escalated support tickets — add-on feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id              TEXT PRIMARY KEY,
  vendor_id       TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  ticket_number   TEXT NOT NULL UNIQUE,
  subject         TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
  priority        TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | urgent
  assigned_to     TEXT DEFAULT '',
  customer_name   TEXT NOT NULL DEFAULT '',
  customer_email  TEXT NOT NULL DEFAULT '',
  source          TEXT DEFAULT 'chat_escalation',
  first_response_at TEXT,
  resolved_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TICKET REPLIES (internal + customer-facing)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_replies (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL, -- agent | customer | system
  author_name TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  is_internal_note INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- USAGE EVENTS (conversation counting for billing)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_events (
  id         TEXT PRIMARY KEY,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- conversation | overage_alert
  metadata   TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bots_vendor ON bots(vendor_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_bot ON knowledge_sources(bot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_bot ON knowledge_chunks(bot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vendor ON knowledge_chunks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor ON conversations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot ON conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tickets_vendor ON tickets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_usage_vendor ON usage_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_events(event_type);
