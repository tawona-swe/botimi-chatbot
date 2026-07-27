import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import { crawlWebsite } from "../services/crawler.js";
import { indexPages, getTrainingHealthScore } from "../services/rag.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// All bot routes require authentication
router.use(authenticate);

/**
 * GET /api/bots
 * List all bots for the current vendor.
 */
router.get("/", (req, res) => {
  const bots = db.prepare("SELECT * FROM bots WHERE vendor_id = ? ORDER BY created_at DESC").all(req.vendor.id);
  res.json({ bots });
});

/**
 * GET /api/bots/:id
 * Get a specific bot with training health score.
 */
router.get("/:id", (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const healthScore = getTrainingHealthScore(bot.id);
  const sourceCount = db.prepare("SELECT COUNT(*) as count FROM knowledge_sources WHERE bot_id = ?").get(bot.id);
  const chunkCount = db.prepare("SELECT COUNT(*) as count FROM knowledge_chunks WHERE bot_id = ?").get(bot.id);

  res.json({ bot: { ...bot, healthScore, sourceCount: sourceCount.count, chunkCount: chunkCount.count } });
});

/**
 * POST /api/bots
 * Create a new bot for the vendor.
 */
router.post("/", (req, res) => {
  const vendorPlan = req.vendor.subscription_plan;
  const existingBots = db.prepare("SELECT COUNT(*) as count FROM bots WHERE vendor_id = ?").get(req.vendor.id);
  const planLimits = { trial: 1, starter: 1, growth: 5, scale: -1 };
  const maxBots = planLimits[vendorPlan] || 1;
  if (maxBots !== -1 && existingBots.count >= maxBots) {
    return res.status(403).json({ error: "Bot limit reached for your plan. Upgrade to create more bots." });
  }

  const { name, websiteUrl } = req.body;
  const botId = uuidv4();
  db.prepare(`
    INSERT INTO bots (id, vendor_id, name, welcome_message, response_tone, model_provider, model_name)
    VALUES (?, ?, ?, 'Hello! I\'m your AI assistant. How can I help you today?', 'professional', 'groq', 'llama3-70b')
  `).run(botId, req.vendor.id, name || "New Bot");

  // Optionally start a crawl if URL provided
  if (websiteUrl) {
    const sourceId = uuidv4();
    db.prepare(`
      INSERT INTO knowledge_sources (id, bot_id, vendor_id, type, title, url, status)
      VALUES (?, ?, ?, 'website_crawl', ?, ?, 'processing')
    `).run(sourceId, botId, req.vendor.id, websiteUrl, websiteUrl);
    // Crawl in background (non-blocking)
    crawlWebsite(websiteUrl, { maxPages: 50 }).then(pages => {
      return indexPages(sourceId, botId, req.vendor.id, pages);
    }).then(() => {
      console.log(`[CreateBot] Crawl complete for bot ${botId}`);
    }).catch(err => {
      console.error(`[CreateBot] Crawl error for bot ${botId}:`, err.message);
      db.prepare("UPDATE knowledge_sources SET status = 'error', error_message = ? WHERE id = ?").run(err.message, sourceId);
    });
  }

  const bot = db.prepare("SELECT * FROM bots WHERE id = ?").get(botId);
  res.status(201).json({ bot });
});

/**
 * PATCH /api/bots/:id
 * Update bot settings.
 */
router.patch("/:id", (req, res) => {
  const bot = db.prepare("SELECT id FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const allowed = [
    "name", "description", "avatar_icon", "welcome_message", "response_tone",
    "model_provider", "model_name", "confidence_threshold", "widget_position",
    "widget_theme", "brand_color", "bot_greeting", "working_hours_start",
    "working_hours_end", "working_hours_enabled", "offline_message",
    "blacklist_topics", "quick_replies", "is_active",
  ];

  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(typeof req.body[field] === "object" ? JSON.stringify(req.body[field]) : req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE bots SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT * FROM bots WHERE id = ?").get(req.params.id);
  res.json({ bot: updated });
});

/**
 * POST /api/bots/:id/crawl
 * Start a website crawl for training.
 */
router.post("/:id/crawl", async (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  // Create knowledge source
  const sourceId = uuidv4();
  db.prepare(`
    INSERT INTO knowledge_sources (id, bot_id, vendor_id, type, title, url, status)
    VALUES (?, ?, ?, 'website_crawl', ?, ?, 'processing')
  `).run(sourceId, bot.id, req.vendor.id, url, url);

  // Respond immediately, crawl in background
  res.json({ message: "Crawl started", sourceId });

  try {
    const vendorConfig = db.prepare("SELECT subscription_plan FROM vendors WHERE id = ?").get(req.vendor.id);
    const planLimits = {
      trial: 10, starter: 50, growth: 500, scale: -1,
    };
    const maxPages = planLimits[vendorConfig?.subscription_plan] || 50;

    const pages = await crawlWebsite(url, { maxPages: maxPages === -1 ? 500 : maxPages });

    const chunkCount = await indexPages(sourceId, bot.id, req.vendor.id, pages);

    console.log(`[Crawl] Completed for ${url}: ${pages.length} pages, ${chunkCount} chunks`);
  } catch (err) {
    console.error("[Crawl] Error:", err);
    db.prepare("UPDATE knowledge_sources SET status = 'error', error_message = ? WHERE id = ?").run(err.message, sourceId);
  }
});

/**
 * GET /api/bots/:id/sources
 * List knowledge sources for a bot.
 */
router.get("/:id/sources", (req, res) => {
  const bot = db.prepare("SELECT id FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const sources = db.prepare("SELECT * FROM knowledge_sources WHERE bot_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ sources });
});

