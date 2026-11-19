import { v4 as uuidv4 } from "uuid";
import db from "../db/index.js";
import config, { isLocalVendor, planPrice, topUpPrice } from "../config.js";
import * as pesepay from "./pesepay.js";

const BILLING_CYCLE_DAYS = 30;
const MAX_DUNNING_ATTEMPTS = 3;
const RETRY_BACKOFF_DAYS = [1, 3, 7]; // days after attempt 1, 2, 3
const ADVANCE_WARNING_DAYS = 3; // send warning this many days before due date
const RENEWAL_REMINDER_INTERVAL_DAYS = 3;

// SQLite's datetime('now') produces "YYYY-MM-DD HH:MM:SS" (space-separated,
// no milliseconds/Z). JS's toISOString() produces "YYYY-MM-DDTHH:MM:SS.sssZ".
// Comparing the two as plain strings (which `next_charge_at <= datetime('now')`
// does) is wrong on the day a charge becomes due — 'T' (0x54) sorts after a
// space (0x20), so a same-day ISO timestamp looks "later" than SQLite's own
// now() and never matches. Always store next_charge_at in SQLite's own format.
function toSqliteDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Every charge in the system is billed in USD — ZWG (Zimbabwe Gold, formerly
// ZiG/ZWL) is not accepted anywhere, regardless of payment method. This is
// independent of which PRICE SHEET applies to a vendor (see isLocalVendor —
// that's about the vendor's billing country/discount tier, a completely
// separate axis; local vendors still pay their discounted price, just always
// in USD).
const USD_ECOCASH_METHOD_CODE = "PZW211"; // same code in both sandbox and production
const OMARI_METHOD_CODE = "PZW216";

const PHONE_METHOD_CODES = { ecocash: USD_ECOCASH_METHOD_CODE, omari: OMARI_METHOD_CODE };

/** Resolve a USD sheet price into the actual amount/currency/method to charge — always USD. */
function computeChargeAmount(usdAmount, method) {
  const paymentMethodCode = PHONE_METHOD_CODES[method];
  if (!paymentMethodCode) throw new Error(`Unsupported payment method: ${method}`);
  return { amount: usdAmount, currencyCode: "USD", paymentMethodCode };
}

function recordCharge({ vendor, chargeType, planId, method, customerReference, referenceNumber, amount, currencyCode, paymentMethodCode }) {
  const chargeId = uuidv4();
  db.prepare(`
    INSERT INTO pesepay_charges (id, vendor_id, charge_type, plan_id, method, customer_reference, reference_number, amount, currency_code, payment_method_code, status, attempt_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(chargeId, vendor.id, chargeType, planId, method, customerReference, referenceNumber, amount, currencyCode, paymentMethodCode, vendor.dunning_attempts + 1);
  return chargeId;
}

async function makeEcocashPayment({ vendor, usdAmount, method, phoneNumber, reasonForPayment }) {
  const { amount, currencyCode, paymentMethodCode } = computeChargeAmount(usdAmount, method);
  const merchantReference = `botimi-${vendor.id}-${Date.now()}`;

  const transaction = await pesepay.makePayment({
    amountDetails: { amount, currencyCode },
    merchantReference,
    reasonForPayment,
    // Only reachable in production (needs a public HTTPS URL) — locally we
    // rely on polling checkPaymentStatus instead, same as Pesepay's own SDK does.
    resultUrl: `${config.backendUrl}/api/pesepay/result`,
    returnUrl: `${config.frontendUrl}/settings`,
    paymentMethodCode,
    customer: { email: vendor.email || "", phoneNumber, name: vendor.company_name || vendor.name || "" },
    paymentMethodRequiredFields: { customerPhoneNumber: phoneNumber },
  });

  // make-payment's response has referenceNumber: null — it's only populated
  // in check-payment-status responses. The real value has to be parsed out
  // of pollUrl instead (confirmed against the live sandbox API).
  const referenceNumber = new URL(transaction.pollUrl).searchParams.get("referenceNumber");
  if (!referenceNumber) throw new Error("Pesepay did not return a poll URL with a reference number");

  return { referenceNumber, transactionStatus: transaction.transactionStatus, amount, currencyCode, paymentMethodCode };
}

async function initiateRedirectPayment({ usdAmount, reasonForPayment }) {
  const merchantReference = `botimi-redirect-${Date.now()}`;
  const transaction = await pesepay.initiateTransaction({
    amountDetails: { amount: usdAmount, currencyCode: "USD" },
    merchantReference,
    reasonForPayment,
    resultUrl: `${config.backendUrl}/api/pesepay/result`,
    // Pesepay's own referenceNumber doesn't exist yet at call time, so we
    // can't embed it here — the frontend looks up the pending charge via
    // GET /api/pesepay/pending instead of relying on a return URL param.
    returnUrl: `${config.frontendUrl}/settings`,
  });
  return { referenceNumber: transaction.referenceNumber, redirectUrl: transaction.redirectUrl };
}

/**
 * Start an Ecocash/Omari charge for a plan (used both for the vendor's first
 * checkout and for each scheduled renewal). The phone-PIN push doesn't need
 * the customer on our site, so this can be called unattended by the
 * scheduler too, not just from a checkout button.
 */
export async function chargeVendor(vendor, planId, phoneNumber, method = "ecocash") {
  const plan = config.plans[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const usdAmount = planPrice(planId, isLocalVendor(vendor));

  const result = await makeEcocashPayment({
    vendor, usdAmount, method, phoneNumber,
    reasonForPayment: `botimi ${plan.name} plan`,
  });

  const chargeId = recordCharge({
    vendor, chargeType: "subscription", planId, method, customerReference: phoneNumber,
    referenceNumber: result.referenceNumber, amount: result.amount, currencyCode: result.currencyCode, paymentMethodCode: result.paymentMethodCode,
  });

  return { chargeId, referenceNumber: result.referenceNumber, transactionStatus: result.transactionStatus };
}

/**
 * Start a plan checkout via the redirect flow (Initiate Transaction) — the
 * customer completes payment on Pesepay's own hosted page, which shows both
 * a "Payment with Cards" section (Visa/Mastercard) and a "Wallet Payments"
 * section (confirmed live — covers whichever of Ecocash/Omari/Zimswitch/
 * Innbucks/PayGo Pesepay has configured for the account, without botimi
 * needing bespoke code per method). Botimi's servers never see raw
 * cardholder data this way (keeps us out of PCI-DSS scope). Always charged
 * in USD — Pesepay has no card option for ZiG/ZWL, and this is also the
 * fallback for the three no-input-field wallet methods (Zimswitch, Innbucks,
 * PayGo) that have zero sandbox coverage and no documented test triggers, so
 * botimi can't safely build/verify bespoke seamless integrations for them.
 *
 * Always charged at the international rate, regardless of the vendor's
 * claimed country: isLocalVendor is a self-reported field, and unlike
 * Ecocash/Omari (which require a real Zimbabwean phone number to receive the
 * PIN push), card/redirect has no independent signal to verify a "local"
 * claim against. Charging the local rate here would let any vendor
 * self-report their way to the discounted price.
 */
export async function initiateCardCheckout(vendor, planId) {
  const plan = config.plans[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const usdAmount = planPrice(planId, false);

  const { referenceNumber, redirectUrl } = await initiateRedirectPayment({
    usdAmount, reasonForPayment: `botimi ${plan.name} plan`,
  });

  const chargeId = recordCharge({
    vendor, chargeType: "subscription", planId, method: "card", customerReference: "",
    referenceNumber, amount: usdAmount, currencyCode: "USD", paymentMethodCode: "REDIRECT",
  });

  return { chargeId, referenceNumber, redirectUrl };
}

/**
 * Buy a one-off block of conversation credits via Ecocash/Omari — used when
 * a vendor's running balance (conversation_credits) runs out mid-cycle.
 */
export async function chargeTopUp(vendor, packId, phoneNumber, method = "ecocash") {
  const pack = config.topUps[packId];
  if (!pack) throw new Error(`Unknown top-up pack: ${packId}`);
  const usdAmount = topUpPrice(packId, isLocalVendor(vendor));

  const result = await makeEcocashPayment({
    vendor, usdAmount, method, phoneNumber,
    reasonForPayment: `botimi top-up: ${pack.conversations} conversations`,
  });

  const chargeId = recordCharge({
    vendor, chargeType: "topup", planId: packId, method, customerReference: phoneNumber,
    referenceNumber: result.referenceNumber, amount: result.amount, currencyCode: result.currencyCode, paymentMethodCode: result.paymentMethodCode,
  });

  return { chargeId, referenceNumber: result.referenceNumber, transactionStatus: result.transactionStatus };
}

/**
 * Buy a top-up pack via the same card/wallet redirect flow used for plans.
 * Always the international rate — same reasoning as initiateCardCheckout.
 */
export async function initiateTopUpCardCheckout(vendor, packId) {
  const pack = config.topUps[packId];
  if (!pack) throw new Error(`Unknown top-up pack: ${packId}`);
  const usdAmount = topUpPrice(packId, false);

  const { referenceNumber, redirectUrl } = await initiateRedirectPayment({
    usdAmount, reasonForPayment: `botimi top-up: ${pack.conversations} conversations`,
  });

  const chargeId = recordCharge({
    vendor, chargeType: "topup", planId: packId, method: "card", customerReference: "",
    referenceNumber, amount: usdAmount, currencyCode: "USD", paymentMethodCode: "REDIRECT",
  });

  return { chargeId, referenceNumber, redirectUrl };
}

/**
 * Called after a subscription charge succeeds — activates/renews the plan
 * and tops the vendor's running conversation-credit balance up by the
 * plan's included amount. Credits are a single stacking balance (renewals
 * and top-ups both just add to it), not a cap that resets to zero.
 */
function markVendorPaid(vendor, planId, method, customerReference, currencyCode, amount) {
  const plan = config.plans[planId];
  const nextChargeAt = toSqliteDatetime(new Date(Date.now() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000));
  const currency = "usd"; // every charge is USD now — see the note above PHONE_METHOD_CODES
  db.prepare(`
    UPDATE vendors SET
      subscription_plan = ?,
      subscription_status = 'active',
      payment_provider = 'pesepay',
      pesepay_payment_method = ?,
      pesepay_phone_number = ?,
      pesepay_currency = ?,
      next_charge_at = ?,
      dunning_attempts = 0,
      conversation_credits = conversation_credits + ?
    WHERE id = ?
  `).run(planId, method, ["ecocash", "omari"].includes(method) ? customerReference : "", currency, nextChargeAt, plan.conversationsPerMonth, vendor.id);

  if (vendor.email) {
    import("./email.js")
      .then(({ sendPaymentReceiptEmail }) => sendPaymentReceiptEmail(vendor.email, plan.name, amount, currencyCode))
      .catch((err) => console.error("[PesepayBilling] Failed to send payment receipt:", err.message));
  }
}

/** Called after a top-up charge succeeds — adds credits and sends a receipt. */
function markTopUpPaid(vendor, packId, currencyCode, amount) {
  const pack = config.topUps[packId];
  db.prepare("UPDATE vendors SET conversation_credits = conversation_credits + ? WHERE id = ?").run(pack.conversations, vendor.id);

  if (vendor.email) {
    import("./email.js")
      .then(({ sendTopUpReceiptEmail }) => sendTopUpReceiptEmail(vendor.email, pack.conversations, amount, currencyCode))
      .catch((err) => console.error("[PesepayBilling] Failed to send top-up receipt:", err.message));
  }
}

function markVendorPaymentFailed(vendor) {
  const attempts = vendor.dunning_attempts + 1;
  if (attempts >= MAX_DUNNING_ATTEMPTS) {
    db.prepare("UPDATE vendors SET subscription_status = 'canceled', is_suspended = 1, dunning_attempts = ?, canceled_at = datetime('now') WHERE id = ?").run(attempts, vendor.id);
    if (vendor.email) {
      const planName = config.plans[vendor.subscription_plan]?.name || vendor.subscription_plan;
      import("./email.js")
        .then(({ sendSubscriptionCanceledEmail }) => sendSubscriptionCanceledEmail(vendor.email, planName))
        .catch((err) => console.error("[PesepayBilling] Failed to send cancellation email:", err.message));
    }
    return;
  }
  const backoffDays = RETRY_BACKOFF_DAYS[attempts - 1] || 7;
  const nextChargeAt = toSqliteDatetime(new Date(Date.now() + backoffDays * 24 * 60 * 60 * 1000));
  db.prepare(`
    UPDATE vendors SET subscription_status = 'past_due', dunning_attempts = ?, next_charge_at = ?
    WHERE id = ?
  `).run(attempts, nextChargeAt, vendor.id);
}

/**
 * Check the status of a single charge by reference number and finalize it
 * (activate the plan / add credits on success, apply dunning logic on a
 * failed *subscription* charge — a failed top-up just fails, no suspension
 * consequences, the vendor can simply try again). Safe to call multiple
 * times — a charge already resolved to paid/failed is left alone. Returns
 * the final Pesepay transaction status string.
 */
export async function resolveCharge(referenceNumber) {
  const charge = db.prepare("SELECT * FROM pesepay_charges WHERE reference_number = ?").get(referenceNumber);
  if (!charge) throw new Error("Charge not found");
  if (charge.status !== "pending") return charge.status === "paid" ? "SUCCESS" : "FAILED";

  const transaction = await pesepay.checkPaymentStatus(referenceNumber);
  const vendor = db.prepare("SELECT * FROM vendors WHERE id = ?").get(charge.vendor_id);

  if (transaction.transactionStatus === "SUCCESS") {
    db.prepare("UPDATE pesepay_charges SET status = 'paid' WHERE id = ?").run(charge.id);
    if (charge.charge_type === "topup") {
      markTopUpPaid(vendor, charge.plan_id, charge.currency_code, charge.amount);
    } else {
      markVendorPaid(vendor, charge.plan_id, charge.method, charge.customer_reference, charge.currency_code, charge.amount);
    }
  } else if (transaction.transactionStatus === "FAILED") {
    db.prepare("UPDATE pesepay_charges SET status = 'failed' WHERE id = ?").run(charge.id);
    if (charge.charge_type !== "topup") {
      markVendorPaymentFailed(vendor);
    }
  }
  // PENDING/PROCESSING: leave as-is, caller can poll again later.

  return transaction.transactionStatus;
}

/**
 * Send a renewal reminder email to a vendor whose payment is now due.
 * Works for all payment methods (Ecocash, Omari, card) — no auto-charge is
 * attempted. Deduped to once every RENEWAL_REMINDER_INTERVAL_DAYS days so
 * the hourly cron doesn't re-send every hour. Increments dunning_attempts on
 * each send; suspends the account after MAX_DUNNING_ATTEMPTS reminders.
 */
async function remindVendorToRenew(vendor) {
  const recentReminder = db.prepare(`
    SELECT id FROM usage_events
    WHERE vendor_id = ? AND event_type = 'renewal_reminder'
      AND created_at >= datetime('now', ?)
  `).get(vendor.id, `-${RENEWAL_REMINDER_INTERVAL_DAYS} days`);
  if (recentReminder) return;

  const newAttempts = vendor.dunning_attempts + 1;

  if (newAttempts >= MAX_DUNNING_ATTEMPTS) {
    db.prepare("UPDATE vendors SET subscription_status = 'canceled', is_suspended = 1, dunning_attempts = ?, canceled_at = datetime('now') WHERE id = ?").run(newAttempts, vendor.id);
    db.prepare("INSERT INTO usage_events (id, vendor_id, event_type, metadata) VALUES (?, ?, 'renewal_reminder', ?)")
      .run(uuidv4(), vendor.id, JSON.stringify({ sentAt: new Date().toISOString(), attempt: newAttempts }));
    if (vendor.email) {
      const planName = config.plans[vendor.subscription_plan]?.name || vendor.subscription_plan;
      import("./email.js")
        .then(({ sendSubscriptionCanceledEmail }) => sendSubscriptionCanceledEmail(vendor.email, planName))
        .catch((err) => console.error(`[PesepayBilling] Failed to send cancellation email to vendor ${vendor.id}:`, err.message));
    }
    console.log(`[PesepayBilling] Vendor ${vendor.id} suspended after ${newAttempts} unpaid renewal reminders.`);
    return;
  }

  db.prepare("UPDATE vendors SET subscription_status = 'past_due', dunning_attempts = ? WHERE id = ?").run(newAttempts, vendor.id);
  db.prepare("INSERT INTO usage_events (id, vendor_id, event_type, metadata) VALUES (?, ?, 'renewal_reminder', ?)")
    .run(uuidv4(), vendor.id, JSON.stringify({ sentAt: new Date().toISOString(), attempt: newAttempts }));

  try {
    const { sendRenewalReminder } = await import("./email.js");
    await sendRenewalReminder(vendor.email, config.plans[vendor.subscription_plan]?.name || vendor.subscription_plan, vendor.subscription_plan);
    console.log(`[PesepayBilling] Sent renewal reminder to vendor ${vendor.id} (attempt ${newAttempts}/${MAX_DUNNING_ATTEMPTS}).`);
  } catch (err) {
    console.error(`[PesepayBilling] Failed to email renewal reminder to vendor ${vendor.id}:`, err.message);
  }
}

/**
 * Send a 3-day advance warning email to vendors whose payment is due soon.
 * Deduped per vendor so it fires once per billing cycle (not every hour).
 */
async function sendAdvanceWarnings() {
  const upcoming = db.prepare(`
    SELECT * FROM vendors
    WHERE is_suspended = 0
      AND subscription_status IN ('active', 'past_due')
      AND next_charge_at IS NOT NULL
      AND next_charge_at > datetime('now')
      AND next_charge_at <= datetime('now', '+${ADVANCE_WARNING_DAYS} days')
  `).all();

  for (const vendor of upcoming) {
    const alreadyWarned = db.prepare(`
      SELECT id FROM usage_events
      WHERE vendor_id = ? AND event_type = 'payment_due_warning'
        AND created_at >= datetime('now', '-7 days')
    `).get(vendor.id);
    if (alreadyWarned) continue;

    const planId = vendor.subscription_plan;
    const planName = config.plans[planId]?.name || planId;
    const amount = planPrice(planId, isLocalVendor(vendor));

    db.prepare("INSERT INTO usage_events (id, vendor_id, event_type, metadata) VALUES (?, ?, 'payment_due_warning', ?)")
      .run(uuidv4(), vendor.id, JSON.stringify({ sentAt: new Date().toISOString(), amount }));

    try {
      const { sendPaymentDueWarning } = await import("./email.js");
      await sendPaymentDueWarning(vendor.email, planName, planId, amount);
      console.log(`[PesepayBilling] Sent payment due warning to vendor ${vendor.id} ($${amount} due in ~${ADVANCE_WARNING_DAYS} days).`);
    } catch (err) {
      console.error(`[PesepayBilling] Failed to send due warning to vendor ${vendor.id}:`, err.message);
    }
  }
}

/**
 * Cron entry point:
 *  1. Resolve any charges still pending from a previous cycle (user-initiated
 *     Ecocash/card payments that haven't got a final status yet).
 *  2. Send advance warning emails to vendors whose payment is due in ~3 days.
 *  3. Email renewal reminders to vendors whose payment is now due — no silent
 *     auto-charge is attempted regardless of payment method. Vendors pay by
 *     clicking the link in the email and initiating payment themselves from
 *     the settings page.
 */
export async function runBillingCycle() {
  const pendingCharges = db.prepare("SELECT reference_number FROM pesepay_charges WHERE status = 'pending'").all();
  for (const { reference_number } of pendingCharges) {
    try {
      await resolveCharge(reference_number);
    } catch (err) {
      console.error(`[PesepayBilling] Failed to resolve charge ${reference_number}:`, err.message);
    }
  }

  await sendAdvanceWarnings();

  const dueVendors = db.prepare(`
    SELECT * FROM vendors
    WHERE is_suspended = 0
      AND subscription_status IN ('active', 'past_due')
      AND next_charge_at IS NOT NULL
      AND next_charge_at <= datetime('now')
  `).all();

  for (const vendor of dueVendors) {
    await remindVendorToRenew(vendor);
  }
}
