import { Router } from "express";
import db from "../db/index.js";
import config from "../config.js";
import { handleChatMessage } from "./chat.js";
import { sendWhatsAppMessage } from "../services/whatsapp.js";

const router = Router();

/**
 * GET /api/whatsapp/webhook
 * Meta's webhook verification handshake — required once when you register
 * the callback URL in the Meta app dashboard. Needs a publicly reachable
 * HTTPS URL (not localhost) and WHATSAPP_VERIFY_TOKEN set to whatever you
 * choose to enter in the Meta dashboard's "Verify Token" field.
 */
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && config.whatsapp?.verifyToken && token === config.whatsapp.verifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/**
 * POST /api/whatsapp/webhook
 * Receives inbound WhatsApp messages, routes them to whichever bot owns the
 * receiving phone_number_id, and replies via the same generateRagResponse
 * pipeline the website widget uses (handleChatMessage in chat.js) — same
 * training, same confidence-based escalation, same ticket creation.
 */
router.post("/webhook", async (req, res) => {
  // Acknowledge immediately — Meta expects a fast 200 and will retry
  // aggressively if the webhook is slow, independent of how long our reply
  // generation takes.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phoneNumberId = value.metadata?.phone_number_id;
        const messages = value.messages || [];
        if (!phoneNumberId || messages.length === 0) continue; // status/delivery webhooks, not a message

        const bot = db.prepare("SELECT id FROM bots WHERE whatsapp_phone_number_id = ? AND is_active = 1").get(phoneNumberId);
        if (!bot) {
          console.warn(`[WhatsApp] No bot mapped to phone_number_id ${phoneNumberId}`);
          continue;
        }

        for (const msg of messages) {
          if (msg.type !== "text" || !msg.text?.body) continue; // MVP: text only

          const from = msg.from;
          const contactName = value.contacts?.find((c) => c.wa_id === from)?.profile?.name || "";

          const existing = db.prepare(
            "SELECT id FROM conversations WHERE bot_id = ? AND visitor_id = ? AND source = 'whatsapp' AND status IN ('active', 'escalated') ORDER BY created_at DESC LIMIT 1"
          ).get(bot.id, from);

          const result = await handleChatMessage({
            apiKey: bot.id,
            message: msg.text.body,
            conversationId: existing?.id || null,
            visitorId: from,
            visitorName: contactName,
            source: "whatsapp",
          });

          if (result.status === 200 && result.body.reply) {
            await sendWhatsAppMessage(phoneNumberId, from, result.body.reply).catch((err) => {
              console.error("[WhatsApp] Failed to send reply:", err.message);
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[WhatsApp] Webhook processing error:", err);
  }
});

export default router;
