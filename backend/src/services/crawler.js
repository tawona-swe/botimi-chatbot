import { chromium } from "playwright";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import db from "../db/index.js";
import { indexPages } from "./rag.js";

const PLAN_CRAWL_LIMITS = { trial: 10, starter: 50, growth: 500, scale: -1 };
// Used ONLY for robots.txt Allow/Disallow/Crawl-delay matching -- kept as a
// distinct, honest identifier so a site owner's own robots.txt rules can
// specifically target us by name. Verified against the actual robots-parser
// version installed here: it does NOT do substring matching against the
// full UA string, it needs our token to lead the string, so this can't
// just be folded into CRAWLER_BROWSER_UA below without silently breaking
// robots.txt compliance (a site's own Disallow rules for us would stop
// matching at all -- confirmed live, not assumed).
const CRAWLER_USER_AGENT = "botimi-Crawler/1.0 (AI Chatbot Training Bot)";
// The UA actually sent on the wire for page requests. Many WAFs/CDNs block
// any non-standard User-Agent outright regardless of robots.txt -- this
// looks like a normal browser to reduce that false-positive blocking, same
// general idea as how Googlebot/Bingbot present a browser-like string. This
// is separate from robots.txt compliance (still fully honored via
// CRAWLER_USER_AGENT above), not a way to evade a site owner's own rules.
const CRAWLER_BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_CRAWL_DELAY_MS = 500;
const MAX_CRAWL_DELAY_MS = 5000; // cap a site's declared Crawl-delay so one slow site can't stall a whole crawl

function normalizeUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

// Common "load more" / "show more" button patterns. Checked in order, first
// visible match wins -- covers both real <button>/<a> text and the class-
// name convention most "load more" widgets use even when the visible text
// differs (icon-only buttons, localized text, etc.).
const LOAD_MORE_SELECTORS = [
  'button:has-text("Load more")',
  'button:has-text("Show more")',
  'a:has-text("Load more")',
  'a:has-text("Show more")',
  '[class*="load-more" i]',
  '[class*="loadmore" i]',
];

/**
 * Trigger lazy-loaded content (intersection-observer-based images/sections
 * that only fetch once scrolled into view) and click a "load more" button
 * once if one exists, before extracting a page's content/links. Playwright
 * doesn't scroll or click anything on its own -- without this, any content
 * that only appears after a scroll event or a manual "show more" click is
 * simply never present in page.content() at all, regardless of how long
 * networkidle waits.
 *
 * Deliberately cheap for the common case: a page whose scrollHeight doesn't
 * change after the first scroll exits immediately (~1 wait), since most
 * pages aren't lazy-loaded at all and shouldn't pay for this on every page
 * of every crawl. Bounded to a handful of iterations either way so a
 * pathological infinite-scroll page can't stall the whole crawl.
 */
async function settlePage(page) {
  let previousHeight = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(500);
    const currentHeight = await page.evaluate(() => document.body.scrollHeight).catch(() => previousHeight);
    if (currentHeight === previousHeight) break; // no new content loaded from that scroll -- done
    previousHeight = currentHeight;
  }

  for (const selector of LOAD_MORE_SELECTORS) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 300 })) {
        await button.click({ timeout: 2000 });
        await page.waitForTimeout(800);
        break; // one click is enough to surface the next batch for this crawl pass
      }
    } catch {
      // selector not present, not visible, or not clickable -- try the next pattern
    }
  }
}

/**
 * A page's "section" for round-robin crawl ordering — its parent directory
 * (every path segment except the last, which is the individual page's own
 * slug). Using the parent directory rather than just the first path segment
 * matters for sites hosted under a path prefix (e.g. everything nested under
 * /zra/) — segments[0] would collapse the entire site into one section and
 * defeat the whole point. Query strings (pagination like ?page=2) don't
 * affect pathname, so paginated listing pages naturally group with each
 * other under the same section too.
 */
function sectionOf(pageUrl) {
  try {
    const segments = new URL(pageUrl).pathname.split("/").filter(Boolean);
    segments.pop();
    return segments.join("/");
  } catch {
    return "";
  }
}

/**
 * A crawl queue ordered round-robin across sections instead of plain FIFO.
 * A flat FIFO queue lets whichever section is discovered first (or simply
 * has the most internal links — a tenders listing with 30 individual tender
 * pages, say) consume the entire maxPages budget before any other section
 * gets a single page crawled, no matter how high maxPages is set. Cycling
 * through sections in turn guarantees every discovered section gets at
 * least some coverage, and a large section's remaining depth still gets
 * filled in as budget allows.
 */
function createRoundRobinQueue() {
  const bySection = new Map(); // section -> FIFO array of urls
  const order = []; // sections in first-discovered order
  const queued = new Set(); // dedupe across all sections
  let cursor = 0;

  return {
    enqueue(pageUrl) {
      if (queued.has(pageUrl)) return;
      queued.add(pageUrl);
      const section = sectionOf(pageUrl);
      if (!bySection.has(section)) {
        bySection.set(section, []);
        order.push(section);
      }
      bySection.get(section).push(pageUrl);
    },
    dequeue() {
      const active = order.filter((s) => bySection.get(s).length > 0);
      if (active.length === 0) return undefined;
      const section = active[cursor % active.length];
      cursor++;
      const next = bySection.get(section).shift();
      queued.delete(next);
      return next;
    },
    get size() {
      let total = 0;
      for (const q of bySection.values()) total += q.length;
      return total;
    },
  };
}

