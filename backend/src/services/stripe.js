import Stripe from "stripe";
import config from "../config.js";

let stripeClient = null;

function getClient() {
  if (!stripeClient) {
    if (!config.stripe.secretKey) {
      throw new Error("Stripe secret key not configured");
    }
    stripeClient = new Stripe(config.stripe.secretKey);
  }
  return stripeClient;
}

/**
 * Create a Stripe checkout session for subscription.
 */
export async function createCheckoutSession(vendorId, vendorEmail, vendorName, planId, ticketAddon = false) {
  const stripe = getClient();
  const priceId = config.stripe.prices[planId];
  if (!priceId) throw new Error(`Invalid plan: ${planId}`);

  const lineItems = [{ price: priceId, quantity: 1 }];

  // Add ticket add-on if enabled (as a separate line item or percentage)
  if (ticketAddon) {
    // In production, create a separate price for the add-on
    // For now, we note it in metadata
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: vendorEmail,
    mode: "subscription",
    line_items: lineItems,
    success_url: `${config.frontendUrl}/dashboard?checkout=success`,
    cancel_url: `${config.frontendUrl}/onboarding?checkout=canceled`,
    metadata: {
      vendorId,
      planId,
      ticketAddon: ticketAddon ? "true" : "false",
    },
    subscription_data: {
      metadata: {
        vendorId,
        planId,
        ticketAddon: ticketAddon ? "true" : "false",
      },
    },
  });

  return session;
}

/**
 * Create a Stripe billing portal session.
 */
export async function createBillingPortalSession(stripeCustomerId) {
  const stripe = getClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${config.frontendUrl}/dashboard/settings`,
  });
  return session;
}

/**
 * Handle Stripe webhook events.
 */
export async function handleWebhookEvent(body, signature) {
  const stripe = getClient();
  const event = stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret);
  return event;
}

export { getClient as getStripeClient };
