import { Router } from "express";
import db from "../db/index.js";

const router = Router();

/**
 * GET /api/public/tickets/:id/csat
 * Fetch just enough to render the rating page (no auth — the ticket's own
 * UUID is the access token, same low-stakes pattern chat.js's public
 * endpoints already use).
 */
router.get("/:id/csat", (req, res) => {
  const ticket = db.prepare("SELECT id, ticket_number, subject, status, csat_rating FROM tickets WHERE id = ?").get(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json({ ticket });
});

/**
 * POST /api/public/tickets/:id/csat
 * Submit a satisfaction rating. No auth — public link from the resolution email.
 */
router.post("/:id/csat", (req, res) => {
  const ticket = db.prepare("SELECT id, csat_rating FROM tickets WHERE id = ?").get(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const rating = parseInt(req.body.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be an integer from 1 to 5" });
  }

  if (ticket.csat_rating) {
    return res.status(409).json({ error: "This ticket has already been rated" });
  }

  const comment = (req.body.comment || "").slice(0, 1000);
  db.prepare("UPDATE tickets SET csat_rating = ?, csat_comment = ? WHERE id = ?").run(rating, comment, req.params.id);

  res.json({ message: "Thanks for the feedback!" });
});

export default router;