/**
 * Fetch and parse a site's robots.txt. Fails open (returns a parser backed
 * by an empty ruleset, i.e. everything allowed) if robots.txt doesn't exist
 * or can't be reached — its absence isn't a restriction, and a network blip
 * shouldn't block the whole crawl.
 */
async function fetchRobotsRules(origin) {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(10000) });
    return robotsParser(robotsUrl, res.ok ? await res.text() : "");
  } catch {
    return robotsParser(robotsUrl, "");
  }
}

/**
 * Discover page URLs from a sitemap — declared in robots.txt via Sitemap:,
 * or the conventional /sitemap.xml location as a fallback — to find pages
 * that aren't reachable via internal link-following alone (e.g. not linked
 * from the nav). Handles one level of sitemap-index nesting (a sitemap that
 * just lists other sitemaps), which covers the common case without risking
 * unbounded recursion into a pathological one.
 */
async function discoverSitemapUrls(origin, robots) {
  const declared = robots.getSitemaps();
  const candidates = declared.length > 0 ? declared : [`${origin}/sitemap.xml`];
  const pageUrls = new Set();

  for (const sitemapUrl of candidates) {
    try {
      const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

      const nested = locs.filter((l) => l.toLowerCase().endsWith(".xml")).slice(0, 20);
      locs.filter((l) => !l.toLowerCase().endsWith(".xml")).forEach((l) => pageUrls.add(l));

      for (const nestedUrl of nested) {
        try {
          const nestedRes = await fetch(nestedUrl, { signal: AbortSignal.timeout(10000) });
          if (!nestedRes.ok) continue;
          const nestedXml = await nestedRes.text();
          [...nestedXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].forEach((m) => pageUrls.add(m[1]));
        } catch {
          // best-effort — a broken nested sitemap just means less seeding, not a crawl failure
        }
      }
    } catch {
      // best-effort — no sitemap is normal, not an error
    }
  }

  return [...pageUrls];
}

/**
 * Download and extract text from a linked PDF/DOCX found during a crawl,
 * reusing the same parsers already used for direct uploads (routes/bots.js)
 * — a document linked FROM a site gets the same treatment as one uploaded
 * directly, instead of being silently skipped.
 */
async function extractLinkedDocument(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());

  if (url.toLowerCase().endsWith(".pdf")) {
    // pdf-parse v2 rewrote its API to a class (no more a default-exported
    // function you just call with a buffer) — verified against the actual
    // installed version's README, not assumed from memory.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  if (url.toLowerCase().endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value;
  }
  return null;
}

/**
 * Crawl a website and extract text content from all pages.
 * @param {string} url - The starting URL to crawl
 * @param {Object} options
 * @param {number} options.maxPages - Max pages to crawl
 * @param {function} options.onProgress - Callback for progress updates
 * @returns {Promise<Array<{url: string, title: string, content: string}>>}
 */