/**
 * DELETE /api/bots/:id/sources/:sourceId
 * Delete a knowledge source and its chunks.
 */
router.delete("/:id/sources/:sourceId", (req, res) => {
  const bot = db.prepare("SELECT id FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const source = db.prepare("SELECT id FROM knowledge_sources WHERE id = ? AND bot_id = ?").get(req.params.sourceId, req.params.id);
  if (!source) return res.status(404).json({ error: "Source not found" });

  db.prepare("DELETE FROM knowledge_chunks WHERE source_id = ?").run(req.params.sourceId);
  db.prepare("DELETE FROM knowledge_sources WHERE id = ?").run(req.params.sourceId);

  res.json({ message: "Source deleted" });
});

/**
 * POST /api/bots/:id/test
 * Test the bot with a sample question.
 */
router.post("/:id/test", async (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Question is required" });

  try {
    const { generateRagResponse } = await import("../services/rag.js");
    const result = await generateRagResponse(bot.id, question, []);
    res.json(result);
  } catch (err) {
    console.error("[Bot Test] Error:", err);
    res.status(500).json({ error: "Failed to test bot" });
  }
});

/**
 * GET /api/bots/:id/training
 * Training dashboard stats: health score, chunk/source counts, per-source details.
 */
router.get("/:id/training", (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const healthScore = getTrainingHealthScore(bot.id);
  const chunkCount = db.prepare("SELECT COUNT(*) as count FROM knowledge_chunks WHERE bot_id = ?").get(bot.id);
  const sourceCount = db.prepare("SELECT COUNT(*) as count FROM knowledge_sources WHERE bot_id = ?").get(bot.id);
  const indexedSources = db.prepare("SELECT COUNT(*) as count FROM knowledge_sources WHERE bot_id = ? AND status = 'indexed'").get(bot.id);
  const sources = db.prepare("SELECT * FROM knowledge_sources WHERE bot_id = ? ORDER BY created_at DESC").all(req.params.id);

  res.json({
    healthScore,
    totalChunks: chunkCount.count,
    totalSources: sourceCount.count,
    indexedSources: indexedSources.count,
    sources,
  });
});

/**
 * POST /api/bots/:id/upload
 * Upload a document (PDF, DOCX, TXT) to train the bot.
 * Uses multer for file handling, extracts text, and indexes it.
 */
import multer from "multer";
import { readFileSync } from "fs";
import { extname, resolve } from "path";

const uploadDir = resolve("data", "uploads");
import { existsSync, mkdirSync } from "fs";
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

router.post("/:id/upload", upload.single("file"), async (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const ext = extname(req.file.originalname).toLowerCase();

  // Extract text based on file type
  let text = "";
  try {
    if (ext === ".txt") {
      text = readFileSync(filePath, "utf-8");
    } else if (ext === ".pdf") {
      // Try pdf-parse if available, otherwise fall back to basic extraction
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfBuffer = readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        text = pdfData.text;
      } catch {
        text = `[PDF uploaded: ${req.file.originalname}]`;
      }
    } else if (ext === ".docx") {
      try {
        const mammoth = await import("mammoth");
        const docxBuffer = readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: docxBuffer });
        text = result.value;
      } catch {
        text = `[DOCX uploaded: ${req.file.originalname}]`;
      }
    } else {
      text = `[File uploaded: ${req.file.originalname}]`;
    }
  } catch (err) {
    console.error("[Upload] Text extraction error:", err);
    text = `[Uploaded file: ${req.file.originalname}]`;
  }

  // Truncate very long files
  if (text.length > 50000) {
    text = text.slice(0, 50000) + "\n... [truncated]";
  }

  // Create knowledge source
  const sourceId = uuidv4();
  db.prepare(`
    INSERT INTO knowledge_sources (id, bot_id, vendor_id, type, title, url, file_path, file_type, status)
    VALUES (?, ?, ?, 'document_upload', ?, '', ?, ?, 'indexed')
  `).run(sourceId, bot.id, req.vendor.id, req.file.originalname, filePath, ext);

  // Generate chunks and embed
  try {
    const { indexText } = await import("../services/rag.js");
    await indexText(sourceId, bot.id, req.vendor.id, text, req.file.originalname);
  } catch (err) {
    console.error("[Upload] Indexing error:", err);
    db.prepare("UPDATE knowledge_sources SET status = 'error', error_message = ? WHERE id = ?").run(err.message, sourceId);
  }

  res.json({ message: "File uploaded and indexed", sourceId, fileName: req.file.originalname });
});

