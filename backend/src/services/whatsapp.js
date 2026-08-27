import config from "../config.js";

/**
 * WhatsApp Cloud API (Meta) — sends a text message reply. Requires a
 * WHATSAPP_ACCESS_TOKEN in .env; the phone_number_id comes from whichever
 * bot the inbound message was routed to (bots.whatsapp_phone_number_id).
 */
export async function sendWhatsAppMessage(phoneNumberId, to, text) {
  if (!config.whatsapp?.accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN not configured");
  }

  const apiVersion = config.whatsapp.apiVersion || "v21.0";
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.whatsapp.accessToken}`,
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
