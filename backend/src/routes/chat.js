import { Router } from "express";
import db from "../db/index.js";
import { chatRateLimiter } from "../middleware/rateLimit.js";
import { generateRagResponse } from "../services/rag.js";
import { checkVendorOverage } from "../services/overage.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * POST /api/chat/message
 * Send a message to a bot and get a response.
 * Public endpoint — uses API key for auth.
 */
router.post("/message", chatRateLimiter, async (req, res) => {
  try {
    const { apiKey, message, conversationId, visitorId, visitorName } = req.body;

    if (!apiKey || !message) {
      return res.status(400).json({ error: "API key and message are required" });
    }

    // Authenticate via API key (bot ID or vendor key)
    // For V1, we accept bot ID as apiKey (simplified)
    const bot = db.prepare("SELECT b.*, v.id as vendor_id FROM bots b JOIN vendors v ON v.id = b.vendor_id WHERE b.id = ? AND b.is_active = 1").get(apiKey);
    if (!bot) {
      return res.status(401).json({ error: "Invalid API key or bot not active" });
    }

    const vid = visitorId || uuidv4();
    let convId = conversationId;

    // Create or get conversation
    const isNewConversation = !convId;
    if (isNewConversation) {
      // Check conversation usage limit
      const vendorUsage = db.prepare(
        "SELECT conversations_used, conversations_limit FROM vendors WHERE id = ?"
      ).get(bot.vendor_id);
      if (vendorUsage && vendorUsage.conversations_limit > 0 &&
          vendorUsage.conversations_used >= vendorUsage.conversations_limit) {
        return res.status(429).json({
          error: "Monthly conversation limit reached. Please upgrade your plan.",
          code: "LIMIT_REACHED",
        });
      }

      convId = uuidv4();
      db.prepare(`
        INSERT INTO conversations (id, bot_id, vendor_id, visitor_id, visitor_name, status, source)
        VALUES (?, ?, ?, ?, ?, 'active', 'widget')
      `).run(convId, bot.id, bot.vendor_id, vid, visitorName || "Website Visitor");

      // Increment conversation usage
      db.prepare(
        "UPDATE vendors SET conversations_used = conversations_used + 1 WHERE id = ?"
      ).run(bot.vendor_id);

      // Check and send overage alerts (async, non-blocking)
      try {
        checkVendorOverage(bot.vendor_id);
      } catch { /* overage alerts are non-critical */ }
    }

    // Save user message
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (?, ?, 'user', ?)
    `).run(uuidv4(), convId, message);

    // Get conversation history
    const history = db.prepare(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    ).all(convId);

    // Generate RAG response
    const result = await generateRagResponse(bot.id, message, history.slice(0, -1));

    // Save bot response
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms, sources)
      VALUES (?, ?, 'bot', ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), convId, result.content,
      result.model || "llama3-70b", result.tokensUsed, result.latencyMs,
      JSON.stringify(result.sources)
    );

    // Update conversation count
    db.prepare("UPDATE conversations SET message_count = message_count + 1 WHERE id = ?").run(convId);

    res.json({
      reply: result.content,
      conversationId: convId,
      visitorId: vid,
      sources: result.sources,
    });
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
