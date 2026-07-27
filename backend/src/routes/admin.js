import { Router } from "express";
import db from "../db/index.js";
import { authenticate, requireSuperadmin } from "../middleware/auth.js";

const router = Router();

// All admin routes require auth + superadmin
router.use(authenticate);
router.use(requireSuperadmin);

/**
 * GET /api/admin/overview
 * Platform-wide analytics dashboard.
 */
router.get("/overview", (req, res) => {
  // Total vendors
  const totalVendors = db.prepare("SELECT COUNT(*) as count FROM vendors").get();
  const activeVendors = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE subscription_status = 'active' AND is_suspended = 0").get();
  const trialVendors = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE subscription_plan = 'trial'").get();
  const churnedVendors = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE subscription_status = 'canceled'").get();

  // Conversations
  const totalConversations = db.prepare("SELECT COUNT(*) as count FROM conversations").get();
  const todayConversations = db.prepare("SELECT COUNT(*) as count FROM conversations WHERE date(created_at) = date('now')").get();
  const resolvedByBot = db.prepare("SELECT COUNT(*) as count FROM conversations WHERE resolved_by_bot = 1").get();
  const resolutionRate = totalConversations.count > 0
    ? Math.round((resolvedByBot.count / totalConversations.count) * 100)
    : 0;

  // Tickets
  const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('open', 'in_progress')").get();
  const totalTickets = db.prepare("SELECT COUNT(*) as count FROM tickets").get();

  // Flagged messages (content moderation)
  const flaggedMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE flagged = 1").get();

  // Conversations by plan
  const byPlan = db.prepare(`
    SELECT v.subscription_plan as plan, COUNT(c.id) as count
    FROM conversations c JOIN vendors v ON v.id = c.vendor_id
    GROUP BY v.subscription_plan ORDER BY count DESC
  `).all();

  // Model usage breakdown
  const modelUsage = db.prepare(`
    SELECT model_used, COUNT(*) as count
    FROM messages WHERE model_used != '' AND model_used IS NOT NULL
    GROUP BY model_used ORDER BY count DESC
  `).all();

  // Revenue estimation (simplified: count of active vendors * plan price)
  const planPrices = { starter: 29, growth: 79, scale: 199 };
  const revenueByPlan = db.prepare(`
    SELECT subscription_plan, COUNT(*) as count
    FROM vendors WHERE subscription_status = 'active' AND is_suspended = 0
    GROUP BY subscription_plan
  `).all();

  const mrr = revenueByPlan.reduce((sum, r) => {
    const price = planPrices[r.subscription_plan] || 0;
    return sum + (price * r.count);
  }, 0);

  // Growth (new vendors this month)
  const newVendorsThisMonth = db.prepare(
    "SELECT COUNT(*) as count FROM vendors WHERE created_at >= datetime('now', '-30 days')"
  ).get();

  res.json({
    totalVendors: totalVendors.count,
    activeVendors: activeVendors.count,
    trialVendors: trialVendors.count,
    churnedVendors: churnedVendors.count,
    newVendorsThisMonth: newVendorsThisMonth.count,
    totalConversations: totalConversations.count,
    todayConversations: todayConversations.count,
    resolutionRate,
    openTickets: openTickets.count,
    totalTickets: totalTickets.count,
    flaggedMessages: flaggedMessages.count,
    mrr,
    byPlan,
    modelUsage,
  });
});

/**
 * GET /api/admin/vendors
 * List all vendors with search & filter.
 */
router.get("/vendors", (req, res) => {
  const { search, plan, status, limit, offset } = req.query;
  const queryLimit = Math.min(parseInt(limit) || 50, 200);
  const queryOffset = parseInt(offset) || 0;

  let sql = "SELECT id, email, name, company_name, industry, subscription_plan, subscription_status, is_suspended, ticket_addon, conversations_used, conversations_limit, trial_ends_at, created_at, last_active_at FROM vendors WHERE 1=1";
  const params = [];

  if (search) {
    sql += " AND (email LIKE ? OR company_name LIKE ? OR name LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (plan) {
    sql += " AND subscription_plan = ?";
    params.push(plan);
  }

  if (status) {
    sql += " AND subscription_status = ?";
    params.push(status);
  }

  const total = db.prepare(sql.replace(/SELECT .* FROM/, "SELECT COUNT(*) as count FROM")).get(...params);
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(queryLimit, queryOffset);

  const vendors = db.prepare(sql).all(...params);

  res.json({
    vendors: vendors.map(v => ({ ...v, ticketAddon: !!v.ticket_addon })),
    total: total.count,
    limit: queryLimit,
    offset: queryOffset,
  });
});

/**
 * PATCH /api/admin/vendors/:id
 * Update vendor (suspend, plan override, etc.).
 */
router.patch("/vendors/:id", (req, res) => {
  const vendor = db.prepare("SELECT id FROM vendors WHERE id = ?").get(req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });

  const allowed = ["is_suspended", "subscription_plan", "subscription_status", "conversations_limit", "ticket_addon"];
  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE vendors SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT id, email, name, company_name, subscription_plan, subscription_status, is_suspended FROM vendors WHERE id = ?").get(req.params.id);
  res.json({ vendor: updated });
});

/**
 * GET /api/admin/flagged-messages
 * Content moderation — view flagged messages.
 */
router.get("/flagged-messages", (req, res) => {
  const { limit, offset } = req.query;
  const queryLimit = Math.min(parseInt(limit) || 50, 200);
  const queryOffset = parseInt(offset) || 0;

  const messages = db.prepare(`
    SELECT m.id, m.content, m.role, m.created_at, m.conversation_id,
           c.vendor_id, v.company_name as vendor_name
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN vendors v ON v.id = c.vendor_id
    WHERE m.flagged = 1
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(queryLimit, queryOffset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE flagged = 1
  `).get();

  res.json({ messages, total: total.count, limit: queryLimit, offset: queryOffset });
});

/**
 * PATCH /api/admin/flagged-messages/:id
 * Clear flag on a message (dismiss moderation).
 */
router.patch("/flagged-messages/:id", (req, res) => {
  db.prepare("UPDATE messages SET flagged = 0 WHERE id = ?").run(req.params.id);
  res.json({ message: "Flag cleared" });
});

/**
 * GET /api/admin/impersonate/:vendorId
 * Get a vendor's dashboard data (superadmin view-as).
 */
router.get("/impersonate/:vendorId", (req, res) => {
  const vendor = db.prepare("SELECT id, email, name, company_name, subscription_plan, subscription_status FROM vendors WHERE id = ?").get(req.params.vendorId);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });

  const bots = db.prepare("SELECT id, name, is_active FROM bots WHERE vendor_id = ?").all(req.params.vendorId);
  const conversations = db.prepare("SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ?").get(req.params.vendorId);
  const tickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ?").get(req.params.vendorId);

  res.json({ vendor, bots, conversations: conversations.count, tickets: tickets.count });
});

export default router;
