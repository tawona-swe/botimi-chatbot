import config from "../config.js";

let emailClient = null;

/**
 * Send an email using Resend or SendGrid compatible API.
 * Falls back to console logging in development.
 */
export async function sendEmail({ to, subject, html, from, replyTo }) {
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
          ...(replyTo ? { reply_to: replyTo } : {}),
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

// Shared brand shell every email renders through, so a color/logo change
// only has to happen in one place. Deliberately simple and light-only:
// email clients (Outlook especially) don't reliably support @font-face,
// flexbox, or position:absolute the way the actual product's web pages
// can, so this uses table-safe inline styles and a plain bold wordmark
// instead of the web app's Outfit font + absolutely-positioned dot.
// Colors are the real current brand tokens (frontend/app/globals.css) —
// this previously used a leftover #c0c1ff/#1000a9 pair that matched
// neither the old nor the current palette.
const BRAND = {
  ink: "#1a1a2e",
  inkSoft: "#5a5a72",
  surface: "#ffffff",
  surfaceAlt: "#f4f5f9",
  line: "#e0e4ea",
  primary: "#4A1A8A",
  onPrimary: "#ffffff",
  accent: "#B87E1A",
};

function renderEmailShell(bodyHtml) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: ${BRAND.surface}; padding: 32px 28px; border-radius: 16px; border: 1px solid ${BRAND.line};">
      <div style="margin-bottom: 28px;">
        <span style="font-size: 20px; font-weight: 800; color: ${BRAND.primary};">botimi<span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${BRAND.accent}; margin-left: 3px; vertical-align: super;"></span></span>
      </div>
      ${bodyHtml}
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid ${BRAND.line}; font-size: 12px; color: ${BRAND.inkSoft};">
        botimi — AI chatbots for customer support &amp; sales
      </div>
    </div>
  `;
}

function renderButton(href, label) {
  return `<a href="${href}" style="display: inline-block; background: ${BRAND.primary}; color: ${BRAND.onPrimary}; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px;">${label}</a>`;
}

function renderInfoBox(rowsHtml) {
  return `<div style="background: ${BRAND.surfaceAlt}; padding: 18px 20px; border-radius: 12px; margin: 20px 0; color: ${BRAND.ink};">${rowsHtml}</div>`;
}

/**
 * Welcome a brand-new vendor right after signup. Nothing sent one existed
 * before this -- a new account got zero confirmation that signup worked.
 */
export async function sendWelcomeEmail(vendorEmail, name) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  return sendEmail({
    to: vendorEmail,
    subject: "Welcome to botimi — let's get your bot trained",
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Welcome to botimi</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6; margin: 0 0 8px;">${greeting}</p>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your 14-day free trial is active — no credit card needed. Point your bot at your website or upload a few documents and it'll be answering real questions in minutes.</p>
      ${renderButton(`${config.frontendUrl}/onboarding-plan`, "Get started")}
    `),
  });
}

/**
 * Password-reset link. Deliberately doesn't say whether the account exists
 * -- callers should send this only after already deciding to (and always
 * return the same generic response to the client either way, to avoid
 * leaking which emails have accounts).
 */
