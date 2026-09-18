import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import db from "../db/index.js";
import config from "../config.js";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const VALID_ROLES = ["owner", "admin", "agent"];

// Same reasoning as auth.js's generateToken/toSqliteDatetime: a hashed
// lookup token (not a password, so a fast hash is fine) and SQLite's own
// datetime format for the expiry, not toISOString()'s.
function generateInviteToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}
function toSqliteDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

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
 * POST /api/team/accept-invite
 * Public (no auth) — the invitee has no session yet, so this must be
 * registered before router.use(authenticate) below applies to everything
 * else in this router.
 */
router.post("/accept-invite", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password are required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const member = db.prepare(
    "SELECT * FROM team_members WHERE invite_token = ? AND invite_token_expires_at > datetime('now')"
  ).get(hash);

  if (!member) {
    return res.status(400).json({ error: "This invite link is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare("UPDATE team_members SET password_hash = ?, invite_token = NULL, invite_token_expires_at = NULL, is_active = 1 WHERE id = ?").run(passwordHash, member.id);

  const jwt = (await import("jsonwebtoken")).default;
  const vendor = db.prepare("SELECT * FROM vendors WHERE id = ?").get(member.vendor_id);
  const jwtToken = jwt.sign({ vendorId: vendor.id, teamMemberId: member.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

  const sessionId = uuidv4();
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, vendor_id, token, expires_at, team_member_id) VALUES (?, ?, ?, ?, ?)").run(sessionId, vendor.id, jwtToken, sessionExpiresAt, member.id);

  res.json({
    token: jwtToken,
    vendor: { id: vendor.id, email: vendor.email, companyName: vendor.company_name, name: vendor.name, plan: vendor.subscription_plan },
    teamMember: { id: member.id, email: member.email, name: member.name, role: member.role },
  });
});

router.use(authenticate);

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
 * Add a team member seat. The invitee sets their own password via the
 * emailed accept-invite link — the owner/admin no longer types a password
 * for them (that meant sharing a real credential in plaintext out-of-band,
 * which is what this replaces).
 */
router.post("/invite", requireTeamRole("owner", "admin"), async (req, res) => {
  const { email, name, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
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

  // Unusable placeholder — password_hash stays NOT NULL, but nobody can
  // derive a working password from a bcrypt hash of a random UUID, and it
  // gets overwritten for real the moment the invite is accepted.
  const placeholderHash = await bcrypt.hash(uuidv4(), 12);
  const { raw, hash: inviteHash } = generateInviteToken();
  const inviteExpiresAt = toSqliteDatetime(new Date(Date.now() + 48 * 60 * 60 * 1000)); // 48 hours
  const id = uuidv4();

  db.prepare(`
    INSERT INTO team_members (id, vendor_id, email, password_hash, name, role, invite_token, invite_token_expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.vendor.id, email.toLowerCase(), placeholderHash, name || "", normalizedRole, inviteHash, inviteExpiresAt);

  const acceptUrl = `${config.frontendUrl}/accept-invite?token=${raw}`;
  const { sendTeamInviteEmail } = await import("../services/email.js");
  sendTeamInviteEmail(email.toLowerCase(), req.vendor.company_name, acceptUrl).catch((err) =>
    console.error("[Team] Failed to send invite email:", err.message)
  );

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
