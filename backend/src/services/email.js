import config from "../config.js";

let emailClient = null;

/**
 * Send an email using Resend or SendGrid compatible API.
 * Falls back to console logging in development.
 */
export async function sendEmail({ to, subject, html, from }) {
  const fromAddress = from || config.email.from;

  if (config.isDev) {
    console.log(`[Email] To: ${to} | Subject: ${subject}`);
    console.log(`[Email] From: ${fromAddress}`);
    return { id: "dev-mode" };
  }

  // In production, use Resend or SendGrid
  // This is a placeholder that would be replaced with actual email service
  try {
    if (config.email.apiKey) {
      // Resend API
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.email.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.status}`);
      }

      return await response.json();
    }
  } catch (err) {
    console.error("[Email] Failed to send:", err.message);
  }

  return { id: "failed-dev-fallback" };
}

/**
 * Send ticket confirmation to customer.
 */
export async function sendTicketConfirmation(email, ticketNumber, subject) {
  return sendEmail({
    to: email,
    subject: `[${ticketNumber}] Support ticket received: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c0c1ff;">Support Ticket Created</h1>
        <p>Your support ticket has been received.</p>
        <div style="background: #1f1f27; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p><strong>Ticket:</strong> ${ticketNumber}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        <p>We'll get back to you as soon as possible.</p>
      </div>
    `,
  });
}

/**
 * Send a CSAT survey link once a ticket is resolved.
 */
export async function sendTicketResolvedWithCsat(email, ticketNumber, subject, ticketId) {
  const ratingUrl = `${config.frontendUrl}/csat/${ticketId}`;
  return sendEmail({
    to: email,
    subject: `[${ticketNumber}] Your support ticket has been resolved`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c0c1ff;">Ticket Resolved</h1>
        <p>Your support ticket <strong>${ticketNumber}</strong> (${subject}) has been marked resolved.</p>
        <p>How did we do?</p>
        <a href="${ratingUrl}" style="display: inline-block; background: #c0c1ff; color: #1000a9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Rate your support experience</a>
      </div>
    `,
  });
}

/**
 * Notify the vendor that the bot handed a conversation off to a human —
 * without this, an escalated ticket just sits in the dashboard until
 * someone happens to check it.
 */
export async function sendNewTicketAlert(vendorEmail, ticketNumber, subject, priority) {
  return sendEmail({
    to: vendorEmail,
    subject: `[${ticketNumber}] A customer needs you: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c0c1ff;">Your bot handed off a conversation</h1>
        <p>It couldn't confidently answer, so a customer is now waiting on your team.</p>
        <div style="background: #1f1f27; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p><strong>Ticket:</strong> ${ticketNumber}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          ${priority ? `<p><strong>Priority:</strong> ${priority}</p>` : ""}
        </div>
        <a href="${config.frontendUrl}/support" style="display: inline-block; background: #c0c1ff; color: #1000a9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open in Support Inbox</a>
      </div>
    `,
  });
}

/**
 * Notify a vendor their 14-day trial has ended and their account is now
 * suspended until they choose a plan.
 */
export async function sendTrialExpiredAlert(vendorEmail) {
  return sendEmail({
    to: vendorEmail,
    subject: "Your botimi trial has ended",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c0c1ff;">Your Trial Has Ended</h1>
        <p>Your 14-day free trial is over, so your bot is paused until you choose a plan — your data and settings are all still here.</p>
        <a href="${config.frontendUrl}/settings" style="display: inline-block; background: #c0c1ff; color: #1000a9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Choose a Plan</a>
      </div>
    `,
  });
}

/**
 * Send overage alert to vendor.
 */
export async function sendOverageAlert(vendorEmail, usagePct, planName) {
  return sendEmail({
    to: vendorEmail,
    subject: `⚠️ botimi — Your conversation credits are running low`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c0c1ff;">Running Low on Credits</h1>
        <p>You've used <strong>${usagePct}%</strong> of a typical ${planName} plan cycle's worth of conversation credits.</p>
        <p>When your balance hits zero, the bot hands new conversations straight to your support inbox instead of answering them — top up now to keep it answering automatically.</p>
        <a href="${config.frontendUrl}/settings" style="display: inline-block; background: #c0c1ff; color: #1000a9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Buy More Credits</a>
      </div>
    `,
  });
}