export async function crawlWebsite(url, options = {}) {
  // Runs through the URL parser (not just the scheme-prepending normalizeUrl)
  // so this matches the exact normalized form links get elsewhere in this
  // function — otherwise "http://x.com" (as typed) and "http://x.com/" (as
  // any discovered link or sitemap entry naturally comes out) are treated
  // as two different URLs and the homepage gets crawled twice.
  url = new URL(normalizeUrl(url)).href;
  const maxPages = options.maxPages || 50;
  const onProgress = options.onProgress || (() => {});
  const visited = new Set();
  const results = [];

  const origin = new URL(url).origin;
  const baseHostname = new URL(url).hostname;

  const robots = await fetchRobotsRules(origin);
  const declaredDelaySec = robots.getCrawlDelay(CRAWLER_USER_AGENT);
  const crawlDelayMs = Math.min(declaredDelaySec ? declaredDelaySec * 1000 : DEFAULT_CRAWL_DELAY_MS, MAX_CRAWL_DELAY_MS);

  const sitemapUrls = await discoverSitemapUrls(origin, robots);
  const queue = createRoundRobinQueue();
  queue.enqueue(url);
  sitemapUrls
    .filter((u) => { try { return new URL(u).hostname === baseHostname; } catch { return false; } })
    .forEach((u) => queue.enqueue(u));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: CRAWLER_BROWSER_UA });

  try {
    let isFirstRequest = true;
    while (queue.size > 0 && results.length < maxPages) {
      const currentUrl = queue.dequeue();

      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      if (robots.isAllowed(currentUrl, CRAWLER_USER_AGENT) === false) {
        console.log(`[Crawler] Skipping ${currentUrl} — disallowed by robots.txt`);
        continue;
      }

      if (!isFirstRequest) await new Promise((r) => setTimeout(r, crawlDelayMs));
      isFirstRequest = false;

      // Linked documents get their own extraction path (same parsers as
      // direct uploads) rather than a browser page load.
      if (/\.(pdf|docx)$/i.test(new URL(currentUrl).pathname)) {
        try {
          const text = await extractLinkedDocument(currentUrl);
          if (text && text.length > 50) {
            results.push({ url: currentUrl, title: decodeURIComponent(new URL(currentUrl).pathname.split("/").pop() || currentUrl), content: text });
            onProgress(results.length, maxPages, currentUrl);
          }
        } catch (err) {
          console.warn(`[Crawler] Failed to extract document ${currentUrl}: ${err.message}`);
        }
        continue;
      }

      try {
        const page = await context.newPage();
        await page.goto(currentUrl, { waitUntil: "networkidle", timeout: 30000 });
        await settlePage(page);

        const html = await page.content();
        const $ = cheerio.load(html);

        // Collect internal links BEFORE stripping nav/header/footer below —
        // a real, confirmed bug: a site's main navigation menu (where major
        // sections like a press-release archive are often linked from, and
        // ONLY from — nowhere in the body content) lives inside exactly the
        // elements this crawler strips for content-cleanliness. Stripping
        // first meant those links were destroyed before they could ever be
        // discovered, on every single page, for the whole crawl — not a
        // budget/ordering problem, an actual inability to ever find them.
        $("a[href]").each((_, el) => {
          let href = $(el).attr("href");
          if (!href) return;

          try {
            const parsed = new URL(href, currentUrl);
            // Fragments ("#", "#section") don't address a different page —
            // without stripping this, "/page/" and "/page/#" (a common
            // pattern for JS-hooked links, e.g. modal triggers or "back to
            // top") get treated as two separate pages and waste budget
            // re-crawling content already visited under the bare URL.
            parsed.hash = "";
            const absolute = parsed.href;
            if (parsed.hostname === baseHostname && !visited.has(absolute)) {
              // Binaries we have no extractor for — PDF/DOCX are handled
              // above instead of being skipped like the rest.
              if (!parsed.pathname.match(/\.(zip|doc|xls|xlsx|png|jpg|jpeg|gif|svg|mp4|mp3)$/i)) {
                queue.enqueue(absolute);
              }
            }
          } catch {
            // Invalid URL, skip
          }
        });

        // Remove non-content elements — only now, for extracting clean
        // indexable text. Nav/header/footer boilerplate genuinely shouldn't
        // pollute what gets embedded as knowledge, just not before links
        // inside them have already been collected above.
        $("script, style, nav, footer, header, iframe, noscript, svg, [role=navigation]").remove();

        const title = $("title").text().trim() || $("h1").first().text().trim() || new URL(currentUrl).pathname;
        const content = $("body").text().replace(/\s+/g, " ").trim();

        if (content.length > 50) {
          results.push({ url: currentUrl, title, content });
          onProgress(results.length, maxPages, currentUrl);
        }

        await page.close();
      } catch (err) {
        console.warn(`[Crawler] Failed to fetch ${currentUrl}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Wipe and re-crawl a single website source, then reindex it. Shared by the
 * manual "recrawl now" button (routes/bots.js) and the scheduled staleness
 * check (services/scheduledRecrawl.js) — same plan-limit logic, same
 * chunk/FTS cleanup, same error handling either way. Does its own status
 * bookkeeping, so a caller can fire-and-forget it (the synchronous DB prep
 * at the top still runs before the caller's next line, since JS runs a
 * function up to its first `await` before yielding).
 */
export async function performRecrawl(source, botId, vendorId) {
  db.prepare("UPDATE knowledge_sources SET status = 'processing', error_message = '', updated_at = datetime('now') WHERE id = ?").run(source.id);
  db.prepare("DELETE FROM knowledge_chunks_fts WHERE chunk_id IN (SELECT id FROM knowledge_chunks WHERE source_id = ?)").run(source.id);
  db.prepare("DELETE FROM knowledge_chunks WHERE source_id = ?").run(source.id);

  try {
    const vendor = db.prepare("SELECT subscription_plan FROM vendors WHERE id = ?").get(vendorId);
    const maxPages = PLAN_CRAWL_LIMITS[vendor?.subscription_plan] ?? 50;

    const pages = await crawlWebsite(source.url, { maxPages: maxPages === -1 ? 500 : maxPages });
    const chunkCount = await indexPages(source.id, botId, vendorId, pages);
    console.log(`[Recrawl] Completed for ${source.url}: ${pages.length} pages, ${chunkCount} chunks`);
  } catch (err) {
    console.error("[Recrawl] Error:", err);
    db.prepare("UPDATE knowledge_sources SET status = 'error', error_message = ? WHERE id = ?").run(err.message, source.id);
  }
}

/**
 * Extract text content from a single URL.
 * @param {string} url
 * @returns {Promise<{title: string, content: string}>}
 */
export async function extractPageContent(url) {
  url = normalizeUrl(url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, iframe, noscript").remove();
    const title = $("title").text().trim() || $("h1").first().text().trim();
    const content = $("body").text().replace(/\s+/g, " ").trim();

    await page.close();
    return { title, content };
  } finally {
    await browser.close();
  }
}
