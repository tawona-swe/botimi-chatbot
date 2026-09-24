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
  const volumeDays = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 365);

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

  // Conversation volume by day (defaults to last 14 days; ?days= widens the window)
  const volumeByDay = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM conversations WHERE vendor_id = ? AND created_at >= datetime('now', ?)
    GROUP BY date(created_at) ORDER BY date ASC
  `).all(vendorId, `-${volumeDays} days`);

  // Bot resolution stats
  const botResolution = db.prepare(
    "SELECT COUNT(*) as total, SUM(resolved_by_bot) as resolved FROM conversations WHERE vendor_id = ?"
  ).get(vendorId);

  // Visitor feedback on individual bot replies (thumbs up/down)
  const feedback = db.prepare(`
    SELECT
      SUM(CASE WHEN rating = 'up' THEN 1 ELSE 0 END) as up,
      SUM(CASE WHEN rating = 'down' THEN 1 ELSE 0 END) as down
    FROM messages
    WHERE role = 'bot' AND rating IS NOT NULL
      AND conversation_id IN (SELECT id FROM conversations WHERE vendor_id = ?)
  `).get(vendorId);

  const feedbackTotal = (feedback.up || 0) + (feedback.down || 0);

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
    feedback: {
      up: feedback.up || 0,
      down: feedback.down || 0,
      total: feedbackTotal,
      positiveRate: feedbackTotal > 0 ? Math.round(((feedback.up || 0) / feedbackTotal) * 1000) / 10 : null,
    },
  });
});

/**
 * GET /api/analytics/unanswered-questions
 * The specific questions the bot answered with low confidence — a knowledge
 * gap report, not a support-ticket feed. Available regardless of whether
 * the vendor pays for the ticket add-on (see messages.confident in
 * db/index.js's migration comment for why this is tracked independently of
 * ticket creation). Each row pairs the low-confidence bot answer with the
 * exact user message that triggered it, found via the nearest-preceding
 * user message in the same conversation — correct even when a single
 * conversation has both confident and unconfident turns.
 */
router.get("/unanswered-questions", (req, res) => {
  const vendorId = req.vendor.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  const rows = db.prepare(`
    SELECT
      m.id as messageId,
      m.content as answer,
      m.created_at as answeredAt,
      c.id as conversationId,
      c.bot_id as botId,
      c.visitor_name as visitorName,
      (
        SELECT content FROM messages um
        WHERE um.conversation_id = m.conversation_id AND um.role = 'user' AND um.created_at <= m.created_at
        ORDER BY um.created_at DESC LIMIT 1
      ) as question
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.vendor_id = ? AND m.role = 'bot' AND m.confident = 0
      AND NOT EXISTS (
        SELECT 1 FROM usage_events ue
        WHERE ue.vendor_id = c.vendor_id AND ue.event_type = 'knowledge_gap_answered'
          AND json_extract(ue.metadata, '$.messageId') = m.id
      )
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(vendorId, limit);
  // Deliberately excludes confident IS NULL: that value is ambiguous right
  // now between "genuinely no knowledge-base match" (a real signal, from
  // rag.js's isConfident=null branch) and "this message predates the
  // confident column" (every message before this feature shipped) — every
  // pre-existing bot message in the DB is NULL for the latter reason, so
  // including NULL here would surface old, correctly-answered messages as
  // false "unanswered questions." Only confident=0 is unambiguous (it never
  // existed before this feature), so that's the only thing queried.
  //
  // Gaps a vendor has already answered (see POST /api/bots/:id/knowledge-gaps)
  // are excluded via a usage_events row rather than mutating m.confident --
  // that column is a historical record of what actually happened at reply
  // time and other analytics (confidence trend charts) depend on it staying
  // accurate, so "answered" state lives in its own event instead.

  res.json({ questions: rows.filter((r) => r.question) });
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
