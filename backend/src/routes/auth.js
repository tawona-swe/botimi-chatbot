import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import db from "../db/index.js";
import config from "../config.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Reset/invite tokens: generate a high-entropy random token, store only its
// SHA-256 hash (a DB leak alone then can't be used to reset an account),
// and send the raw token in the email — this is a lookup hash, not a
// password, so a fast hash is the right tool (bcrypt is deliberately slow
// for password storage, not needed here for a random 32-byte value).
function generateToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

// SQLite's datetime('now') produces "YYYY-MM-DD HH:MM:SS" (space-separated,
// no milliseconds/Z) — comparing that against a JS .toISOString() value
// ("YYYY-MM-DDTHH:MM:SS.sssZ") as plain strings breaks on the day an
// expiry falls due, since 'T' (0x54) sorts after a space (0x20). Same bug
// class already caught and fixed for next_charge_at and trial_ends_at
// elsewhere in this codebase — always store expiry timestamps in SQLite's
// own format, not toISOString()'s.
function toSqliteDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/auth/signup
 * Register a new vendor account.
 */
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { email, password, companyName, name, industry } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check existing
    const existing = db.prepare("SELECT id FROM vendors WHERE email = ?").get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date(Date.now() + config.limits.trialDays * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO vendors (id, email, password_hash, name, company_name, industry, subscription_plan, subscription_status, conversations_limit, conversation_credits, trial_ends_at)
      VALUES (?, ?, ?, ?, ?, ?, 'trial', 'trialing', 500, 500, ?)
    `).run(id, email.toLowerCase(), passwordHash, name || "", companyName || "", industry || "", trialEndsAt);

    // Create default bot
    const botId = uuidv4();
    db.prepare(`
      INSERT INTO bots (id, vendor_id, name, welcome_message, response_tone, model_provider, model_name)
      VALUES (?, ?, 'botimi AI', 'Hello! I''ve analyzed your documentation. How can I help you today?', 'professional', 'groq', 'llama3-70b')
    `).run(botId, id);

    // Generate JWT
    const token = jwt.sign({ vendorId: id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Store session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO sessions (id, vendor_id, token, expires_at) VALUES (?, ?, ?, ?)").run(sessionId, id, token, expiresAt);

    import("../services/email.js")
      .then(({ sendWelcomeEmail }) => sendWelcomeEmail(email.toLowerCase(), name))
      .catch((err) => console.error("[Auth] Failed to send welcome email:", err.message));

    res.status(201).json({
      token,
      vendor: {
        id,
        email: email.toLowerCase(),
        companyName: companyName || "",
        name: name || "",
        plan: "trial",
        trialEndsAt,
      },
    });
  } catch (err) {
    console.error("[Auth] Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a vendor.
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    let vendor = db.prepare("SELECT * FROM vendors WHERE email = ?").get(email.toLowerCase());
    let teamMember = null;

    if (!vendor) {
      // Not an owner account — check invited team-member seats.
      teamMember = db.prepare("SELECT * FROM team_members WHERE email = ?").get(email.toLowerCase());
      if (!teamMember) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!teamMember.is_active) {
        return res.status(403).json({ error: "This team member account has been removed" });
      }
      const teamValid = await bcrypt.compare(password, teamMember.password_hash);
      if (!teamValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      vendor = db.prepare("SELECT * FROM vendors WHERE id = ?").get(teamMember.vendor_id);
      if (!vendor) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    } else {
      const valid = await bcrypt.compare(password, vendor.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }

    if (vendor.is_suspended) {
      return res.status(403).json({ error: "Account has been suspended" });
    }

    const token = jwt.sign(
      teamMember ? { vendorId: vendor.id, teamMemberId: teamMember.id } : { vendorId: vendor.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Store session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO sessions (id, vendor_id, token, expires_at, team_member_id) VALUES (?, ?, ?, ?, ?)").run(sessionId, vendor.id, token, expiresAt, teamMember?.id || null);

    // Update last active
    db.prepare("UPDATE vendors SET last_active_at = datetime('now') WHERE id = ?").run(vendor.id);

    // Get default bot
    const bot = db.prepare("SELECT id, name FROM bots WHERE vendor_id = ? ORDER BY created_at ASC LIMIT 1").get(vendor.id);

    res.json({
      token,
      vendor: {
        id: vendor.id,
        email: vendor.email,
        companyName: vendor.company_name,
        name: vendor.name,
        plan: vendor.subscription_plan,
        subscriptionStatus: vendor.subscription_status,
        trialEndsAt: vendor.trial_ends_at,
        ticketAddon: !!vendor.ticket_addon,
        botId: bot?.id,
      },
      teamMember: teamMember ? { id: teamMember.id, email: teamMember.email, name: teamMember.name, role: teamMember.role } : null,
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Failed to authenticate" });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate the current session.
 */
router.post("/logout", authenticate, (req, res) => {
  const header = req.headers.authorization;
  const token = header.split(" ")[1];
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.json({ message: "Logged out successfully" });
});

/**
 * POST /api/auth/google
 * Authenticate or register via Google OAuth.
 */
router.post("/google", authLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    // Verify the Google ID token using Google's token info endpoint
    let googlePayload;
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!response.ok) throw new Error("Invalid token");
      googlePayload = await response.json();
    } catch {
      return res.status(401).json({ error: "Invalid or expired Google token" });
    }

    const googleEmail = googlePayload.email;
    const googleName = googlePayload.name || googlePayload.given_name || "";

    if (!googleEmail) {
      return res.status(400).json({ error: "Could not retrieve email from Google" });
    }

    // Check if vendor already exists with this email
    let vendor = db.prepare("SELECT * FROM vendors WHERE email = ?").get(googleEmail.toLowerCase());
    const isNewUser = !vendor;

    if (!vendor) {
      // Create new vendor account
      const id = uuidv4();
      const trialEndsAt = new Date(Date.now() + config.limits.trialDays * 24 * 60 * 60 * 1000).toISOString();

      // Generate a random password for OAuth users (they won't log in via email/password)
      const randomPassword = await bcrypt.hash(uuidv4() + Date.now(), 12);

      db.prepare(`
        INSERT INTO vendors (id, email, password_hash, name, subscription_plan, subscription_status, conversations_limit, conversation_credits, trial_ends_at)
        VALUES (?, ?, ?, ?, 'trial', 'trialing', 500, 500, ?)
      `).run(id, googleEmail.toLowerCase(), randomPassword, googleName, trialEndsAt);

      // Create default bot
      const botId = uuidv4();
      db.prepare(`
        INSERT INTO bots (id, vendor_id, name, welcome_message, response_tone, model_provider, model_name)
        VALUES (?, ?, 'botimi AI', 'Hello! I\'ve analyzed your documentation. How can I help you today?', 'professional', 'groq', 'llama3-70b')
      `).run(botId, id);

      vendor = db.prepare("SELECT * FROM vendors WHERE id = ?").get(id);

      import("../services/email.js")
        .then(({ sendWelcomeEmail }) => sendWelcomeEmail(googleEmail.toLowerCase(), googleName))
        .catch((err) => console.error("[Auth] Failed to send welcome email:", err.message));
    }

    if (vendor.is_suspended) {
      return res.status(403).json({ error: "Account has been suspended" });
    }

    // Generate JWT
    const token = jwt.sign({ vendorId: vendor.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Store session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO sessions (id, vendor_id, token, expires_at) VALUES (?, ?, ?, ?)").run(sessionId, vendor.id, token, expiresAt);

    // Update last active
    db.prepare("UPDATE vendors SET last_active_at = datetime('now') WHERE id = ?").run(vendor.id);

    // Get default bot
    const bot = db.prepare("SELECT id, name FROM bots WHERE vendor_id = ? ORDER BY created_at ASC LIMIT 1").get(vendor.id);

    res.json({
      token,
      vendor: {
        id: vendor.id,
        email: vendor.email,
        companyName: vendor.company_name,
        name: vendor.name,
        plan: vendor.subscription_plan,
        subscriptionStatus: vendor.subscription_status,
        trialEndsAt: vendor.trial_ends_at,
        ticketAddon: !!vendor.ticket_addon,
        botId: bot?.id,
      },
      isNewUser,
    });
  } catch (err) {
    console.error("[Auth] Google OAuth error:", err);
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password-reset link. Always returns the same generic response
 * regardless of whether the email has an account, so this endpoint can't be
 * used to enumerate registered emails.
 */
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  const generic = { message: "If an account exists for that email, a reset link has been sent." };

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const vendor = db.prepare("SELECT id, name FROM vendors WHERE email = ?").get(email.toLowerCase());
    if (vendor) {
      const { raw, hash } = generateToken();
      const expiresAt = toSqliteDatetime(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
      db.prepare("UPDATE vendors SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?").run(hash, expiresAt, vendor.id);

      const resetUrl = `${config.frontendUrl}/reset-password?token=${raw}`;
      const { sendPasswordResetEmail } = await import("../services/email.js");
      await sendPasswordResetEmail(email.toLowerCase(), resetUrl).catch((err) =>
        console.error("[Auth] Failed to send password reset email:", err.message)
      );
    }
    res.json(generic);
  } catch (err) {
    console.error("[Auth] Forgot-password error:", err);
    res.json(generic); // still generic on error — don't leak internal failures either
  }
});

/**
 * POST /api/auth/reset-password
 * Complete a password reset. Invalidates every existing session for the
 * account, same as any real reset flow should — a reset is exactly the
 * moment an old session might be the attacker's, not the legitimate user's.
 */
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and new password are required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const vendor = db.prepare(
    "SELECT id FROM vendors WHERE reset_token = ? AND reset_token_expires_at > datetime('now')"
  ).get(hash);

  if (!vendor) {
    return res.status(400).json({ error: "This reset link is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare("UPDATE vendors SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?").run(passwordHash, vendor.id);
  db.prepare("DELETE FROM sessions WHERE vendor_id = ?").run(vendor.id);

  res.json({ message: "Password reset successfully. Please log in with your new password." });
});

/**
 * GET /api/auth/me
 * Get current vendor profile.
 */
router.get("/me", authenticate, (req, res) => {
  const vendor = db.prepare("SELECT id, email, name, company_name, industry, logo_url, brand_color, country, subscription_plan, subscription_status, is_superadmin, ticket_addon, conversations_used, conversations_limit, trial_ends_at, created_at FROM vendors WHERE id = ?").get(req.vendor.id);
  const bot = db.prepare("SELECT id, name, is_active FROM bots WHERE vendor_id = ? ORDER BY created_at ASC LIMIT 1").get(req.vendor.id);

  res.json({
    vendor: {
      ...vendor,
      ticketAddon: !!vendor.ticket_addon,
      isSuperadmin: !!vendor.is_superadmin,
      botId: bot?.id,
      botName: bot?.name,
    },
    teamMember: req.teamMember ? { id: req.teamMember.id, email: req.teamMember.email, name: req.teamMember.name, role: req.teamMember.role } : null,
  });
});

export default router;
