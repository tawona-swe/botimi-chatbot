import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import config from "../config.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

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
      INSERT INTO vendors (id, email, password_hash, name, company_name, industry, subscription_plan, subscription_status, conversations_limit, trial_ends_at)
      VALUES (?, ?, ?, ?, ?, ?, 'trial', 'trialing', 500, ?)
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

    if (!vendor) {
      // Create new vendor account
      const id = uuidv4();
      const trialEndsAt = new Date(Date.now() + config.limits.trialDays * 24 * 60 * 60 * 1000).toISOString();

      // Generate a random password for OAuth users (they won't log in via email/password)
      const randomPassword = await bcrypt.hash(uuidv4() + Date.now(), 12);

      db.prepare(`
        INSERT INTO vendors (id, email, password_hash, name, subscription_plan, subscription_status, conversations_limit, trial_ends_at)
        VALUES (?, ?, ?, ?, 'trial', 'trialing', 500, ?)
      `).run(id, googleEmail.toLowerCase(), randomPassword, googleName, trialEndsAt);

      // Create default bot
      const botId = uuidv4();
      db.prepare(`
        INSERT INTO bots (id, vendor_id, name, welcome_message, response_tone, model_provider, model_name)
        VALUES (?, ?, 'botimi AI', 'Hello! I\'ve analyzed your documentation. How can I help you today?', 'professional', 'groq', 'llama3-70b')
      `).run(botId, id);

      vendor = db.prepare("SELECT * FROM vendors WHERE id = ?").get(id);
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
    });
  } catch (err) {
    console.error("[Auth] Google OAuth error:", err);
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
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
