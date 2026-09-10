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
    "SELECT id, email, name, company_name, industry, logo_url, brand_color, country, subscription_plan, subscription_status, ticket_addon, conversations_used, conversations_limit, conversation_credits, trial_ends_at, created_at FROM vendors WHERE id = ?"
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

export default router;