export async function sendPasswordResetEmail(vendorEmail, resetUrl) {
  return sendEmail({
    to: vendorEmail,
    subject: "Reset your botimi password",
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Reset your password</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">We got a request to reset your botimi password. This link expires in 1 hour.</p>
      ${renderButton(resetUrl, "Reset password")}
      <p style="color: ${BRAND.inkSoft}; line-height: 1.6; font-size: 13px; margin-top: 20px;">Didn't request this? You can safely ignore this email — your password won't change.</p>
    `),
  });
}

/**
 * Team invite — the invitee sets their own password via acceptUrl, instead
 * of the previous flow where the inviting admin typed a password directly
 * and had to share it out-of-band in plaintext.
 */
export async function sendTeamInviteEmail(inviteeEmail, inviterCompany, acceptUrl) {
  return sendEmail({
    to: inviteeEmail,
    subject: `You've been invited to join ${inviterCompany || "a team"} on botimi`,
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">You're invited</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">${inviterCompany || "A botimi team"} has invited you to join their support team on botimi. Set up your password to get started — this link expires in 48 hours.</p>
      ${renderButton(acceptUrl, "Accept invite")}
    `),
  });
}

/**
 * Sent when a subscription is finally canceled after the dunning retries
 * are exhausted (see pesepayBilling.js's markVendorPaymentFailed). Only
 * card-paying vendors previously got any signal before this point
 * (remindCardVendorToRenew) -- Ecocash/Omari vendors got nothing at all
 * until the account was already suspended.
 */
export async function sendSubscriptionCanceledEmail(vendorEmail, planName) {
  return sendEmail({
    to: vendorEmail,
    subject: "Your botimi subscription has been canceled",
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Subscription canceled</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">We couldn't complete payment for your ${planName} plan after several attempts, so your subscription has been canceled and your bot is now paused.</p>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your data and settings are still here — reactivate any time.</p>
      ${renderButton(`${config.frontendUrl}/settings`, "Choose a plan")}
    `),
  });
}

/**
 * Payment receipt for a plan purchase or renewal.
 */
export async function sendPaymentReceiptEmail(vendorEmail, planName, amount, currencyCode) {
  return sendEmail({
    to: vendorEmail,
    subject: `Receipt: your botimi ${planName} plan payment`,
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Payment received</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Thanks — your payment for the ${planName} plan went through.</p>
      ${renderInfoBox(`<p style="margin: 0 0 6px;"><strong>Plan:</strong> ${planName}</p><p style="margin: 0;"><strong>Amount:</strong> ${amount} ${currencyCode}</p>`)}
      ${renderButton(`${config.frontendUrl}/settings`, "View billing")}
    `),
  });
}

/**
 * Receipt for a one-off conversation-credit top-up purchase.
 */
export async function sendTopUpReceiptEmail(vendorEmail, credits, amount, currencyCode) {
  return sendEmail({
    to: vendorEmail,
    subject: "Receipt: your botimi credit top-up",
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Top-up received</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your payment went through and the credits have been added to your balance.</p>
      ${renderInfoBox(`<p style="margin: 0 0 6px;"><strong>Credits added:</strong> ${credits.toLocaleString()}</p><p style="margin: 0;"><strong>Amount:</strong> ${amount} ${currencyCode}</p>`)}
      ${renderButton(`${config.frontendUrl}/settings`, "View billing")}
    `),
  });
}

/**
 * Notify a team member a ticket has been assigned to them directly (manual
 * reassignment) -- distinct from sendNewTicketAlert, which fires on a bot
 * escalation to the whole account, not a specific person.
 */
