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

  const vendor = db.prepare("SELECT is_suspended FROM vendors WHERE id = ?").get(bot.vendor_id);
  if (vendor?.is_suspended) {
    return { status: 403, body: { error: "Account suspended" } };
  }

  const vid = visitorId || uuidv4();
  let convId = conversationId;

  const isNewConversation = !convId || !db.prepare("SELECT id FROM conversations WHERE id = ? AND bot_id = ?").get(convId, bot.id);
  if (isNewConversation) {
    const vendorUsage = db.prepare("SELECT conversations_used, conversations_limit FROM vendors WHERE id = ?").get(bot.vendor_id);
    if (vendorUsage && vendorUsage.conversations_limit > 0 && vendorUsage.conversations_used >= vendorUsage.conversations_limit) {
      return { status: 429, body: { error: "Monthly conversation limit reached. Please upgrade your plan.", code: "LIMIT_REACHED" } };
    }

    convId = uuidv4();
    db.prepare(`
      INSERT INTO conversations (id, bot_id, vendor_id, visitor_id, visitor_name, status, source)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(convId, bot.id, bot.vendor_id, vid, visitorName || "Website Visitor", source);

    db.prepare("UPDATE vendors SET conversations_used = conversations_used + 1 WHERE id = ?").run(bot.vendor_id);

    try {
      checkVendorOverage(bot.vendor_id);
    } catch { /* overage alerts are non-critical */ }
  }

  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (?, ?, 'user', ?)
  `).run(uuidv4(), convId, message);

  const history = db.prepare(
    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
  ).all(convId);

  const result = await generateRagResponse(bot.id, message, history.slice(0, -1));

  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms, sources)
    VALUES (?, ?, 'bot', ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), convId, result.content,
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

    if (bot.ticket_addon) {
      const existingTicket = db.prepare("SELECT id FROM tickets WHERE conversation_id = ?").get(convId);
      if (!existingTicket) {
        const { generateTicketNumber } = await import("../utils/helpers.js");
        const ticketId = uuidv4();
        const ticketNumber = generateTicketNumber();
        db.prepare(`
          INSERT INTO tickets (id, vendor_id, conversation_id, ticket_number, subject, description, status, priority, customer_name, customer_email, source)
          VALUES (?, ?, ?, ?, ?, ?, 'open', 'medium', ?, ?, 'bot_low_confidence')
        `).run(ticketId, bot.vendor_id, convId, ticketNumber, message.slice(0, 100), message, visitorName || "Website Visitor", "");

        // Priority + summary make the ticket useful the moment an agent opens
        // it, but neither should delay the reply the visitor is waiting on —
        // classify/summarize in the background and backfill the row after.
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
    }
  }

  return {
    status: 200,
    body: {
      reply: result.content,
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
    const vendor = db.prepare("SELECT ticket_addon, company_name FROM vendors WHERE id = ?").get(conv.vendor_id);
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

    // Send email notification
    try {
      const { sendTicketConfirmation } = await import("../services/email.js");
      await sendTicketConfirmation(email, ticketNumber, description?.slice(0, 100) || "Support Request");
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
