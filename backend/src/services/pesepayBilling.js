import { v4 as uuidv4 } from "uuid";
import db from "../db/index.js";
import config, { isLocalVendor, planPrice, topUpPrice } from "../config.js";
import * as pesepay from "./pesepay.js";

const BILLING_CYCLE_DAYS = 30;
const MAX_DUNNING_ATTEMPTS = 3;
const RETRY_BACKOFF_DAYS = [1, 3, 7]; // days after attempt 1, 2, 3

// SQLite's datetime('now') produces "YYYY-MM-DD HH:MM:SS" (space-separated,
// no milliseconds/Z). JS's toISOString() produces "YYYY-MM-DDTHH:MM:SS.sssZ".
// Comparing the two as plain strings (which `next_charge_at <= datetime('now')`
// does) is wrong on the day a charge becomes due — 'T' (0x54) sorts after a
// space (0x20), so a same-day ISO timestamp looks "later" than SQLite's own
// now() and never matches. Always store next_charge_at in SQLite's own format.
function toSqliteDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Zimbabwe is a dual-currency economy — USD and ZiG both circulate, so
// Ecocash customers can pay in either, independent of which PRICE SHEET
// applies to them (see isLocalVendor — that's about the vendor's billing
// country, a completely separate axis from payCurrency below). Card is
// always USD, whoever the cardholder is. "payCurrency" here is 'usd' | 'zig'
// — 'zig' resolves to ZWL in sandbox / ZiG in production (sandbox has no
// Ecocash-branded ZWL method — only OneMoney — so the real Ecocash+ZiG combo
// can only be tested with a small real transaction once live; see project
// memory for the full matrix).
const ZIG_CURRENCY_CODE = { sandbox: "ZWL", production: "ZiG" }[config.pesepay.env] || "ZWL";
const ZIG_ECOCASH_METHOD_CODE = { sandbox: "PZW202", production: "PZW201" }[config.pesepay.env] || "PZW202";
const USD_ECOCASH_METHOD_CODE = "PZW211"; // same code in both sandbox and production
const OMARI_METHOD_CODE = "PZW216"; // USD only — no ZiG/local Omari option exists

// Phone-based ("seamless") methods available per pay-currency. Omari is
// USD-only (confirmed live — no ZiG listing for it); Ecocash covers both.
const PHONE_METHOD_CODES = {
  usd: { ecocash: USD_ECOCASH_METHOD_CODE, omari: OMARI_METHOD_CODE },
  zig: { ecocash: ZIG_ECOCASH_METHOD_CODE },
};

async function resolveUsdToZig(usdAmount) {
  const currencies = await pesepay.getActiveCurrencies();
  const zig = currencies.find((c) => c.code === ZIG_CURRENCY_CODE);
  const rate = zig?.rateToDefault || 1;
  return Math.round(usdAmount * rate * 100) / 100;
}

/** Resolve a USD sheet price into the actual amount/currency/method to charge. */
async function computeChargeAmount(usdAmount, payCurrency, method) {
  const paymentMethodCode = PHONE_METHOD_CODES[payCurrency]?.[method];
  if (!paymentMethodCode) throw new Error(`Unsupported currency/method combination: ${payCurrency}/${method}`);

  if (payCurrency === "usd") {
    return { amount: usdAmount, currencyCode: "USD", paymentMethodCode };
  }
  const amount = await resolveUsdToZig(usdAmount);
  return { amount, currencyCode: ZIG_CURRENCY_CODE, paymentMethodCode };
}

function recordCharge({ vendor, chargeType, planId, method, customerReference, referenceNumber, amount, currencyCode, paymentMethodCode }) {
  const chargeId = uuidv4();
  db.prepare(`
    INSERT INTO pesepay_charges (id, vendor_id, charge_type, plan_id, method, customer_reference, reference_number, amount, currency_code, payment_method_code, status, attempt_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(chargeId, vendor.id, chargeType, planId, method, customerReference, referenceNumber, amount, currencyCode, paymentMethodCode, vendor.dunning_attempts + 1);
  return chargeId;
}

async function makeEcocashPayment({ vendor, usdAmount, payCurrency, method, phoneNumber, reasonForPayment }) {
  const { amount, currencyCode, paymentMethodCode } = await computeChargeAmount(usdAmount, payCurrency, method);
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
export async function chargeVendor(vendor, planId, phoneNumber, payCurrency = "zig", method = "ecocash") {
  const plan = config.plans[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const usdAmount = planPrice(planId, isLocalVendor(vendor));

  const result = await makeEcocashPayment({
    vendor, usdAmount, payCurrency, method, phoneNumber,
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
 */
export async function initiateCardCheckout(vendor, planId) {
  const plan = config.plans[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const usdAmount = planPrice(planId, isLocalVendor(vendor));

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
export async function chargeTopUp(vendor, packId, phoneNumber, payCurrency = "zig", method = "ecocash") {
  const pack = config.topUps[packId];
  if (!pack) throw new Error(`Unknown top-up pack: ${packId}`);
  const usdAmount = topUpPrice(packId, isLocalVendor(vendor));

  const result = await makeEcocashPayment({
    vendor, usdAmount, payCurrency, method, phoneNumber,
    reasonForPayment: `botimi top-up: ${pack.conversations} conversations`,
  });

  const chargeId = recordCharge({
    vendor, chargeType: "topup", planId: packId, method, customerReference: phoneNumber,
    referenceNumber: result.referenceNumber, amount: result.amount, currencyCode: result.currencyCode, paymentMethodCode: result.paymentMethodCode,
  });

  return { chargeId, referenceNumber: result.referenceNumber, transactionStatus: result.transactionStatus };
}

/** Buy a top-up pack via the same card/wallet redirect flow used for plans. */
export async function initiateTopUpCardCheckout(vendor, packId) {
  const pack = config.topUps[packId];
  if (!pack) throw new Error(`Unknown top-up pack: ${packId}`);
  const usdAmount = topUpPrice(packId, isLocalVendor(vendor));

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
function markVendorPaid(vendorId, planId, method, customerReference, currencyCode) {
  const plan = config.plans[planId];
  const nextChargeAt = toSqliteDatetime(new Date(Date.now() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000));
  const currency = currencyCode === "USD" ? "usd" : "zig";
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
  `).run(planId, method, ["ecocash", "omari"].includes(method) ? customerReference : "", currency, nextChargeAt, plan.conversationsPerMonth, vendorId);
}

