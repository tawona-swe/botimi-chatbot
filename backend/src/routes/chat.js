import { Router } from "express";
import db from "../db/index.js";
import { chatRateLimiter } from "../middleware/rateLimit.js";
import { generateRagResponse } from "../services/rag.js";
import { checkVendorOverage } from "../services/overage.js";
import { classifyPriority, summarizeConversation } from "../services/classify.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// CORS is handled centrally in index.js (dynamic per-request origin
// delegate). CORP still needs overriding here — see routes/widget.js for why.
router.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

/**
 * Create a support ticket for a conversation the bot can't handle — either
 * because it wasn't confident in an answer, or because the vendor's credit
 * balance ran out. Shared so both cases get the same real pipeline: a ticket
 * in the dashboard, a vendor email, and background priority/summary fill-in.
 * No-op if ticketing isn't enabled or a ticket already exists for this
 * conversation (a low-confidence answer and an exhausted balance could both
 * fire on the same conversation otherwise).
 */
async function escalateToHuman({ bot, vendorEmail, convId, message, visitorName, source }) {
  if (!bot.ticket_addon) return;
  const existingTicket = db.prepare("SELECT id FROM tickets WHERE conversation_id = ?").get(convId);
  if (existingTicket) return;

  const { generateTicketNumber } = await import("../utils/helpers.js");
  const ticketId = uuidv4();
  const ticketNumber = generateTicketNumber();
  const subject = message.slice(0, 100);
  db.prepare(`
    INSERT INTO tickets (id, vendor_id, conversation_id, ticket_number, subject, description, status, priority, customer_name, customer_email, source)
    VALUES (?, ?, ?, ?, ?, ?, 'open', 'medium', ?, ?, ?)
  `).run(ticketId, bot.vendor_id, convId, ticketNumber, subject, message, visitorName || "Website Visitor", "", source);

  if (vendorEmail) {
    import("../services/email.js")
      .then(({ sendNewTicketAlert }) => sendNewTicketAlert(vendorEmail, ticketNumber, subject))
      .catch(() => {}); // best-effort — the ticket already exists regardless
  }

  // Priority + summary make the ticket useful the moment an agent opens it,
  // but neither should delay the reply the visitor is waiting on — classify/
  // summarize in the background and backfill the row after.
  (async () => {
    try {
      const [priority, fullHistory] = await Promise.all([
        classifyPriority(message),
        Promise.resolve(db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(convId)),
      ]);
      const summary = await summarizeConversation(fullHistory);
      db.prepare("UPDATE tickets SET priority = ?, ai_summary = ? WHERE id = ?").run(priority, summary, ticketId);
    } catch {
      // Best-effort — the ticket already exists with sane defaults.
    }
  })();
}

