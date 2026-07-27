import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import { generateTicketNumber } from "../utils/helpers.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(authenticate);

/**
 * GET /api/tickets
 * List tickets with filters.
 */
router.get("/", (req, res) => {
  const { status, priority, limit, offset } = req.query;
  const queryLimit = Math.min(parseInt(limit) || 50, 200);
  const queryOffset = parseInt(offset) || 0;

  let sql = "SELECT * FROM tickets WHERE vendor_id = ?";
  const params = [req.vendor.id];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  if (priority) {
    sql += " AND priority = ?";
    params.push(priority);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(queryLimit, queryOffset);

  const tickets = db.prepare(sql).all(...params);
  const total = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ?").get(req.vendor.id);
  const openCount = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ? AND status IN ('open', 'in_progress')").get(req.vendor.id);

  res.json({ tickets, total: total.count, openCount: openCount.count, limit: queryLimit, offset: queryOffset });
});

/**
 * GET /api/tickets/:id
 * Get ticket details with replies.
 */
router.get("/:id", (req, res) => {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const replies = db.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC").all(req.params.id);

  res.json({ ticket, replies });
});

/**
 * PATCH /api/tickets/:id
 * Update ticket (status, priority, assignment).
 */
router.patch("/:id", (req, res) => {
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { status, priority, assignedTo } = req.body;
  const updates = [];
  const params = [];

  if (status) {
    updates.push("status = ?");
    params.push(status);
    if (status === "resolved") {
      updates.push("resolved_at = datetime('now')");
    }
    if (status === "in_progress" && !ticket.first_response_at) {
      updates.push("first_response_at = datetime('now')");
    }
  }

  if (priority) {
    updates.push("priority = ?");
    params.push(priority);
  }

  if (assignedTo !== undefined) {
    updates.push("assigned_to = ?");
    params.push(assignedTo);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);

  res.json({ ticket: updated });
});

/**
 * POST /api/tickets/:id/reply
 * Add a reply to a ticket.
 */
router.post("/:id/reply", (req, res) => {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { body, isInternalNote } = req.body;
  if (!body) return res.status(400).json({ error: "Reply body is required" });

  const replyId = uuidv4();
  db.prepare(`
    INSERT INTO ticket_replies (id, ticket_id, author_type, author_name, body, is_internal_note)
    VALUES (?, ?, 'agent', ?, ?, ?)
  `).run(replyId, req.params.id, req.vendor.company_name || "Support Agent", body, isInternalNote ? 1 : 0);

  // Update ticket status if it was open
  if (ticket.status === "open") {
    db.prepare("UPDATE tickets SET status = 'in_progress', first_response_at = COALESCE(first_response_at, datetime('now')), updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  }

  const reply = db.prepare("SELECT * FROM ticket_replies WHERE id = ?").get(replyId);
  res.status(201).json({ reply });
});

/**
 * POST /api/tickets/:id/assign
 * Assign ticket to an agent.
 */
router.post("/:id/assign", (req, res) => {
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { agentName } = req.body;
  db.prepare("UPDATE tickets SET assigned_to = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(agentName || "", req.params.id);

  res.json({ message: "Ticket assigned" });
});

export default router;