/**
 * POST /api/bots/:id/recrawl/:sourceId
 * Recrawl an existing website source.
 */
router.post("/:id/recrawl/:sourceId", async (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const source = db.prepare("SELECT * FROM knowledge_sources WHERE id = ? AND bot_id = ?").get(req.params.sourceId, req.params.id);
  if (!source) return res.status(404).json({ error: "Source not found" });
  if (source.type !== "website_crawl") return res.status(400).json({ error: "Only website sources can be recrawled" });

  // Reset source status
  db.prepare("UPDATE knowledge_sources SET status = 'processing', error_message = '', updated_at = datetime('now') WHERE id = ?").run(source.id);
  // Delete old chunks
  db.prepare("DELETE FROM knowledge_chunks WHERE source_id = ?").run(source.id);

  res.json({ message: "Recrawl started", sourceId: source.id });

  try {
    const vendorConfig = db.prepare("SELECT subscription_plan FROM vendors WHERE id = ?").get(req.vendor.id);
    const planLimits = { trial: 10, starter: 50, growth: 500, scale: -1 };
    const maxPages = planLimits[vendorConfig?.subscription_plan] || 50;

    const { crawlWebsite } = await import("../services/crawler.js");
    const { indexPages } = await import("../services/rag.js");

    const pages = await crawlWebsite(source.url, { maxPages: maxPages === -1 ? 500 : maxPages });
    const chunkCount = await indexPages(source.id, bot.id, req.vendor.id, pages);

    console.log(`[Recrawl] Completed for ${source.url}: ${pages.length} pages, ${chunkCount} chunks`);
  } catch (err) {
    console.error("[Recrawl] Error:", err);
    db.prepare("UPDATE knowledge_sources SET status = 'error', error_message = ? WHERE id = ?").run(err.message, source.id);
  }
});

/**
 * GET /api/bots/:id/embed
 * Generate the embed code snippet for a bot.
 */
router.get("/:id/embed", (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  // Check if vendor is on Scale plan (white-label eligible)
  const hideBranding = req.vendor.subscription_plan === 'scale';

  const embedCode = `<!-- botimi Chat Widget -->
<script>
  window.botimiConfig = {
    apiKey: "${bot.id}",
    theme: "${bot.widget_theme || 'dark'}",
    position: "${bot.widget_position || 'bottom-right'}",
    color: "${bot.brand_color || '#c0c1ff'}",
    hideBranding: ${hideBranding}
  };
</script>
<script async src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/widget/loader.js"></script>
<!-- End botimi Chat Widget -->`;

  res.json({
    embedCode,
    botId: bot.id,
    theme: bot.widget_theme || "dark",
    position: bot.widget_position || "bottom-right",
  });
});

/**
 * POST /api/bots/:id/verify-install
 * Verify the widget snippet is installed on a website.
 * Checks for a botimi-specific meta tag or script presence.
 */
router.post("/:id/verify-install", async (req, res) => {
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND vendor_id = ?").get(req.params.id, req.vendor.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const { websiteUrl } = req.body;
  if (!websiteUrl) return res.status(400).json({ error: "Website URL is required" });

  let installed = false;
  try {
    // Try to fetch the page and check for botimiConfig
    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "botimi-Verifier/1.0" },
    });
    const html = await response.text();
    installed = html.includes("botimiConfig") || html.includes("botimi");
  } catch (err) {
    console.warn(`[Verify] Could not fetch ${websiteUrl}: ${err.message}`);
  }

  // Update the installation_detected field
  db.prepare("UPDATE bots SET installation_detected = ?, updated_at = datetime('now') WHERE id = ?").run(installed ? 1 : 0, req.params.id);

  res.json({ installed, botId: bot.id, websiteUrl });
});

export default router;
