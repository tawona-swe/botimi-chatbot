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

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    prices: {
      starter: process.env.STRIPE_STARTER_PRICE_ID || "",
      growth: process.env.STRIPE_GROWTH_PRICE_ID || "",
      scale: process.env.STRIPE_SCALE_PRICE_ID || "",
    },
  },

  email: {
    apiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "noreply@botimi.ai",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

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

  plans: {
    starter: {
      name: "Starter",
      price: 29,
      chatbots: 1,
      websites: 1,
      conversationsPerMonth: 500,
      crawlerPages: 50,
      documentUploads: 1,
      whiteLabel: false,
      support: "email",
    },
    growth: {
      name: "Growth",
      price: 79,
      chatbots: 5,
      websites: 5,
      conversationsPerMonth: 3000,
      crawlerPages: 500,
      documentUploads: -1, // unlimited
      whiteLabel: false,
      support: "priority_email",
    },
    scale: {
      name: "Scale",
      price: 199,
      chatbots: -1,
      websites: -1,
      conversationsPerMonth: 15000,
      crawlerPages: -1,
      documentUploads: -1,
      whiteLabel: true,
      support: "dedicated_slack",
    },
  },
};

export default config;