export async function sendTicketAssignedEmail(assigneeEmail, ticketNumber, subject) {
  return sendEmail({
    to: assigneeEmail,
    subject: `[${ticketNumber}] Assigned to you: ${subject}`,
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">A ticket was assigned to you</h1>
      ${renderInfoBox(`<p style="margin: 0 0 6px;"><strong>Ticket:</strong> ${ticketNumber}</p><p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>`)}
      ${renderButton(`${config.frontendUrl}/support`, "Open in Support Inbox")}
    `),
  });
}

/**
 * Send ticket confirmation to customer.
 */
export async function sendTicketConfirmation(email, ticketNumber, subject) {
  return sendEmail({
    to: email,
    subject: `[${ticketNumber}] Support ticket received: ${subject}`,
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Support ticket created</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your support ticket has been received.</p>
      ${renderInfoBox(`<p style="margin: 0 0 6px;"><strong>Ticket:</strong> ${ticketNumber}</p><p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>`)}
      <p style="color: ${BRAND.ink}; line-height: 1.6;">We'll get back to you as soon as possible.</p>
    `),
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
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Ticket resolved</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your support ticket <strong>${ticketNumber}</strong> (${subject}) has been marked resolved.</p>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">How did we do?</p>
      ${renderButton(ratingUrl, "Rate your support experience")}
    `),
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
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Your bot handed off a conversation</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">It couldn't confidently answer, so a customer is now waiting on your team.</p>
      ${renderInfoBox(`
        <p style="margin: 0 0 6px;"><strong>Ticket:</strong> ${ticketNumber}</p>
        <p style="margin: 0;${priority ? " margin-bottom: 6px;" : ""}"><strong>Subject:</strong> ${subject}</p>
        ${priority ? `<p style="margin: 0;"><strong>Priority:</strong> ${priority}</p>` : ""}
      `)}
      ${renderButton(`${config.frontendUrl}/support`, "Open in Support Inbox")}
    `),
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
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Your trial has ended</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your 14-day free trial is over, so your bot is paused until you choose a plan — your data and settings are all still here.</p>
      ${renderButton(`${config.frontendUrl}/settings`, "Choose a plan")}
    `),
  });
}

/**
 * Remind a card-paying vendor their plan is due for renewal. Card payments
 * go through Pesepay's redirect flow, which has no stored payment method to
 * re-charge silently (unlike Ecocash's phone-PIN push) — they have to click
 * through and pay again themselves.
 */
export async function sendRenewalReminder(vendorEmail, planName) {
  return sendEmail({
    to: vendorEmail,
    subject: "Your botimi plan is due for renewal",
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Time to renew</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">Your ${planName} plan is due for renewal. Since you pay by card, we can't charge you automatically — click below to renew and keep your bot running without interruption.</p>
      ${renderButton(`${config.frontendUrl}/settings`, "Renew now")}
    `),
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Relay an inbound email (support@botimi.co.zw etc) to the real address a
 * human actually checks. Resend receives the mail but has no forwarding
 * toggle of its own -- see routes/emailWebhook.js, which calls this after
 * verifying and fetching the full message. replyTo is the original sender,
 * so replying to the forwarded email replies straight back to them instead
 * of to noreply@. The original body is escaped and shown as preformatted
 * text rather than rendered as HTML, since it's untrusted content from
 * whoever emailed in.
 */
export async function sendInboundEmailForward({ to, from, subject, text, html, attachments }) {
  const bodyText = text || (html ? stripHtmlTags(html) : "(no content)");
  const attachmentNote = attachments?.length
    ? `<p style="color: ${BRAND.inkSoft}; font-size: 13px;">${attachments.length} attachment(s): ${attachments.map((a) => escapeHtml(a.filename)).join(", ")} — view in the <a href="https://resend.com/emails">Resend dashboard</a>.</p>`
    : "";

  return sendEmail({
    to,
    replyTo: from,
    subject: `[botimi inbound] ${subject || "(no subject)"}`,
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 20px; margin: 0 0 16px;">New message to your support inbox</h1>
      ${renderInfoBox(`<p style="margin: 0 0 6px;"><strong>From:</strong> ${escapeHtml(from)}</p><p style="margin: 0;"><strong>Subject:</strong> ${escapeHtml(subject || "(no subject)")}</p>`)}
      <pre style="white-space: pre-wrap; font-family: inherit; color: ${BRAND.ink}; line-height: 1.6; background: ${BRAND.surfaceAlt}; padding: 16px; border-radius: 10px; font-size: 14px; margin: 0;">${escapeHtml(bodyText)}</pre>
      ${attachmentNote}
      <p style="color: ${BRAND.inkSoft}; font-size: 13px; margin-top: 16px;">Reply to this email to respond directly to ${escapeHtml(from)}.</p>
    `),
  });
}

/**
 * Send overage alert to vendor.
 */
export async function sendOverageAlert(vendorEmail, usagePct, planName) {
  return sendEmail({
    to: vendorEmail,
    subject: `botimi — your conversation credits are running low`,
    html: renderEmailShell(`
      <h1 style="color: ${BRAND.ink}; font-size: 22px; margin: 0 0 16px;">Running low on credits</h1>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">You've used <strong>${usagePct}%</strong> of a typical ${planName} plan cycle's worth of conversation credits.</p>
      <p style="color: ${BRAND.ink}; line-height: 1.6;">When your balance hits zero, the bot hands new conversations straight to your support inbox instead of answering them — top up now to keep it answering automatically.</p>
      ${renderButton(`${config.frontendUrl}/settings`, "Buy more credits")}
    `),
  });
}
