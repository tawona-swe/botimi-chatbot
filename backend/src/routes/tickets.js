import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import { generateTicketNumber } from "../utils/helpers.js";
import { getSlaPolicy, computeSlaStatus } from "../services/sla.js";
import { chatCompletion } from "../services/modelRouter.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(authenticate);

/**
 * GET /api/tickets
 * List tickets with filters.
 */
router.get("/", (req, res) => {
  const { status, priority, limit, offset, tag } = req.query;
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

  if (tag) {
    sql += " AND id IN (SELECT ticket_id FROM ticket_tags WHERE tag = ?)";
    params.push(tag);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(queryLimit, queryOffset);

  const tickets = db.prepare(sql).all(...params);
  const total = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ?").get(req.vendor.id);
  const openCount = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ? AND status IN ('open', 'in_progress')").get(req.vendor.id);

  const policy = getSlaPolicy(req.vendor);
  const tagsStmt = db.prepare("SELECT tag FROM ticket_tags WHERE ticket_id = ?");
  const enriched = tickets.map((t) => ({
    ...t,
    sla: computeSlaStatus(t, policy),
    tags: tagsStmt.all(t.id).map((r) => r.tag),
  }));

  res.json({ tickets: enriched, total: total.count, openCount: openCount.count, limit: queryLimit, offset: queryOffset });
});

/**
 * GET /api/tickets/:id
 * Get ticket details with replies.
 */
router.get("/:id", (req, res) => {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const replies = db.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC").all(req.params.id);
  const tags = db.prepare("SELECT tag FROM ticket_tags WHERE ticket_id = ?").all(req.params.id).map((r) => r.tag);
  const sla = computeSlaStatus(ticket, getSlaPolicy(req.vendor));

  res.json({ ticket: { ...ticket, tags, sla }, replies });
});

/**
 * POST /api/tickets/:id/tags
 * Add a tag.
 */
router.post("/:id/tags", (req, res) => {
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const tag = (req.body.tag || "").trim().toLowerCase().slice(0, 40);
  if (!tag) return res.status(400).json({ error: "Tag is required" });

  try {
    db.prepare("INSERT INTO ticket_tags (id, ticket_id, tag) VALUES (?, ?, ?)").run(uuidv4(), req.params.id, tag);
  } catch {
    // Duplicate tag on this ticket — fine, treat as a no-op.
  }

  const tags = db.prepare("SELECT tag FROM ticket_tags WHERE ticket_id = ?").all(req.params.id).map((r) => r.tag);
  res.json({ tags });
});

/**
 * DELETE /api/tickets/:id/tags/:tag
 */
router.delete("/:id/tags/:tag", (req, res) => {
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  db.prepare("DELETE FROM ticket_tags WHERE ticket_id = ? AND tag = ?").run(req.params.id, req.params.tag.toLowerCase());
  const tags = db.prepare("SELECT tag FROM ticket_tags WHERE ticket_id = ?").all(req.params.id).map((r) => r.tag);
  res.json({ tags });
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

  if (status === "resolved" && updated.customer_email) {
    import("../services/email.js").then(({ sendTicketResolvedWithCsat }) => {
      sendTicketResolvedWithCsat(updated.customer_email, updated.ticket_number, updated.subject, updated.id).catch(() => {});
    });
  }

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
  const authorName = req.teamMember?.name || req.vendor.name || req.vendor.company_name || "Support Agent";
  db.prepare(`
    INSERT INTO ticket_replies (id, ticket_id, author_type, author_name, body, is_internal_note)
    VALUES (?, ?, 'agent', ?, ?, ?)
  `).run(replyId, req.params.id, authorName, body, isInternalNote ? 1 : 0);

  // Update ticket status if it was open
  if (ticket.status === "open") {
    db.prepare("UPDATE tickets SET status = 'in_progress', first_response_at = COALESCE(first_response_at, datetime('now')), updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  }

  const reply = db.prepare("SELECT * FROM ticket_replies WHERE id = ?").get(replyId);
  res.status(201).json({ reply });
});

/**
 * POST /api/tickets/:id/suggest-reply
 * Draft a suggested agent reply from the ticket + conversation context. No
 * DB write — the agent reviews/edits before actually sending via the
 * existing reply endpoint above.
 */
router.post("/:id/suggest-reply", async (req, res) => {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  try {
    const replies = db.prepare("SELECT author_type, author_name, body, is_internal_note FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC").all(req.params.id);

    let conversationTranscript = "";
    if (ticket.conversation_id) {
      const convMessages = db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(ticket.conversation_id);
      conversationTranscript = convMessages.map((m) => `${m.role === "user" ? "Customer" : "Bot"}: ${m.content}`).join("\n");
    }

    const replyTranscript = replies
      .filter((r) => !r.is_internal_note)
      .map((r) => `${r.author_type === "customer" ? "Customer" : r.author_name || "Agent"}: ${r.body}`)
      .join("\n");

    const context = [
      `Subject: ${ticket.subject}`,
      `Customer's original message: ${ticket.description}`,
      conversationTranscript ? `\nOriginal bot conversation:\n${conversationTranscript}` : "",
      replyTranscript ? `\nTicket reply history:\n${replyTranscript}` : "",
    ].filter(Boolean).join("\n");

    const result = await chatCompletion([
      { role: "system", content: "You are drafting a reply for a human support agent to review and send. Be helpful, specific to the customer's actual issue, and concise. Do not invent facts not present in the context — if information is missing, say the agent should confirm details with the customer. Output only the reply text, no preamble." },
      { role: "user", content: context },
    ], { temperature: 0.5, maxTokens: 400 });

    res.json({ suggestion: result.content });
  } catch (err) {
    console.error("[Tickets] Suggest reply error:", err);
    res.status(500).json({ error: "Failed to generate a suggested reply" });
  }
});

/**
 * POST /api/tickets/:id/assign
 * Assign ticket to a real team member (preferred) or a free-text agent name
 * (legacy — kept for back-compat with any existing callers).
 */
router.post("/:id/assign", (req, res) => {
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { teamMemberId, agentName } = req.body;

  if (teamMemberId === req.vendor.id) {
    // Assigning to the account owner — not a team_members row, so no FK to set.
    db.prepare("UPDATE tickets SET assigned_team_member_id = NULL, assigned_to = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(req.vendor.name || req.vendor.email, req.params.id);
  } else if (teamMemberId) {
    const member = db.prepare("SELECT id, name FROM team_members WHERE id = ? AND vendor_id = ?").get(teamMemberId, req.vendor.id);
    if (!member) return res.status(404).json({ error: "Team member not found" });
    db.prepare("UPDATE tickets SET assigned_team_member_id = ?, assigned_to = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(member.id, member.name, req.params.id);
  } else {
    db.prepare("UPDATE tickets SET assigned_team_member_id = NULL, assigned_to = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(agentName || "", req.params.id);
  }

  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  res.json({ ticket: updated });
});

export default router;
