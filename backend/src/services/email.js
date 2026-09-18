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
