import db from "../db/index.js";
import { performRecrawl } from "./crawler.js";

const STALE_AFTER_DAYS = 7;
const MAX_PER_RUN = 5; // bounds each cron tick's duration — Playwright launches are heavy, run them one at a time

/**
 * Periodically re-crawl website sources so a bot's knowledge doesn't
 * silently go stale after a customer's own site changes. Only touches
 * sources that finished successfully before (status = 'indexed') — one
 * stuck in 'error' needs a human to look at why, not an automatic retry
 * loop hammering a broken URL forever.
 */
export async function runScheduledRecrawls() {
  const staleSources = db.prepare(`
    SELECT * FROM knowledge_sources
    WHERE type = 'website_crawl' AND status = 'indexed'
      AND updated_at <= datetime('now', ?)
    ORDER BY updated_at ASC
    LIMIT ?
  `).all(`-${STALE_AFTER_DAYS} days`, MAX_PER_RUN);

  for (const source of staleSources) {
    console.log(`[ScheduledRecrawl] Re-crawling stale source ${source.id}: ${source.url}`);
    try {
      await performRecrawl(source, source.bot_id, source.vendor_id);
    } catch (err) {
      console.error(`[ScheduledRecrawl] Failed for source ${source.id}:`, err.message);
    }
  }
}
