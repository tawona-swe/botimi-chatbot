import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { chatCompletion } from "../services/modelRouter.js";

const router = Router();

// The dashboard assistant is internal-only — every route here requires a logged-in vendor.
router.use(authenticate);

const SYSTEM_PROMPT = `You are the botimi Dashboard Guide, an in-app assistant that helps vendors use the botimi dashboard itself. You are NOT one of their customer-facing bots and you cannot be embedded on anyone's website — if asked to be deployed or embedded, explain that you're an internal guide only, and point them to the "Deploy New Bot" flow for creating a bot they can embed.

You help with things like:
- Creating and training bots (Bots page: crawl a website or upload documents to build a knowledge base)
- Getting the embed/install snippet for a bot (open the bot in the Bots page, or the Onboarding Wizard, and use its "embed code" — each bot's snippet uses that bot's own ID)
- Reading Analytics (conversation volume, resolution rate, escalations)
- Managing Support tickets escalated from bot conversations
- Account Settings and subscription plans (Starter, Growth, Scale)

You can also physically send the vendor to a page in the dashboard using the "navigate" tool — use it when they express an intent to GO somewhere or DO something (e.g. "I want to create a bot," "show me my analytics," "take me to settings"). For plain "how do I..." questions where they just want an explanation, answer in text instead of navigating.

Keep answers short, concrete, and specific to navigating the botimi dashboard. If asked something outside that scope, say so briefly rather than guessing.`;

const VALID_SCREENS = ["dashboard", "bots", "analytics", "support", "settings", "onboarding"];
const VALID_ACTIONS = ["create-bot"];

const NAV_TOOL = {
  type: "function",
  function: {
    name: "navigate",
    description:
      "Send the vendor's browser to a page in the botimi dashboard, optionally triggering a follow-up action once there. Use this when the vendor wants to GO somewhere or DO something (create a bot, check analytics, view support tickets, change settings) — not for plain 'how do I...' questions, which should just be answered in text.",
    parameters: {
      type: "object",
      properties: {
        screen: { type: "string", enum: VALID_SCREENS, description: "The dashboard page to navigate to." },
        action: {
          type: "string",
          enum: VALID_ACTIONS,
          description: "Optional follow-up action to trigger after navigating, e.g. auto-opening the 'New Bot' modal on the bots screen.",
        },
      },
      required: ["screen"],
    },
  },
};

const NAV_REPLIES = {
  "dashboard": "Heading to your Overview dashboard.",
  "bots": "Heading to your Bots page.",
  "bots:create-bot": "Opening the bot creation flow on your Bots page.",
  "analytics": "Pulling up your Analytics.",
  "support": "Opening your Support inbox.",
  "settings": "Taking you to Settings.",
  "onboarding": "Launching the bot deployment wizard.",
};

/**
 * POST /api/assistant/chat
 * Stateless chat with the internal dashboard guide. The client keeps the
 * conversation history and resends it each turn — this assistant has no
 * bot record, no knowledge base, and no conversation/message rows of its
 * own, since it isn't a deployable customer-facing bot.
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
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
      const action = VALID_ACTIONS.includes(args.action) ? args.action : undefined;

      if (screen) {
        const replyKey = action ? `${screen}:${action}` : screen;
        return res.json({
          reply: NAV_REPLIES[replyKey] || `Heading to ${screen}...`,
          navigate: { screen, action },
        });
      }
    }

    res.json({ reply: result.content, navigate: null });
  } catch (err) {
    console.error("[Assistant] Error:", err);
    res.status(500).json({ error: "Failed to reach the dashboard guide" });
  }
});

export default router;
