import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/conversations
 * List conversations with optional filters.
 */
router.get("/", (req, res) => {
  const { status, botId, limit, offset, from, to } = req.query;
  const queryLimit = Math.min(parseInt(limit) || 50, 200);
  const queryOffset = parseInt(offset) || 0;

  let sql = "SELECT * FROM conversations WHERE vendor_id = ?";
  const params = [req.vendor.id];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  if (botId) {
    sql += " AND bot_id = ?";
    params.push(botId);
  }

  if (from) {
    sql += " AND created_at >= ?";
    params.push(from);
  }

  if (to) {
    sql += " AND created_at <= ?";
    params.push(to);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(queryLimit, queryOffset);

  const conversations = db.prepare(sql).all(...params);
  const total = db.prepare("SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ?").get(req.vendor.id);

  res.json({ conversations, total: total.count, limit: queryLimit, offset: queryOffset });
});

/**
 * GET /api/conversations/:id
 * Get a specific conversation with all messages.
 */
router.get("/:id", (req, res) => {
  const conv = db.prepare("SELECT * FROM conversations WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const messages = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(req.params.id);

  res.json({ conversation: conv, messages });
});

/**
 * PATCH /api/conversations/:id
 * Update conversation (e.g., flag for review).
 */
router.patch("/:id", (req, res) => {
  const conv = db.prepare("SELECT id FROM conversations WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  if (req.body.status) {
    db.prepare("UPDATE conversations SET status = ?, ended_at = CASE WHEN ? IN ('resolved','escalated','abandoned') THEN datetime('now') ELSE ended_at END WHERE id = ?").run(req.body.status, req.body.status, req.params.id);
  }

  if (req.body.resolved_by_bot !== undefined) {
    db.prepare("UPDATE conversations SET resolved_by_bot = ? WHERE id = ?").run(req.body.resolved_by_bot ? 1 : 0, req.params.id);
  }

  const updated = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id);
  res.json({ conversation: updated });
});

/**
 * GET /api/conversations/export/csv
 * Export conversations as CSV.
 */
router.get("/export/csv", (req, res) => {
  const conversations = db.prepare(
    "SELECT id, status, resolved_by_bot, message_count, visitor_name, source, created_at FROM conversations WHERE vendor_id = ? ORDER BY created_at DESC"
  ).all(req.vendor.id);

  const header = "ID,Status,Resolved By Bot,Messages,Visitor,Source,Date";
  const rows = conversations.map((c) =>
    `${c.id},${c.status},${c.resolved_by_bot},${c.message_count},"${c.visitor_name || ""}",${c.source},${c.created_at}`
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=conversations.csv");
  res.send([header, ...rows].join("\n"));
});

export default router;
