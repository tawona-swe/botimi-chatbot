import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import {
  chargeVendor, initiateCardCheckout,
  chargeTopUp, initiateTopUpCardCheckout,
  resolveCharge,
} from "../services/pesepayBilling.js";
import config, { isLocalVendor, planPrice, topUpPrice } from "../config.js";

const router = Router();

/**
 * POST /api/pesepay/result
 * Pesepay's server-to-server callback (resultUrl) with the final transaction
 * status. Public — Pesepay calls this, not a logged-in browser. Only
 * reachable once the backend has a public HTTPS URL; until then, the
 * frontend's status polling (below) is what actually finalizes charges.
 */
router.post("/result", async (req, res) => {
  const referenceNumber = req.body?.referenceNumber || req.query?.referenceNumber;
  if (!referenceNumber) return res.sendStatus(400);
  try {
    await resolveCharge(referenceNumber);
  } catch (err) {
    console.error("[Pesepay] Result callback error:", err.message);
  }
  res.sendStatus(200);
});

router.use(authenticate);

const VALID_PLANS = ["starter", "growth", "scale"];
const VALID_TOPUPS = ["small", "large"];

function resolvePhoneMethod(body) {
  const currency = body.currency === "usd" ? "usd" : "zig";
  const method = body.method === "omari" ? "omari" : "ecocash";
  if (method === "omari" && currency !== "usd") {
    throw Object.assign(new Error("Omari is only available for USD payments"), { status: 400 });
  }
  return { currency, method };
}

/**
 * POST /api/pesepay/checkout
 * Start a Pesepay Ecocash/Omari charge for a plan. Unlike Stripe checkout,
 * this doesn't redirect anywhere — Pesepay pushes a PIN prompt straight to
 * the given phone number. The frontend should poll GET /status/:referenceNumber
 * until the transaction resolves. `currency` is 'usd' or 'zig' — Zimbabwe is
 * a dual-currency economy, Ecocash works in either.
 */
router.post("/checkout", async (req, res) => {
  const { planId, phoneNumber } = req.body;
  if (!VALID_PLANS.includes(planId)) {
    return res.status(400).json({ error: "Invalid plan" });
  }
  if (!phoneNumber || !/^0\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "A valid Zimbabwean phone number (e.g. 0771234567) is required" });
  }

  let currency, method;
  try {
    ({ currency, method } = resolvePhoneMethod(req.body));
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const vendor = db.prepare("SELECT id, email, name, company_name, country, dunning_attempts FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const result = await chargeVendor(vendor, planId, phoneNumber, currency, method);
    res.json(result);
  } catch (err) {
    console.error("[Pesepay] Checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to start Pesepay payment" });
  }
});

/**
 * POST /api/pesepay/checkout-card
 * Start a plan checkout via Pesepay's hosted payment page (card and other
 * wallet methods) — the customer enters payment details there, not on
 * botimi, so we never handle raw cardholder data. Always billed in USD.
 */
router.post("/checkout-card", async (req, res) => {
  const { planId } = req.body;
  if (!VALID_PLANS.includes(planId)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const vendor = db.prepare("SELECT id, email, name, company_name, country, dunning_attempts FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const result = await initiateCardCheckout(vendor, planId);
    res.json(result);
  } catch (err) {
    console.error("[Pesepay] Card checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to start card payment" });
  }
});

/**
 * GET /api/pesepay/plans
 * The price sheet for the authenticated vendor's billing country (local vs.
 * international — see isLocalVendor), so the frontend never has to
 * duplicate the pricing logic.
 */
router.get("/plans", (req, res) => {
  const vendor = db.prepare("SELECT country FROM vendors WHERE id = ?").get(req.vendor.id);
  const local = isLocalVendor(vendor);
  const plans = Object.fromEntries(
    VALID_PLANS.map((id) => [id, { ...config.plans[id], price: planPrice(id, local) }])
  );
  const topUps = Object.fromEntries(
    VALID_TOPUPS.map((id) => [id, { ...config.topUps[id], price: topUpPrice(id, local) }])
  );
  res.json({ local, plans, topUps });
});

/**
 * POST /api/pesepay/topup/checkout
 * Buy a block of conversation credits via Ecocash/Omari — same phone-PIN
 * flow as a plan charge, just adds credits instead of activating a plan.
 */
router.post("/topup/checkout", async (req, res) => {
  const { packId, phoneNumber } = req.body;
  if (!VALID_TOPUPS.includes(packId)) {
    return res.status(400).json({ error: "Invalid top-up pack" });
  }
  if (!phoneNumber || !/^0\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "A valid Zimbabwean phone number (e.g. 0771234567) is required" });
  }

  let currency, method;
  try {
    ({ currency, method } = resolvePhoneMethod(req.body));
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const vendor = db.prepare("SELECT id, email, name, company_name, country, dunning_attempts FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const result = await chargeTopUp(vendor, packId, phoneNumber, currency, method);
    res.json(result);
  } catch (err) {
    console.error("[Pesepay] Top-up checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to start top-up payment" });
  }
});

/**
 * POST /api/pesepay/topup/checkout-card
 * Buy a top-up pack via the card/wallet redirect flow.
 */
router.post("/topup/checkout-card", async (req, res) => {
  const { packId } = req.body;
  if (!VALID_TOPUPS.includes(packId)) {
    return res.status(400).json({ error: "Invalid top-up pack" });
  }

  const vendor = db.prepare("SELECT id, email, name, company_name, country, dunning_attempts FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const result = await initiateTopUpCardCheckout(vendor, packId);
    res.json(result);
  } catch (err) {
    console.error("[Pesepay] Top-up card checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to start top-up card payment" });
  }
});

/**
 * GET /api/pesepay/pending
 * Returns the vendor's most recent pending charge, if any — used after a
 * card redirect brings the customer back, since Pesepay's referenceNumber
 * isn't known until after checkout starts (so it can't be passed via the
 * return URL ahead of time).
 */
router.get("/pending", (req, res) => {
  const charge = db.prepare(`
    SELECT reference_number, charge_type FROM pesepay_charges
    WHERE vendor_id = ? AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1
  `).get(req.vendor.id);
  res.json({ referenceNumber: charge?.reference_number || null, chargeType: charge?.charge_type || null });
});

/**
 * GET /api/pesepay/status/:referenceNumber
 * Poll a charge's status. Finalizes the charge (activates the plan, or
 * applies dunning) the moment it resolves to SUCCESS/FAILED.
 */
router.get("/status/:referenceNumber", async (req, res) => {
  const charge = db.prepare("SELECT vendor_id FROM pesepay_charges WHERE reference_number = ?").get(req.params.referenceNumber);
  if (!charge || charge.vendor_id !== req.vendor.id) {
    return res.status(404).json({ error: "Charge not found" });
  }

  try {
    const transactionStatus = await resolveCharge(req.params.referenceNumber);
    res.json({ transactionStatus });
  } catch (err) {
    console.error("[Pesepay] Status check error:", err);
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

export default router;
