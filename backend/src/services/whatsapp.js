import config from "../config.js";

/**
 * WhatsApp Cloud API (Meta) — sends a text message reply. Each business
 * brings its own WhatsApp number under its own Meta Business Portfolio (no
 * shared/omnichannel number — WhatsApp ties identity to the number itself),
 * so the access token is per-bot (bots.whatsapp_access_token), not a single
 * platform-wide credential. Falls back to the global WHATSAPP_ACCESS_TOKEN
 * env var only for backward compatibility with an already-configured bot
 * that hasn't set its own token yet.
 */
export async function sendWhatsAppMessage(phoneNumberId, to, text, accessToken) {
  const token = accessToken || config.whatsapp?.accessToken;
  if (!token) {
    throw new Error("No WhatsApp access token configured for this bot");
  }

  const apiVersion = config.whatsapp.apiVersion || "v21.0";
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`WhatsApp send error (${response.status}): ${errText.slice(0, 300)}`);
  }

  return response.json();
}
