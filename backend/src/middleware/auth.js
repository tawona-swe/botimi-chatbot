import jwt from "jsonwebtoken";
import config from "../config.js";
import db from "../db/index.js";

/**
 * Verify JWT token and attach vendor to request.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    // Verify session still exists in DB
    const session = db.prepare("SELECT id FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or revoked" });
    }

    // Get vendor
    const vendor = db.prepare("SELECT id, email, company_name, subscription_plan, subscription_status, is_suspended, is_superadmin, ticket_addon, conversations_limit, conversations_used FROM vendors WHERE id = ?").get(payload.vendorId);

    if (!vendor) {
      return res.status(401).json({ error: "Vendor not found" });
    }

    if (vendor.is_suspended) {
      return res.status(403).json({ error: "Account suspended" });
    }

    // Update last_active
    db.prepare("UPDATE vendors SET last_active_at = datetime('now') WHERE id = ?").run(vendor.id);

    req.vendor = vendor;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Require superadmin role.
 */
export function requireSuperadmin(req, res, next) {
  if (!req.vendor || !req.vendor.is_superadmin) {
    return res.status(403).json({ error: "Superadmin access required" });
  }
  next();
}

/**
 * Optional auth — attaches vendor if token present, but doesn't require it.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const vendor = db.prepare("SELECT id, email, company_name FROM vendors WHERE id = ?").get(payload.vendorId);
    if (vendor) {
      req.vendor = vendor;
    }
  } catch {
    // Silently continue without auth
  }
  next();
}
