import db from "../db/index.js";

/**
 * Suspend any vendor still on 'trialing' whose 14-day trial has actually
 * passed. trial_ends_at is stored as a JS toISOString() string (used
 * directly for display via `new Date(...)` on the frontend), which is NOT
 * safe to compare against SQLite's own datetime('now') as plain strings —
 * same class of bug fixed for next_charge_at in pesepayBilling.js (ISO's
 * 'T'/'Z' sort differently than SQLite's space-separated format on the same
 * calendar day). Comparing as real Date objects in JS sidesteps that
 * entirely, and keeps trial_ends_at's format compatible with the existing
 * display code — so fetch candidates broadly, then filter precisely here.
 */
export async function checkTrialExpirations() {
  const candidates = db.prepare(`
    SELECT id, email, trial_ends_at FROM vendors
    WHERE subscription_status = 'trialing' AND is_suspended = 0 AND trial_ends_at IS NOT NULL
  `).all();

  const now = Date.now();
  for (const vendor of candidates) {
    if (new Date(vendor.trial_ends_at).getTime() > now) continue;

    db.prepare("UPDATE vendors SET subscription_status = 'trial_expired', is_suspended = 1 WHERE id = ?").run(vendor.id);
    console.log(`[Trial] Expired and suspended vendor ${vendor.id}`);

    try {
      const { sendTrialExpiredAlert } = await import("./email.js");
      await sendTrialExpiredAlert(vendor.email);
    } catch (err) {
      console.error(`[Trial] Failed to email ${vendor.email}:`, err.message);
    }
  }
}
