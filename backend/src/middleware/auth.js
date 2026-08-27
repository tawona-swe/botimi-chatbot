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
    const session = db.prepare("SELECT id, team_member_id FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or revoked" });
    }

    // Get vendor — for a team-member session this is the OWNING vendor's row,
    // so every existing vendor-scoped query in the app keeps working unchanged
    // regardless of who's actually logged in.
    const vendor = db.prepare("SELECT id, email, name, company_name, subscription_plan, subscription_status, is_suspended, is_superadmin, ticket_addon, conversations_limit, conversations_used FROM vendors WHERE id = ?").get(payload.vendorId);

    if (!vendor) {
      return res.status(401).json({ error: "Vendor not found" });
    }

    if (vendor.is_suspended) {
      return res.status(403).json({ error: "Account suspended" });
    }

    // If this session belongs to an invited team member (not the vendor owner
    // itself), attach who's actually acting for routes that need to know.
    if (session.team_member_id) {
      const teamMember = db.prepare("SELECT id, email, name, role, is_active FROM team_members WHERE id = ? AND vendor_id = ?").get(session.team_member_id, vendor.id);
      if (!teamMember || !teamMember.is_active) {
        return res.status(401).json({ error: "Team member account inactive or removed" });
      }
      req.teamMember = teamMember;
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
 * Require one of the given team roles. The vendor owner (a session with no
 * req.teamMember — i.e. logged in directly as the account, not an invited
 * seat) always passes, since they implicitly outrank every team role.
 */
export function requireTeamRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.teamMember) return next();
    if (!allowedRoles.includes(req.teamMember.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
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
