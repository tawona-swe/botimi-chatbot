import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(authenticate);

const VALID_ROLES = ["owner", "admin", "agent"];

function serialize(member) {
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    isActive: !!member.is_active,
    createdAt: member.created_at,
  };
}

/**
 * GET /api/team
 * List team members for the current vendor account, plus the owner itself.
 */
router.get("/", (req, res) => {
  const members = db.prepare("SELECT * FROM team_members WHERE vendor_id = ? ORDER BY created_at ASC").all(req.vendor.id);
  res.json({
    owner: { id: req.vendor.id, email: req.vendor.email, name: req.vendor.name, role: "owner" },
    members: members.map(serialize),
  });
});

/**
 * POST /api/team/invite
 * Add a team member seat. No invite-email flow yet (transactional email isn't
 * configured) — the owner/admin sets a temp password directly and shares it.
 */
router.post("/invite", requireTeamRole("owner", "admin"), async (req, res) => {
  const { email, name, password, role } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and a password of at least 8 characters are required" });
  }

  const normalizedRole = VALID_ROLES.includes(role) ? role : "agent";
  if (normalizedRole === "owner") {
    return res.status(400).json({ error: "Cannot invite another owner — there is exactly one owner per account" });
  }

  const existingVendor = db.prepare("SELECT id FROM vendors WHERE email = ?").get(email.toLowerCase());
  const existingMember = db.prepare("SELECT id FROM team_members WHERE email = ?").get(email.toLowerCase());
  if (existingVendor || existingMember) {
    return res.status(409).json({ error: "That email is already in use on botimi" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO team_members (id, vendor_id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.vendor.id, email.toLowerCase(), passwordHash, name || "", normalizedRole);

  const member = db.prepare("SELECT * FROM team_members WHERE id = ?").get(id);
  res.status(201).json({ member: serialize(member) });
});

/**
 * PATCH /api/team/:id
 * Update a team member's role or active status.
 */
router.patch("/:id", requireTeamRole("owner", "admin"), (req, res) => {
  const member = db.prepare("SELECT * FROM team_members WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!member) return res.status(404).json({ error: "Team member not found" });

  const { role, isActive } = req.body;
  const updates = [];
  const params = [];

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role) || role === "owner") {
      return res.status(400).json({ error: "Invalid role" });
    }
    updates.push("role = ?");
    params.push(role);
  }

  if (isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE team_members SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM team_members WHERE id = ?").get(req.params.id);
  res.json({ member: serialize(updated) });
});

/**
 * DELETE /api/team/:id
 * Remove a team member's seat.
 */
router.delete("/:id", requireTeamRole("owner", "admin"), (req, res) => {
  const member = db.prepare("SELECT id FROM team_members WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!member) return res.status(404).json({ error: "Team member not found" });

  db.prepare("DELETE FROM team_members WHERE id = ?").run(req.params.id);
  res.json({ message: "Team member removed" });
});

export default router;
