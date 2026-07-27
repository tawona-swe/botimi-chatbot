import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/analytics/overview
 * Dashboard overview analytics.
 */
router.get("/overview", (req, res) => {
  const vendorId = req.vendor.id;

  // Total conversations
  const totalConversations = db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ?"
  ).get(vendorId);

  // Today's conversations
  const todayConversations = db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ? AND date(created_at) = date('now')"
  ).get(vendorId);

  // This week
  const weekConversations = db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ? AND created_at >= datetime('now', '-7 days')"
  ).get(vendorId);

  // This month
  const monthConversations = db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ? AND created_at >= datetime('now', '-30 days')"
  ).get(vendorId);

  // Resolution rate
  const resolvedByBot = db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ? AND resolved_by_bot = 1"
  ).get(vendorId);

  const resolutionRate = totalConversations.count > 0
    ? Math.round((resolvedByBot.count / totalConversations.count) * 1000) / 10
    : 0;

  // Active sessions (last 5 minutes)
  const activeSessions = db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE vendor_id = ? AND status = 'active' AND created_at >= datetime('now', '-30 minutes')"
  ).get(vendorId);

  // Average response time (last 100 messages)
  const avgLatency = db.prepare(
    "SELECT AVG(latency_ms) as avg FROM messages WHERE role = 'bot' AND id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE vendor_id = ?) ORDER BY created_at DESC LIMIT 100)"
  ).get(vendorId);

  const avgResponseTime = avgLatency?.avg
    ? `${(avgLatency.avg / 1000).toFixed(1)}s`
    : "N/A";

  // Top 10 questions (most common user messages)
  const topQuestions = db.prepare(`
    SELECT content, COUNT(*) as count FROM messages
    WHERE role = 'user' AND conversation_id IN (SELECT id FROM conversations WHERE vendor_id = ?)
    GROUP BY content ORDER BY count DESC LIMIT 10
  `).all(vendorId);

  // Conversation volume by day (last 14 days)
  const volumeByDay = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM conversations WHERE vendor_id = ? AND created_at >= datetime('now', '-14 days')
    GROUP BY date(created_at) ORDER BY date ASC
  `).all(vendorId);

  // Bot resolution stats
  const botResolution = db.prepare(
    "SELECT COUNT(*) as total, SUM(resolved_by_bot) as resolved FROM conversations WHERE vendor_id = ?"
  ).get(vendorId);

  res.json({
    totalConversations: totalConversations.count,
    todayConversations: todayConversations.count,
    weekConversations: weekConversations.count,
    monthConversations: monthConversations.count,
    resolutionRate,
    activeSessions: activeSessions.count,
    avgResponseTime,
    topQuestions,
    volumeByDay,
    botResolution: {
      total: botResolution.total,
      resolvedByBot: botResolution.resolved || 0,
      escalated: botResolution.total - (botResolution.resolved || 0),
    },
  });
});

/**
 * GET /api/analytics/tickets
 * Ticket analytics for vendors with ticket add-on.
 */
router.get("/tickets", (req, res) => {
  const vendorId = req.vendor.id;

  const totalTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ?").get(vendorId);
  const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ? AND status IN ('open', 'in_progress')").get(vendorId);
  const resolvedTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE vendor_id = ? AND status = 'resolved'").get(vendorId);

  // Average first response time
  const avgFirstResponse = db.prepare(`
    SELECT AVG(
      (julianday(first_response_at) - julianday(created_at)) * 24 * 60
    ) as avg_minutes FROM tickets WHERE vendor_id = ? AND first_response_at IS NOT NULL
  `).get(vendorId);

  // Priority breakdown
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tickets WHERE vendor_id = ?
    GROUP BY priority
  `).all(vendorId);

  // Tickets by day (last 30 days)
  const byDay = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM tickets WHERE vendor_id = ? AND created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at) ORDER BY date ASC
  `).all(vendorId);

  res.json({
    totalTickets: totalTickets.count,
    openTickets: openTickets.count,
    resolvedTickets: resolvedTickets.count,
    avgFirstResponseMinutes: avgFirstResponse?.avg_minutes
      ? Math.round(avgFirstResponse.avg_minutes * 10) / 10
      : null,
    byPriority,
    byDay,
  });
});

export default router;
