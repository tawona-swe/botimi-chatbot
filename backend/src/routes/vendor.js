import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/vendor/profile
 * Get vendor profile.
 */
router.get("/profile", (req, res) => {
  const vendor = db.prepare(
    "SELECT id, email, name, company_name, industry, logo_url, brand_color, country, subscription_plan, subscription_status, ticket_addon, conversations_used, conversations_limit, trial_ends_at, created_at FROM vendors WHERE id = ?"
  ).get(req.vendor.id);

  res.json({ vendor });
});

/**
 * PATCH /api/vendor/profile
 * Update vendor profile.
 */
router.patch("/profile", (req, res) => {
  const allowed = ["name", "company_name", "industry", "logo_url", "brand_color", "country"];
  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.vendor.id);

  db.prepare(`UPDATE vendors SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const vendor = db.prepare("SELECT id, email, name, company_name, industry, logo_url, brand_color, country FROM vendors WHERE id = ?").get(req.vendor.id);
  res.json({ vendor });
});

/**
 * POST /api/vendor/billing-portal
 * Get Stripe billing portal link.
 */
router.post("/billing-portal", async (req, res) => {
  const vendor = db.prepare("SELECT stripe_customer_id FROM vendors WHERE id = ?").get(req.vendor.id);
  if (!vendor?.stripe_customer_id) {
    return res.status(400).json({ error: "No Stripe customer ID found" });
  }

  try {
    const { createBillingPortalSession } = await import("../services/stripe.js");
    const session = await createBillingPortalSession(vendor.stripe_customer_id);
    res.json({ url: session.url });
  } catch (err) {
    console.error("[Billing Portal] Error:", err);
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

/**
 * POST /api/vendor/checkout
 * Create a Stripe checkout session for plan change.
 */
router.post("/checkout", async (req, res) => {
  const { planId, ticketAddon } = req.body;
  const validPlans = ["starter", "growth", "scale"];

  if (!validPlans.includes(planId)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const vendor = db.prepare("SELECT email, name, company_name FROM vendors WHERE id = ?").get(req.vendor.id);

  try {
    const { createCheckoutSession } = await import("../services/stripe.js");
    const session = await createCheckoutSession(
      req.vendor.id,
      vendor.email,
      vendor.company_name || vendor.name,
      planId,
      !!ticketAddon
    );
    res.json({ url: session.url });
  } catch (err) {
    console.error("[Checkout] Error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
