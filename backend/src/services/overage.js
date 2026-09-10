import db from "../db/index.js";
import config from "../config.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Check all vendors for a low conversation-credit balance and send alerts.
 * Called periodically (e.g., via cron or after each conversation creation).
 * Credits are a stacking balance (renewals + top-ups add to it, see
 * pesepayBilling.js), not a monthly cap that resets — so "overage" doesn't
 * really apply anymore. What matters is runway: how much of a typical
 * month's allotment (conversations_limit) is left. Alert when that drops to
 * the configured low-water marks, same 80/95 config values as before but
 * now read as "80%/95% of a cycle's worth of credit spent since it was last
 * this full" rather than "80%/95% of a hard cap used."
 */
export function checkOverageAlerts() {
  const alertThresholds = config.limits.overageAlertPct || [80, 95];

  const vendors = db.prepare(`
    SELECT id, email, company_name, conversation_credits, conversations_limit, subscription_plan
    FROM vendors
    WHERE conversations_limit > 0
      AND is_suspended = 0
  `).all();

  for (const vendor of vendors) {
    const usagePct = lowCreditUsagePct(vendor);

    for (const threshold of alertThresholds) {
      if (usagePct >= threshold) {
        const existingAlert = db.prepare(`
          SELECT id FROM usage_events
          WHERE vendor_id = ? AND event_type = 'overage_alert'
            AND json_extract(metadata, '$.threshold') = ?
            AND created_at >= datetime('now', '-7 days')
        `).get(vendor.id, threshold.toString());

        if (!existingAlert) {
          sendAlert(vendor, usagePct, threshold);
        }
      }
    }
  }
}

function lowCreditUsagePct(vendor) {
  const remainingPct = Math.max(0, (vendor.conversation_credits / vendor.conversations_limit) * 100);
  return Math.round(100 - Math.min(100, remainingPct));
}

async function sendAlert(vendor, usagePct, threshold) {
  console.log(`[Overage] Low-credit alert: ${vendor.email} at ${usagePct}% (threshold: ${threshold}%)`);

  db.prepare(`
    INSERT INTO usage_events (id, vendor_id, event_type, metadata)
    VALUES (?, ?, 'overage_alert', ?)
  `).run(
    uuidv4(),
    vendor.id,
    JSON.stringify({ threshold: threshold.toString(), usagePct, sentAt: new Date().toISOString() })
  );

  try {
    const { sendOverageAlert } = await import("./email.js");
    await sendOverageAlert(vendor.email, usagePct, vendor.subscription_plan);
  } catch (err) {
    console.error(`[Overage] Email failed for ${vendor.email}:`, err.message);
  }
}

/**
 * Quick low-credit check for a single vendor after a new conversation.
 * Called from the chat route. Lightweight — only checks thresholds and
 * alerts if crossing a boundary.
 */
export function checkVendorOverage(vendorId) {
  const vendor = db.prepare(`
    SELECT id, email, company_name, conversation_credits, conversations_limit, subscription_plan
    FROM vendors WHERE id = ? AND conversations_limit > 0
  `).get(vendorId);

  if (!vendor) return;

  const usagePct = lowCreditUsagePct(vendor);
  const alertThresholds = config.limits.overageAlertPct || [80, 95];

  for (const threshold of alertThresholds) {
    if (usagePct >= threshold) {
      const existingAlert = db.prepare(`
        SELECT id FROM usage_events
        WHERE vendor_id = ? AND event_type = 'overage_alert'
          AND json_extract(metadata, '$.threshold') = ?
          AND created_at >= datetime('now', '-7 days')
      `).get(vendorId, threshold.toString());

      if (!existingAlert) {
        sendAlert(vendor, usagePct, threshold);
      }
    }
  }
}
