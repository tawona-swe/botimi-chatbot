import "dotenv/config";

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  db: {
    path: process.env.DATABASE_PATH || "./data/botimi.db",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
  },

  opencodeZen: {
    apiKey: process.env.OPENCODE_ZEN_API_KEY || "",
  },

  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
  },

  email: {
    apiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "noreply@botimi.ai",
  },

  pesepay: {
    integrationKey: process.env.PESEPAY_INTEGRATION_KEY || "",
    encryptionKey: process.env.PESEPAY_ENCRYPTION_KEY || "",
    // "sandbox" uses currency "ZWL"; "production" uses "ZiG" — see project memory,
    // these are genuinely different environments with different hosts.
    env: process.env.PESEPAY_ENV || "sandbox",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "http://localhost:3001",

  appName: process.env.APP_NAME || "botimi",

  limits: {
    // Groq free tier limits
    groqRequestsPerMin: 30,
    groqTokensPerMin: 6000,
    geminiRequestsPerMin: 15,
    // Conversation overage
    overageCostPerConversation: 0.02,
    overageAlertPct: [80, 95],
    // Trial
    trialDays: 14,
  },

  // Two price sheets, one product — local (Zimbabwe) vs. international,
  // gated on the vendor's billing country, roughly a 2.5x multiple. Each
  // plan's conversationsPerMonth is the credit amount added to the vendor's
  // running conversation_credits balance every time the plan renews (see
  // pesepayBilling.js) — it is not a hard monthly cap, credits persist and
  // stack with top-ups rather than resetting to zero.
  plans: {
    starter: {
      name: "Starter",
      priceLocal: 19,
      priceIntl: 39,
      chatbots: 1,
      websites: 1,
      conversationsPerMonth: 600,
      crawlerPages: 50,
      documentUploads: 1,
      whiteLabel: false,
      support: "email",
    },
    growth: {
      name: "Growth",
      priceLocal: 49,
      priceIntl: 99,
      chatbots: 5,
      websites: 5,
      conversationsPerMonth: 2000,
      crawlerPages: 500,
      documentUploads: -1, // unlimited
      whiteLabel: false,
      support: "priority_email",
    },
    scale: {
      name: "Business",
      priceLocal: 129,
      priceIntl: 279,
      chatbots: -1,
      websites: -1,
      conversationsPerMonth: 6000,
      crawlerPages: -1,
      documentUploads: -1,
      whiteLabel: true,
      support: "dedicated_slack",
    },
  },

  // One-off conversation-credit purchases, bought when a vendor's balance
  // runs out mid-cycle. International prices follow the same ~2.5x plan
  // multiple (not independently verified against a document source).
  topUps: {
    small: { conversations: 300, priceLocal: 6, priceIntl: 15 },
    large: { conversations: 1000, priceLocal: 18, priceIntl: 45 },
  },
};

// Zimbabwe billing address gets the local price sheet; everything else gets
// international. Vendor country is free text (see SettingsPage.js), so this
// is a best-effort match, not a verified billing-address lookup.
const LOCAL_COUNTRY_NAMES = ["zimbabwe", "zim", "zw"];
export function isLocalVendor(vendor) {
  const country = (vendor?.country || "").trim().toLowerCase();
  return LOCAL_COUNTRY_NAMES.includes(country);
}

export function planPrice(planId, local) {
  const plan = config.plans[planId];
  if (!plan) return null;
  return local ? plan.priceLocal : plan.priceIntl;
}

export function topUpPrice(packId, local) {
  const pack = config.topUps[packId];
  if (!pack) return null;
  return local ? pack.priceLocal : pack.priceIntl;
}

export default config;
