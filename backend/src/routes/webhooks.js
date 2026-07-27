import { Router } from "express";
import db from "../db/index.js";

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe subscription events.
 */
router.post("/stripe", async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  try {
    const { handleWebhookEvent } = await import("../services/stripe.js");
    const event = await handleWebhookEvent(JSON.stringify(req.body), signature);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const vendorId = session.metadata?.vendorId;
        const planId = session.metadata?.planId;

        if (vendorId && planId) {
          db.prepare(`
            UPDATE vendors SET
              subscription_plan = ?,
              subscription_status = 'active',
              stripe_customer_id = ?,
              stripe_subscription_id = ?,
              ticket_addon = ?
            WHERE id = ?
          `).run(
            planId,
            session.customer || "",
            session.subscription || "",
            session.metadata?.ticketAddon === "true" ? 1 : 0,
            vendorId
          );
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          db.prepare("UPDATE vendors SET subscription_status = 'active' WHERE stripe_subscription_id = ?").run(subscriptionId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object;
        const failedSubId = failedInvoice.subscription;

        if (failedSubId) {
          db.prepare("UPDATE vendors SET subscription_status = 'past_due' WHERE stripe_subscription_id = ?").run(failedSubId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object;
        db.prepare("UPDATE vendors SET subscription_status = 'canceled', subscription_plan = 'trial' WHERE stripe_subscription_id = ?").run(deletedSub.id);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
});

export default router;
