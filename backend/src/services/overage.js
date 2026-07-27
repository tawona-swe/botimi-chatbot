import db from "../db/index.js";
import config from "../config.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Check all vendors for conversation overage and send alerts.
 * Called periodically (e.g., via cron or after each conversation creation).
 * Per spec §7: email alert at 80% and 95% usage.
 */
export function checkOverageAlerts() {
  const alertThresholds = config.limits.overageAlertPct || [80, 95];

  // Get vendors approaching their limits
  const vendors = db.prepare(`
    SELECT id, email, company_name, conversations_used, conversations_limit, subscription_plan
    FROM vendors
    WHERE conversations_limit > 0
      AND conversations_used > 0
      AND is_suspended = 0
  `).all();

  for (const vendor of vendors) {
    const usagePct = Math.round((vendor.conversations_used / vendor.conversations_limit) * 100);

    for (const threshold of alertThresholds) {
      if (usagePct >= threshold) {
        // Check if we already sent an alert at this threshold
        const existingAlert = db.prepare(`
          SELECT id FROM usage_events
          WHERE vendor_id = ? AND event_type = 'overage_alert'
            AND json_extract(metadata, '$.threshold') = ?
            AND created_at >= datetime('now', '-7 days')
        `).get(vendor.id, threshold.toString());

        if (!existingAlert) {
          // Send the alert
          sendAlert(vendor, usagePct, threshold);
        }
      }
    }
  }
}

async function sendAlert(vendor, usagePct, threshold) {
  console.log(`[Overage] Alert: ${vendor.email} at ${usagePct}% (threshold: ${threshold}%)`);

  // Record the alert event
  db.prepare(`
    INSERT INTO usage_events (id, vendor_id, event_type, metadata)
    VALUES (?, ?, 'overage_alert', ?)
  `).run(
    uuidv4(),
    vendor.id,
    JSON.stringify({ threshold: threshold.toString(), usagePct, sentAt: new Date().toISOString() })
  );

  // Send email alert (non-blocking)
  try {
    const { sendOverageAlert } = await import("./email.js");
    await sendOverageAlert(vendor.email, usagePct, vendor.subscription_plan);
  } catch (err) {
    console.error(`[Overage] Email failed for ${vendor.email}:`, err.message);
  }
}

/**
 * Quick overage check for a single vendor after a new conversation.
 * Called from the chat route. Lightweight — only checks thresholds
 * and alerts if crossing a boundary.
 */
export function checkVendorOverage(vendorId) {
  const vendor = db.prepare(`
    SELECT id, email, company_name, conversations_used, conversations_limit, subscription_plan
    FROM vendors WHERE id = ? AND conversations_limit > 0
  `).get(vendorId);

  if (!vendor) return;

  const usagePct = Math.round((vendor.conversations_used / vendor.conversations_limit) * 100);
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
