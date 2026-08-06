import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import config from "./config.js";
import db, { migrate } from "./db/index.js";
import { apiLimiter } from "./middleware/rateLimit.js";

import {
  authRoutes,
  botRoutes,
  chatRoutes,
  conversationRoutes,
  analyticsRoutes,
  ticketRoutes,
  webhookRoutes,
  adminRoutes,
  widgetRoutes,
  assistantRoutes,
} from "./routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = dirname(resolve(config.db.path));
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Run database migration
migrate();

const app = express();

// --------------- Middleware ---------------
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.frontendUrl || "*",
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(morgan(config.isDev ? "dev" : "combined"));

// Raw body for webhooks (needs to be before JSON parser)
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

// JSON body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// General rate limiter
app.use("/api", apiLimiter);

// --------------- Routes ---------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: process.uptime(),
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Bot management
app.use("/api/bots", botRoutes);

// Chat (public widget endpoint)
app.use("/api/chat", chatRoutes);

// Conversations
app.use("/api/conversations", conversationRoutes);

// Analytics
app.use("/api/analytics", analyticsRoutes);

// Tickets
app.use("/api/tickets", ticketRoutes);

// Webhooks
app.use("/api/webhooks", webhookRoutes);

// Vendor profile
app.use("/api/vendor", (await import("./routes/vendor.js")).default);

// Super Admin
app.use("/api/admin", adminRoutes);

// Widget loader (public, no auth)
app.use("/api/widget", widgetRoutes);

// Dashboard guide (internal-only assistant, not a deployable bot)
app.use("/api/assistant", assistantRoutes);

// --------------- Keepalive Cron ---------------
// Periodic overage check every hour
const { checkOverageAlerts } = await import("./services/overage.js");
setInterval(() => {
  console.log("[Cron] Running overage check...");
  try {
    checkOverageAlerts();
  } catch (err) {
    console.error("[Cron] Overage check error:", err);
  }
}, 60 * 60 * 1000); // every hour

// Also run once after startup
setTimeout(() => {
  try {
    checkOverageAlerts();
  } catch (err) {
    console.error("[Cron] Initial overage check error:", err);
  }
}, 30_000); // 30 seconds after startup

// --------------- GDPR Data Cleanup ---------------
// Auto-delete conversation logs older than 90 days
setInterval(() => {
  console.log("[Cron] Running GDPR data cleanup...");
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    // Delete old messages
    const oldMessages = db.prepare(`
      DELETE FROM messages WHERE conversation_id IN
      (SELECT id FROM conversations WHERE created_at < ?)
    `).run(cutoff);
    // Delete old conversations
    const oldConvs = db.prepare("DELETE FROM conversations WHERE created_at < ?").run(cutoff);
    // Delete old usage events
    const oldEvents = db.prepare("DELETE FROM usage_events WHERE created_at < ?").run(cutoff);
    if (oldMessages.changes > 0 || oldConvs.changes > 0 || oldEvents.changes > 0) {
      console.log(`[GDPR] Cleaned up: ${oldMessages.changes} messages, ${oldConvs.changes} conversations, ${oldEvents.changes} usage events`);
    }
  } catch (err) {
    console.error("[Cron] GDPR cleanup error:", err);
  }
}, 24 * 60 * 60 * 1000); // daily

// Also run once shortly after startup
setTimeout(() => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE created_at < ?)").run(cutoff);
    db.prepare("DELETE FROM conversations WHERE created_at < ?").run(cutoff);
    db.prepare("DELETE FROM usage_events WHERE created_at < ?").run(cutoff);
    console.log("[GDPR] Initial cleanup complete");
  } catch (err) {
    console.error("[Cron] Initial GDPR cleanup error:", err);
  }
}, 60_000); // 1 minute after startup

// --------------- Error handler ---------------
app.use((err, req, res, _next) => {
  console.error("[Error]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(config.isDev ? { stack: err.stack } : {}),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// --------------- Start server ---------------
app.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   botimi API Server v1.0             ║
  ║   Port: ${config.port.toString().padEnd(28)} ║
  ║   Environment: ${config.nodeEnv.padEnd(24)} ║
  ║   Frontend: ${config.frontendUrl.padEnd(26)} ║
  ╚═══════════════════════════════════════╝
  `);
});

export default app;