/**
 * Core message-handling logic, shared by POST /api/chat/message (this file)
 * and POST /api/widget/:apiKey/chat (routes/widget.js) — those two used to
 * be separate, drifted implementations, which is how the widget endpoint
 * ended up silently broken (wrong field name reading the RAG result, and
 * missing all the confidence/escalation logic below). One implementation now.
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleChatMessage({ apiKey, message, conversationId, visitorId, visitorName, source = "widget" }) {
  if (!apiKey || !message || !message.trim()) {
    return { status: 400, body: { error: "API key and message are required" } };
  }

  const bot = db.prepare("SELECT b.*, v.id as vendor_id, v.ticket_addon FROM bots b JOIN vendors v ON v.id = b.vendor_id WHERE b.id = ? AND b.is_active = 1").get(apiKey);
  if (!bot) {
    return { status: 401, body: { error: "Invalid API key or bot not active" } };
  }

  const vendor = db.prepare("SELECT email, is_suspended FROM vendors WHERE id = ?").get(bot.vendor_id);
  if (vendor?.is_suspended) {
    return { status: 403, body: { error: "Account suspended" } };
  }

  const vid = visitorId || uuidv4();
  let convId = conversationId;

  const isNewConversation = !convId || !db.prepare("SELECT id FROM conversations WHERE id = ? AND bot_id = ?").get(convId, bot.id);
  let creditsExhausted = false;
  if (isNewConversation) {
    convId = uuidv4();
    db.prepare(`
      INSERT INTO conversations (id, bot_id, vendor_id, visitor_id, visitor_name, status, source)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(convId, bot.id, bot.vendor_id, vid, visitorName || "Website Visitor", source);

    // Lifetime counter for analytics/display — no longer the billing gate,
    // see conversation_credits below.
    db.prepare("UPDATE vendors SET conversations_used = conversations_used + 1 WHERE id = ?").run(bot.vendor_id);

    // Running credit balance: renewals and top-ups both add to it (see
    // pesepayBilling.js), every conversation subtracts one. Decrementing
    // only succeeds (rows > 0) if there was a credit to spend — this atomic
    // conditional update avoids a race where two conversations starting at
    // once both read "1 credit left" and both decrement past zero.
    const spent = db.prepare("UPDATE vendors SET conversation_credits = conversation_credits - 1 WHERE id = ? AND conversation_credits > 0").run(bot.vendor_id);
    creditsExhausted = spent.changes === 0;

    try {
      checkVendorOverage(bot.vendor_id);
    } catch { /* overage alerts are non-critical */ }
  }

  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (?, ?, 'user', ?)
  `).run(uuidv4(), convId, message);

  // Out of credits: don't spend money generating an answer we can't bill
  // for — hand straight to a human via the same escalation pipeline as a
  // low-confidence answer, rather than a bare error the visitor can't act on.
  if (creditsExhausted) {
    const handoffMessage = "Thanks for reaching out! Our AI assistant has reached its limit for this month, but I've let the team know and they'll get back to you directly.";
    const botMessageId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (?, ?, 'bot', ?)
    `).run(botMessageId, convId, handoffMessage);
    db.prepare("UPDATE conversations SET message_count = message_count + 1, resolved_by_bot = 0, status = 'escalated' WHERE id = ?").run(convId);

    await escalateToHuman({ bot, vendorEmail: vendor?.email, convId, message, visitorName, source: "credits_exhausted" });

    return {
      status: 200,
      body: { reply: handoffMessage, messageId: botMessageId, conversationId: convId, visitorId: vid, sources: [], confident: false },
    };
  }

  const history = db.prepare(
    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
  ).all(convId);

  const result = await generateRagResponse(bot.id, message, history.slice(0, -1));

  const botMessageId = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms, sources)
    VALUES (?, ?, 'bot', ?, ?, ?, ?, ?)
  `).run(
    botMessageId, convId, result.content,
    result.model || "llama3-70b", result.tokensUsed, result.latencyMs,
    JSON.stringify(result.sources)
  );

  db.prepare("UPDATE conversations SET message_count = message_count + 1 WHERE id = ?").run(convId);

  // The bot knows when it doesn't know: a confident answer counts as bot-resolved;
  // a low-confidence one (real knowledge base match, just a weak one) escalates to a human.
  if (result.confident === true) {
    db.prepare("UPDATE conversations SET resolved_by_bot = 1 WHERE id = ?").run(convId);
  } else if (result.confident === false) {
    db.prepare("UPDATE conversations SET resolved_by_bot = 0, status = 'escalated' WHERE id = ?").run(convId);
    await escalateToHuman({ bot, vendorEmail: vendor?.email, convId, message, visitorName, source: "bot_low_confidence" });
  }

  return {
    status: 200,
    body: {
      reply: result.content,
      messageId: botMessageId,
      conversationId: convId,
      visitorId: vid,
      sources: result.sources,
      confident: result.confident,
    },
  };
}

/**
 * POST /api/chat/message
 * Send a message to a bot and get a response.
 * Public endpoint — uses API key for auth.
 */
router.post("/message", chatRateLimiter, async (req, res) => {
  try {
    const { apiKey, message, conversationId, visitorId, visitorName } = req.body;
    const result = await handleChatMessage({ apiKey, message, conversationId, visitorId, visitorName });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[Chat] Error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

/**
 * POST /api/chat/feedback
 * Thumbs up/down on a single bot reply — the message's own UUID is enough to
 * address it (same trust model as ticketsPublic.js's ticket-UUID-as-token: an
 * unguessable id, not a permission to enumerate). Public, called directly
 * from the widget and any other client hitting the chat API.
 */
router.post("/feedback", (req, res) => {
  try {
    const { messageId, rating } = req.body;
    if (!messageId || !["up", "down"].includes(rating)) {
      return res.status(400).json({ error: "messageId and rating ('up' or 'down') are required" });
    }

    const message = db.prepare("SELECT id FROM messages WHERE id = ? AND role = 'bot'").get(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    db.prepare("UPDATE messages SET rating = ? WHERE id = ?").run(rating, messageId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[Feedback] Error:", err);
    res.status(500).json({ error: "Failed to record feedback" });
  }
});

/**
 * POST /api/chat/escalate
 * Escalate a conversation to a support ticket.
 */
router.post("/escalate", async (req, res) => {
  try {
    const { conversationId, name, email, description } = req.body;
    if (!conversationId || !name || !email) {
      return res.status(400).json({ error: "Conversation ID, name, and email are required" });
    }

    const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // Update conversation status
    db.prepare("UPDATE conversations SET status = 'escalated', ended_at = datetime('now') WHERE id = ?").run(conversationId);

    // Check if vendor has ticket add-on
    const vendor = db.prepare("SELECT email, ticket_addon, company_name FROM vendors WHERE id = ?").get(conv.vendor_id);
    if (!vendor?.ticket_addon) {
      return res.json({ message: "Support ticket submitted. The team will get back to you.", ticketNumber: null });
    }

    // Create ticket
    const { generateTicketNumber } = await import("../utils/helpers.js");
    const ticketId = uuidv4();
    const ticketNumber = generateTicketNumber();

    db.prepare(`
      INSERT INTO tickets (id, vendor_id, conversation_id, ticket_number, subject, description, status, priority, customer_name, customer_email, source)
      VALUES (?, ?, ?, ?, ?, ?, 'open', 'medium', ?, ?, 'chat_escalation')
    `).run(ticketId, conv.vendor_id, conversationId, ticketNumber, description?.slice(0, 100) || "Escalated from chat", description || "", name, email);

    // Backfill priority + summary in the background — same reasoning as the
    // auto-escalation path in handleChatMessage: useful the moment an agent
    // opens the ticket, but shouldn't delay this response.
    (async () => {
      try {
        const history = db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId);
        const [priority, summary] = await Promise.all([
          classifyPriority(description || history[history.length - 1]?.content || ""),
          summarizeConversation(history),
        ]);
        db.prepare("UPDATE tickets SET priority = ?, ai_summary = ? WHERE id = ?").run(priority, summary, ticketId);
      } catch {
        // Best-effort
      }
    })();

    // Email notifications — customer confirmation and vendor alert are both
    // best-effort, neither should fail the request.
    try {
      const { sendTicketConfirmation, sendNewTicketAlert } = await import("../services/email.js");
      await sendTicketConfirmation(email, ticketNumber, description?.slice(0, 100) || "Support Request");
      if (vendor.email) {
        await sendNewTicketAlert(vendor.email, ticketNumber, description?.slice(0, 100) || "Support Request");
      }
    } catch {
      // Email failure is non-critical
    }

    res.json({ message: "Support ticket created", ticketNumber });
  } catch (err) {
    console.error("[Escalate] Error:", err);
    res.status(500).json({ error: "Failed to escalate" });
  }
});

export default router;
