import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import { chargeVendor, initiateCardCheckout, resolveCharge } from "../services/pesepayBilling.js";

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

/**
 * POST /api/pesepay/checkout
 * Start a Pesepay Ecocash charge for a plan. Unlike Stripe checkout, this
 * doesn't redirect anywhere — Pesepay pushes a PIN prompt straight to the
 * given phone number. The frontend should poll GET /status/:referenceNumber
 * until the transaction resolves. `currency` is 'usd' or 'local' (ZiG in
 * production) — Zimbabwe is a dual-currency economy, Ecocash works in either.
 */
router.post("/checkout", async (req, res) => {
  const { planId, phoneNumber, currency, method } = req.body;
  if (!VALID_PLANS.includes(planId)) {
    return res.status(400).json({ error: "Invalid plan" });
  }
  if (!phoneNumber || !/^0\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "A valid Zimbabwean phone number (e.g. 0771234567) is required" });
  }
  const resolvedCurrency = currency === "usd" ? "usd" : "local";
  const resolvedMethod = method === "omari" ? "omari" : "ecocash";
  if (resolvedMethod === "omari" && resolvedCurrency !== "usd") {
    return res.status(400).json({ error: "Omari is only available for USD payments" });
  }

  const vendor = db.prepare("SELECT id, email, name, company_name, dunning_attempts FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const result = await chargeVendor(vendor, planId, phoneNumber, resolvedCurrency, resolvedMethod);
    res.json(result);
  } catch (err) {
    console.error("[Pesepay] Checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to start Pesepay payment" });
  }
});

/**
 * POST /api/pesepay/checkout-card
 * Start a card (Visa/Mastercard) checkout via Pesepay's hosted payment page
 * — the customer enters card details there, not on botimi, so we never
 * handle raw cardholder data. Always billed in USD.
 */
router.post("/checkout-card", async (req, res) => {
  const { planId } = req.body;
  if (!VALID_PLANS.includes(planId)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const vendor = db.prepare("SELECT id, email, name, company_name, dunning_attempts FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const result = await initiateCardCheckout(vendor, planId);
    res.json(result);
  } catch (err) {
    console.error("[Pesepay] Card checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to start card payment" });
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
    SELECT reference_number FROM pesepay_charges
    WHERE vendor_id = ? AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1
  `).get(req.vendor.id);
  res.json({ referenceNumber: charge?.reference_number || null });
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