/** Called after a top-up charge succeeds — just adds credits, nothing else. */
function markTopUpPaid(vendorId, packId) {
  const pack = config.topUps[packId];
  db.prepare("UPDATE vendors SET conversation_credits = conversation_credits + ? WHERE id = ?").run(pack.conversations, vendorId);
}

function markVendorPaymentFailed(vendor) {
  const attempts = vendor.dunning_attempts + 1;
  if (attempts >= MAX_DUNNING_ATTEMPTS) {
    db.prepare("UPDATE vendors SET subscription_status = 'canceled', is_suspended = 1, dunning_attempts = ? WHERE id = ?").run(attempts, vendor.id);
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
      markTopUpPaid(vendor.id, charge.plan_id);
    } else {
      markVendorPaid(vendor.id, charge.plan_id, charge.method, charge.customer_reference, charge.currency_code);
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

const RENEWAL_REMINDER_INTERVAL_DAYS = 3;

/**
 * Card-paying vendors have no stored payment method to re-charge silently
 * (unlike Ecocash's phone-PIN push), so a due renewal just gets flagged
 * past_due and emailed instead of auto-charged — deduped so the hourly cron
 * doesn't re-send the same reminder every hour.
 */
async function remindCardVendorToRenew(vendor) {
  const recentReminder = db.prepare(`
    SELECT id FROM usage_events
    WHERE vendor_id = ? AND event_type = 'renewal_reminder'
      AND created_at >= datetime('now', ?)
  `).get(vendor.id, `-${RENEWAL_REMINDER_INTERVAL_DAYS} days`);
  if (recentReminder) return;

  if (vendor.subscription_status !== "past_due") {
    db.prepare("UPDATE vendors SET subscription_status = 'past_due' WHERE id = ?").run(vendor.id);
  }

  db.prepare("INSERT INTO usage_events (id, vendor_id, event_type, metadata) VALUES (?, ?, 'renewal_reminder', ?)")
    .run(uuidv4(), vendor.id, JSON.stringify({ sentAt: new Date().toISOString() }));

  try {
    const { sendRenewalReminder } = await import("./email.js");
    await sendRenewalReminder(vendor.email, config.plans[vendor.subscription_plan]?.name || vendor.subscription_plan);
    console.log(`[PesepayBilling] Sent renewal reminder to vendor ${vendor.id} (pays by card).`);
  } catch (err) {
    console.error(`[PesepayBilling] Failed to email renewal reminder to vendor ${vendor.id}:`, err.message);
  }
}

/**
 * Cron entry point: (1) resolve any charges still pending from a previous
 * cycle, (2) trigger a fresh renewal charge for every due vendor. Only
 * Ecocash/Omari vendors can be auto-charged (the phone PIN push doesn't need
 * the customer on our site) — card vendors used the redirect flow, which has
 * no stored payment method to re-charge silently, so they're just flagged
 * past_due and emailed a "renew now" link instead (see remindCardVendorToRenew).
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

  const dueVendors = db.prepare(`
    SELECT * FROM vendors
    WHERE payment_provider = 'pesepay'
      AND is_suspended = 0
      AND subscription_status IN ('active', 'past_due')
      AND next_charge_at IS NOT NULL
      AND next_charge_at <= datetime('now')
  `).all();

  for (const vendor of dueVendors) {
    const alreadyPending = db.prepare("SELECT id FROM pesepay_charges WHERE vendor_id = ? AND status = 'pending'").get(vendor.id);
    if (alreadyPending) continue; // avoid double-charging while a previous attempt is still in flight

    if (!["ecocash", "omari"].includes(vendor.pesepay_payment_method)) {
      await remindCardVendorToRenew(vendor);
      continue;
    }

    try {
      await chargeVendor(vendor, vendor.subscription_plan, vendor.pesepay_phone_number, vendor.pesepay_currency || "zig", vendor.pesepay_payment_method);
      console.log(`[PesepayBilling] Charge triggered for vendor ${vendor.id} — check their phone for the ${vendor.pesepay_payment_method} PIN prompt.`);
    } catch (err) {
      console.error(`[PesepayBilling] Failed to charge vendor ${vendor.id}:`, err.message);
    }
  }
}
