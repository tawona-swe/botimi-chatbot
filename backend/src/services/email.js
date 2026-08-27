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
 * Send overage alert to vendor.
 */
export async function sendOverageAlert(vendorEmail, usagePct, planName) {
  return sendEmail({
    to: vendorEmail,
    subject: `⚠️ botimi — You've used ${usagePct}% of your conversations`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c0c1ff;">Usage Alert</h1>
        <p>You've used <strong>${usagePct}%</strong> of your ${planName} plan's monthly conversation limit.</p>
        <p>Additional conversations will be billed at $0.02 each.</p>
        <a href="${config.frontendUrl}/dashboard/settings" style="display: inline-block; background: #c0c1ff; color: #1000a9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Upgrade Plan</a>
      </div>
    `,
  });
}
