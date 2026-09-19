import { Router } from "express";
import crypto from "crypto";
import config from "../config.js";
import { sendInboundEmailForward } from "../services/email.js";

const router = Router();

// Resend signs inbound webhooks the same way Svix does: HMAC-SHA256 over
// `${svix-id}.${svix-timestamp}.${rawBody}`, keyed by the base64 bytes after
// the "whsec_" prefix, compared against one or more "v1,<sig>" entries in
// the svix-signature header. Must run against the raw request bytes (see
// index.js's express.json verify hook) -- re-serializing the parsed body
// would silently break every signature.
function verifyResendSignature(rawBody, headers, secret) {
  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];
  if (!svixId || !svixTimestamp || !svixSignature || !rawBody) return false;

  const timestampSeconds = parseInt(svixTimestamp, 10);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return false; // reject stale/replayed or clock-skewed requests
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return svixSignature.split(" ").some((entry) => {
    const candidate = entry.split(",")[1];
    if (!candidate) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
    } catch {
      return false; // length mismatch -- definitely not a match
    }
  });
}

/**
 * POST /api/email/webhook
 * Fires the moment Resend receives mail at any @botimi.co.zw address (e.g.
 * support@). Resend has no forwarding UI of its own, so this is what
 * actually gets inbound support mail in front of a human. The webhook
 * payload itself is metadata only (from/to/subject/attachment list) -- the
 * body has to be fetched separately via the receiving-email API using the
 * email_id, then relayed with sendInboundEmailForward.
 */
router.post("/webhook", async (req, res) => {
  if (!config.email.inboundWebhookSecret) {
    console.error("[EmailWebhook] RESEND_INBOUND_WEBHOOK_SECRET not set — rejecting inbound webhook");
    return res.sendStatus(500);
  }

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : null;
  if (!verifyResendSignature(rawBody, req.headers, config.email.inboundWebhookSecret)) {
    return res.sendStatus(401);
  }

  // Ack immediately -- forwarding involves a follow-up call to Resend's API
  // and shouldn't hold the webhook response open.
  res.sendStatus(200);

  const event = req.body;
  if (event?.type !== "email.received") return;

  const emailId = event.data?.email_id;
  if (!config.email.forwardTo) {
    console.warn("[EmailWebhook] SUPPORT_FORWARD_TO_EMAIL not set — inbound mail received but nowhere to forward it");
    return;
  }
  if (!emailId) return;

  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${config.email.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Resend receiving API error: ${response.status}`);
    }
    const full = await response.json();

    await sendInboundEmailForward({
      to: config.email.forwardTo,
      from: full.from,
      subject: full.subject,
      text: full.text,
      html: full.html,
      attachments: full.attachments,
    });
  } catch (err) {
    console.error("[EmailWebhook] Failed to fetch/forward inbound email:", err.message);
  }
});

export default router;
