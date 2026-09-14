import { Router } from "express";
import db from "../db/index.js";
import { authenticate, requireSuperadmin } from "../middleware/auth.js";
import { isLocalVendor, planPrice } from "../config.js";

const router = Router();

// All admin routes require auth + superadmin
router.use(authenticate);
router.use(requireSuperadmin);

// Every business-metric query in /overview and /cohorts excludes internal
// accounts (botimi's own superadmin login, dogfooding bots like the WhatsApp
// demo) — mixing those into MRR/churn/cohort numbers would misrepresent
// real customer behavior. This is NOT applied to /vendors or moderation
// endpoints, which are operational (an admin still needs to see/manage
// internal accounts there).
const REAL_VENDOR_FILTER = "is_internal = 0";

/**
 * GET /api/admin/overview
 * Platform-wide analytics dashboard. ?days=7|30|90 controls the two daily
 * trend series (default 30) — every other figure is all-time or "as of now."
 */
router.get("/overview", (req, res) => {
  const days = [7, 30, 90].includes(parseInt(req.query.days)) ? parseInt(req.query.days) : 30;

  // Total vendors
  const totalVendors = db.prepare(`SELECT COUNT(*) as count FROM vendors WHERE ${REAL_VENDOR_FILTER}`).get();
  const activeVendors = db.prepare(`SELECT COUNT(*) as count FROM vendors WHERE subscription_status = 'active' AND is_suspended = 0 AND ${REAL_VENDOR_FILTER}`).get();
  const trialVendors = db.prepare(`SELECT COUNT(*) as count FROM vendors WHERE subscription_plan = 'trial' AND ${REAL_VENDOR_FILTER}`).get();
  const churnedVendors = db.prepare(`SELECT COUNT(*) as count FROM vendors WHERE subscription_status = 'canceled' AND ${REAL_VENDOR_FILTER}`).get();

  // Conversations — scoped to real vendors' bots only.
  const totalConversations = db.prepare(`SELECT COUNT(*) as count FROM conversations c JOIN vendors v ON v.id = c.vendor_id WHERE v.${REAL_VENDOR_FILTER}`).get();
  const todayConversations = db.prepare(`SELECT COUNT(*) as count FROM conversations c JOIN vendors v ON v.id = c.vendor_id WHERE date(c.created_at) = date('now') AND v.${REAL_VENDOR_FILTER}`).get();
  const resolvedByBot = db.prepare(`SELECT COUNT(*) as count FROM conversations c JOIN vendors v ON v.id = c.vendor_id WHERE c.resolved_by_bot = 1 AND v.${REAL_VENDOR_FILTER}`).get();
  const resolutionRate = totalConversations.count > 0
    ? Math.round((resolvedByBot.count / totalConversations.count) * 100)
    : 0;

  // Tickets
  const openTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets t JOIN vendors v ON v.id = t.vendor_id WHERE t.status IN ('open', 'in_progress') AND v.${REAL_VENDOR_FILTER}`).get();
  const totalTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets t JOIN vendors v ON v.id = t.vendor_id WHERE v.${REAL_VENDOR_FILTER}`).get();

  // Flagged messages (content moderation) — deliberately NOT filtered by
  // is_internal: moderation should still catch anything flagged anywhere.
  const flaggedMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE flagged = 1").get();

  // Conversations by plan
  const byPlan = db.prepare(`
    SELECT v.subscription_plan as plan, COUNT(c.id) as count
    FROM conversations c JOIN vendors v ON v.id = c.vendor_id
    WHERE v.${REAL_VENDOR_FILTER}
    GROUP BY v.subscription_plan ORDER BY count DESC
  `).all();

  // Model usage breakdown — deliberately NOT filtered: this tracks real
  // inference/API cost regardless of which account triggered it.
  const modelUsage = db.prepare(`
    SELECT model_used, COUNT(*) as count
    FROM messages WHERE model_used != '' AND model_used IS NOT NULL
    GROUP BY model_used ORDER BY count DESC
  `).all();

  // Revenue estimation — per-vendor, not per-plan, since local (Zimbabwe)
  // and international vendors on the same plan pay different amounts (see
  // config.js's isLocalVendor/planPrice). A flat price-per-plan table here
  // would silently drift from config.js's real numbers, same class of bug
  // already caught in the guest/dashboard assistant prompts.
  const activePlanVendors = db.prepare(`
    SELECT subscription_plan, country FROM vendors
    WHERE subscription_status = 'active' AND is_suspended = 0 AND ${REAL_VENDOR_FILTER}
  `).all();

  const mrr = activePlanVendors.reduce((sum, v) => {
    return sum + (planPrice(v.subscription_plan, isLocalVendor(v)) || 0);
  }, 0);

  // Growth (new vendors this month)
  const newVendorsThisMonth = db.prepare(
    `SELECT COUNT(*) as count FROM vendors WHERE created_at >= datetime('now', '-30 days') AND ${REAL_VENDOR_FILTER}`
  ).get();

  // Churn rate as a percentage — the raw churnedVendors count alone doesn't
  // say whether that's a lot or a little without dividing by the base.
  const churnRate = totalVendors.count > 0
    ? Math.round((churnedVendors.count / totalVendors.count) * 1000) / 10
    : 0;

  // Churn broken down by the plan the vendor was on — which tier actually
  // loses the most customers, not just an overall blended rate.
  const churnByPlan = db.prepare(`
    SELECT subscription_plan as plan, COUNT(*) as count FROM vendors
    WHERE subscription_status = 'canceled' AND ${REAL_VENDOR_FILTER}
    GROUP BY subscription_plan ORDER BY count DESC
  `).all();

  // Platform-wide feedback (thumbs up/down) — per-vendor analytics already
  // surfaces this (routes/analytics.js), but it was never aggregated across
  // the whole platform for the admin view.
  const feedback = db.prepare(`
    SELECT
      SUM(CASE WHEN rating = 'up' THEN 1 ELSE 0 END) as up,
      SUM(CASE WHEN rating = 'down' THEN 1 ELSE 0 END) as down
    FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN vendors v ON v.id = c.vendor_id
    WHERE m.role = 'bot' AND m.rating IS NOT NULL AND v.${REAL_VENDOR_FILTER}
  `).get();
  const feedbackTotal = (feedback.up || 0) + (feedback.down || 0);
  const satisfactionRate = feedbackTotal > 0 ? Math.round(((feedback.up || 0) / feedbackTotal) * 100) : null;

  // Per-vendor feedback breakdown — which specific accounts are getting
  // negative ratings, not just a platform-wide blend. Sorted worst-first
  // (lowest satisfaction, among vendors with at least one rating) since
  // that's the actionable end of the list.
  const feedbackByVendor = db.prepare(`
    SELECT v.id, v.company_name, v.email,
      SUM(CASE WHEN m.rating = 'up' THEN 1 ELSE 0 END) as up,
      SUM(CASE WHEN m.rating = 'down' THEN 1 ELSE 0 END) as down
    FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN vendors v ON v.id = c.vendor_id
    WHERE m.role = 'bot' AND m.rating IS NOT NULL AND v.${REAL_VENDOR_FILTER}
    GROUP BY v.id
    ORDER BY (CAST(SUM(CASE WHEN m.rating = 'up' THEN 1 ELSE 0 END) AS REAL) / (SUM(CASE WHEN m.rating = 'up' THEN 1 ELSE 0 END) + SUM(CASE WHEN m.rating = 'down' THEN 1 ELSE 0 END))) ASC
    LIMIT 10
  `).all().map((r) => ({ ...r, satisfactionRate: Math.round((r.up / (r.up + r.down)) * 100) }));

  // Daily time series for the requested range — one grouped query each,
  // then filled to a complete gap-free series in JS so a day with zero
  // activity still renders as a real 0 point instead of vanishing.
  const dailySignupRows = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count FROM vendors
    WHERE created_at >= datetime('now', ?) AND ${REAL_VENDOR_FILTER} GROUP BY day
  `).all(`-${days} days`);
  const dailyConversationRows = db.prepare(`
    SELECT date(c.created_at) as day, COUNT(*) as count
    FROM conversations c JOIN vendors v ON v.id = c.vendor_id
    WHERE c.created_at >= datetime('now', ?) AND v.${REAL_VENDOR_FILTER} GROUP BY day
  `).all(`-${days} days`);

  function fillDailySeries(rows) {
    const byDay = Object.fromEntries(rows.map((r) => [r.day, r.count]));
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      result.push({ date: d, count: byDay[d] || 0 });
    }
    return result;
  }

  res.json({
    totalVendors: totalVendors.count,
    activeVendors: activeVendors.count,
    trialVendors: trialVendors.count,
    churnedVendors: churnedVendors.count,
    churnRate,
    churnByPlan,
    newVendorsThisMonth: newVendorsThisMonth.count,
    totalConversations: totalConversations.count,
    todayConversations: todayConversations.count,
    resolutionRate,
    openTickets: openTickets.count,
    totalTickets: totalTickets.count,
    flaggedMessages: flaggedMessages.count,
    feedbackUp: feedback.up || 0,
    feedbackDown: feedback.down || 0,
    satisfactionRate,
    feedbackByVendor,
    mrr,
    byPlan,
    modelUsage,
    days,
    dailySignups: fillDailySeries(dailySignupRows),
    dailyConversations: fillDailySeries(dailyConversationRows),
  });
});

/**
 * GET /api/admin/cohorts
 * Weekly signup-cohort retention: of the vendors who signed up in a given
 * week, what % were still not canceled N weeks later.
 *
 * Retention before this feature existed is necessarily approximate: a
 * vendor already canceled before the `canceled_at` column was added has no
 * recorded cancellation date, so it's treated as churned immediately (a
 * conservative floor, not a reconstruction of the real date) — flagged via
 * `unknownChurnCount` per cell and the top-level `note`, not silently
 * assumed accurate.
 */
router.get("/cohorts", (req, res) => {
  const vendors = db.prepare(`SELECT id, created_at, subscription_status, canceled_at FROM vendors WHERE ${REAL_VENDOR_FILTER}`).all();

  function startOfWeek(sqliteDatetime) {
    const d = new Date(sqliteDatetime.replace(" ", "T") + "Z");
    const daysSinceMonday = (d.getUTCDay() + 6) % 7; // getUTCDay: 0=Sun..6=Sat
    d.setUTCDate(d.getUTCDate() - daysSinceMonday);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  const cohorts = new Map();
  for (const v of vendors) {
    const key = startOfWeek(v.created_at).toISOString().slice(0, 10);
    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key).push(v);
  }

  const MAX_OFFSET_WEEKS = 8;
  const now = Date.now();

  const rows = [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortWeek, members]) => {
      const weekStartMs = new Date(`${cohortWeek}T00:00:00Z`).getTime();
      const weeksElapsed = Math.floor((now - weekStartMs) / (7 * 24 * 60 * 60 * 1000));
      const maxOffset = Math.min(weeksElapsed, MAX_OFFSET_WEEKS);

      const retention = [];
      for (let offsetWeeks = 0; offsetWeeks <= maxOffset; offsetWeeks++) {
        const checkpointMs = weekStartMs + offsetWeeks * 7 * 24 * 60 * 60 * 1000;
        let retained = 0;
        let unknownChurn = 0;
        for (const m of members) {
          if (m.subscription_status !== "canceled") {
            retained++;
          } else if (m.canceled_at) {
            const canceledMs = new Date(m.canceled_at.replace(" ", "T") + "Z").getTime();
            if (canceledMs > checkpointMs) retained++;
          } else {
            unknownChurn++;
          }
        }
        retention.push({
          offsetWeeks,
          retainedCount: retained,
          totalCount: members.length,
          retainedPct: Math.round((retained / members.length) * 100),
          unknownChurnCount: unknownChurn,
        });
      }

      return { cohortWeek, cohortSize: members.length, retention };
    });

  res.json({
    cohorts: rows,
    note: "Retention for cancellations that happened before canceled_at tracking existed is approximated as churned immediately (a conservative floor) — see unknownChurnCount per cell.",
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

  // Manual status change needs the same canceled_at bookkeeping as the
  // automatic dunning cancellation (pesepayBilling.js), so cohort retention
  // can tell a real cancellation date from "never set" either way.
  if (req.body.subscription_status === "canceled") {
    updates.push("canceled_at = datetime('now')");
  } else if (req.body.subscription_status !== undefined) {
    updates.push("canceled_at = NULL");
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
