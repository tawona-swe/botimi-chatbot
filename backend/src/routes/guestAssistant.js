import { Router } from "express";
import { chatCompletion } from "../services/modelRouter.js";
import { guestAssistantLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Public — no authenticate middleware. This talks to anonymous visitors on
// the marketing site, not logged-in vendors, so it's rate-limited per IP
// instead of per vendor (see guestAssistantLimiter).
router.use(guestAssistantLimiter);

const SYSTEM_PROMPT = `You are the botimi site guide — a helper on botimi's own marketing website (not a bot a customer has deployed; you help people evaluating or signing up for botimi itself).

You can answer questions about:
- Pricing: Starter $29/mo (500 chats/mo, 1 bot), Growth $79/mo (5,000 chats/mo, 5 bots, most popular), Scale $199/mo (unlimited chats/bots, SSO, dedicated account manager). Annual billing saves ~17%. Every plan starts with a 14-day free trial, no credit card required.
- What botimi does: train a chatbot on your own content (crawl your website or upload documents), embed it on your site as a widget, run the same trained bot on WhatsApp Business, and manage escalations it can't handle from a built-in support inbox with team seats, canned responses, and AI-suggested replies.
- How it works / getting started: register for a free trial, then the onboarding wizard walks through naming the bot, pointing it at a website to crawl or documents to upload, customizing its look, and getting the embed snippet — usually a few minutes end to end.
- Enterprise needs: custom integrations, higher volume, dedicated support — point them at the Enterprise page or "Contact Sales".

You can send the visitor to a page on this site using the "navigate" tool — use it when they express intent to GO somewhere (e.g. "show me pricing," "how do I get started," "I want to sign up," "tell me about enterprise"). For plain informational questions, just answer in text; only navigate when there's a clear an intent to go somewhere or an obvious clear next step (e.g. after explaining pricing, offer to take them to the pricing page or registration).

Keep answers short and concrete. You don't have access to any specific customer's account, bots, or data — if asked about someone's own account, explain that's what the dashboard (after logging in) is for, not this site guide.`;

const VALID_SCREENS = ["landing", "pricing", "how-it-works", "enterprise", "docs", "register", "login"];

const NAV_TOOL = {
  type: "function",
  function: {
    name: "navigate",
    description:
      "Send the visitor's browser to a page on botimi's marketing site. Use this when they want to GO somewhere (see pricing, start signing up, read docs, log in, learn about enterprise) — not for plain informational questions, which should just be answered in text.",
    parameters: {
      type: "object",
      properties: {
        screen: { type: "string", enum: VALID_SCREENS, description: "The public page to navigate to." },
      },
      required: ["screen"],
    },
  },
};

const NAV_REPLIES = {
  "landing": "Heading back to the homepage.",
  "pricing": "Here's our pricing.",
  "how-it-works": "Let me show you how it works.",
  "enterprise": "Here's our Enterprise page.",
  "docs": "Opening the docs.",
  "register": "Let's get you signed up — taking you to registration.",
  "login": "Taking you to log in.",
};

/**
 * POST /api/guest-assistant/chat
 * Stateless chat with the public site guide. No auth, no bot record, no
 * conversation/message rows — this isn't a deployable customer-facing bot,
 * it's a fixed guide scoped to botimi's own marketing content.
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "message is too long" });
    }

    const trimmedHistory = Array.isArray(history)
      ? history
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-10)
      : [];

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmedHistory,
      { role: "user", content: message },
    ];

    const result = await chatCompletion(messages, {
      temperature: 0.4,
      tools: [NAV_TOOL],
      tool_choice: "auto",
    });

    const call = result.toolCalls?.[0];
    if (call?.function?.name === "navigate") {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // fall through to text reply below
      }

      const screen = VALID_SCREENS.includes(args.screen) ? args.screen : null;
      if (screen) {
        return res.json({ reply: NAV_REPLIES[screen] || `Heading to ${screen}...`, navigate: { screen } });
      }
    }

    res.json({ reply: result.content, navigate: null });
  } catch (err) {
    console.error("[GuestAssistant] Error:", err);
    res.status(500).json({ error: "Failed to reach the site guide" });
  }
});

export default router;
