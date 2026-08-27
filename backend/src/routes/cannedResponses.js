import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(authenticate);

/**
 * GET /api/canned-responses
 */
router.get("/", (req, res) => {
  const responses = db.prepare("SELECT * FROM canned_responses WHERE vendor_id = ? ORDER BY title ASC").all(req.vendor.id);
  res.json({ responses });
});

/**
 * POST /api/canned-responses
 */
router.post("/", (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "Title and body are required" });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO canned_responses (id, vendor_id, title, body, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.vendor.id, title.slice(0, 100), body, req.teamMember?.id || "");

  const created = db.prepare("SELECT * FROM canned_responses WHERE id = ?").get(id);
  res.status(201).json({ response: created });
});

/**
 * PATCH /api/canned-responses/:id
 */
router.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM canned_responses WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!existing) return res.status(404).json({ error: "Canned response not found" });

  const { title, body } = req.body;
  const updates = [];
  const params = [];
  if (title !== undefined) { updates.push("title = ?"); params.push(title.slice(0, 100)); }
  if (body !== undefined) { updates.push("body = ?"); params.push(body); }
  if (updates.length === 0) return res.status(400).json({ error: "No valid fields to update" });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE canned_responses SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM canned_responses WHERE id = ?").get(req.params.id);
  res.json({ response: updated });
});

/**
 * DELETE /api/canned-responses/:id
 */
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM canned_responses WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!existing) return res.status(404).json({ error: "Canned response not found" });

  db.prepare("DELETE FROM canned_responses WHERE id = ?").run(req.params.id);
  res.json({ message: "Deleted" });
});

export default router;
