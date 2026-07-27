import { chromium } from "playwright";
import * as cheerio from "cheerio";

/**
 * Crawl a website and extract text content from all pages.
 * @param {string} url - The starting URL to crawl
 * @param {Object} options
 * @param {number} options.maxPages - Max pages to crawl
 * @param {function} options.onProgress - Callback for progress updates
 * @returns {Promise<Array<{url: string, title: string, content: string}>>}
 */
export async function crawlWebsite(url, options = {}) {
  const maxPages = options.maxPages || 50;
  const onProgress = options.onProgress || (() => {});
  const visited = new Set();
  const queue = [url];
  const results = [];

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  const baseHostname = new URL(url).hostname;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "botimi-Crawler/1.0 (AI Chatbot Training Bot)",
  });

  try {
    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift();

      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const page = await context.newPage();
        await page.goto(currentUrl, { waitUntil: "networkidle", timeout: 30000 });

        const html = await page.content();
        const $ = cheerio.load(html);

        // Remove non-content elements
        $("script, style, nav, footer, header, iframe, noscript, svg, [role=navigation]").remove();

        const title = $("title").text().trim() || $("h1").first().text().trim() || new URL(currentUrl).pathname;
        const content = $("body").text().replace(/\s+/g, " ").trim();

        if (content.length > 50) {
          results.push({ url: currentUrl, title, content });
          onProgress(results.length, maxPages, currentUrl);
        }

        // Collect internal links
        $("a[href]").each((_, el) => {
          let href = $(el).attr("href");
          if (!href) return;

          try {
            const absolute = new URL(href, currentUrl).href;
            const parsed = new URL(absolute);
            if (parsed.hostname === baseHostname && !visited.has(absolute) && !queue.includes(absolute)) {
              // Skip anchors, downloads, mailto, etc
              if (!parsed.pathname.match(/\.(pdf|zip|doc|docx|xls|xlsx|png|jpg|jpeg|gif|svg|mp4|mp3)$/i)) {
                queue.push(absolute);
              }
            }
          } catch {
            // Invalid URL, skip
          }
        });

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
 * Extract text content from a single URL.
 * @param {string} url
 * @returns {Promise<{title: string, content: string}>}
 */
export async function extractPageContent(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

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
