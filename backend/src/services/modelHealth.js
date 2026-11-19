import { v4 as uuidv4 } from "uuid";
import config from "../config.js";
import db from "../db/index.js";
import { MODELS as GROQ_MODELS } from "./groq.js";
import { MODELS as OPENROUTER_MODELS } from "./openrouter.js";
import { MODELS as OPENCODE_MODELS } from "./opencodezen.js";
import { getEmbedding } from "./modelRouter.js";
import { sendEmail } from "./email.js";

/**
 * Catalog drift detection for the free-model fallback cascade.
 *
 * Every provider here serves a free pool that rotates without notice, and
 * the failure is silent: a retired slug just starts erroring, the router
 * quietly falls through to the next candidate, and nothing surfaces until
 * someone probes by hand. That is not hypothetical — on 2026-11-19 a single
 * manual sweep found Groq's qwen3.6-27b replaced by qwen3.8-27b, four
 * OpenRouter slugs retired from the free tier to paid-only, and two
 * OpenCode Zen ids that never matched the served catalog at all.
 *
 * This compares the configured model ids against each provider's own live
 * catalog endpoint. That costs one cheap list call per provider rather than
 * an inference call per model, so it burns effectively none of the free
 * quota it exists to protect.
 *
 * Gemini is deliberately not checked: its two entries are "-latest" aliases
 * that Google repoints at current models precisely so they don't go stale.
 */

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return res.json();
}

async function liveGroqIds() {
  const data = await fetchJson("https://api.groq.com/openai/v1/models", {
    Authorization: `Bearer ${config.groq.apiKey}`,
  });
  return (data.data || []).map((m) => m.id);
}

async function liveOpenRouterIds() {
  // Public endpoint — no key needed. Only the ":free" ids matter here; a
  // configured id that now exists ONLY without that suffix means it was
  // moved to paid, which for our purposes is just as dead as deleted.
  const data = await fetchJson("https://openrouter.ai/api/v1/models");
  return (data.data || []).map((m) => m.id);
}

async function liveOpenCodeIds() {
  const data = await fetchJson("https://opencode.ai/zen/v1/models", {
    Authorization: `Bearer ${config.opencodeZen.apiKey}`,
  });
  return (data.data || []).map((m) => m.id);
}

const PROVIDERS = [
  { name: "groq", models: GROQ_MODELS, fetchIds: liveGroqIds, isConfigured: () => !!config.groq.apiKey },
  { name: "openrouter", models: OPENROUTER_MODELS, fetchIds: liveOpenRouterIds, isConfigured: () => !!config.openrouter.apiKey },
  { name: "opencodezen", models: OPENCODE_MODELS, fetchIds: liveOpenCodeIds, isConfigured: () => !!config.opencodeZen.apiKey },
];

/**
 * @returns {Promise<{checked: number, missing: Array, errors: Array}>}
 */
export async function checkCatalogDrift() {
  const missing = [];
  const errors = [];
  let checked = 0;

  for (const provider of PROVIDERS) {
    if (!provider.isConfigured()) continue;
    let liveIds;
    try {
      liveIds = await provider.fetchIds();
    } catch (err) {
      errors.push({ provider: provider.name, error: String(err.message).slice(0, 200) });
      continue;
    }

    for (const [modelKey, { modelId }] of Object.entries(provider.models)) {
      checked++;
      // OpenRouter's "auto" is a routing pseudo-model, not a catalog entry.
      if (provider.name === "openrouter" && modelKey === "auto") continue;
      if (!liveIds.includes(modelId)) {
        missing.push({ provider: provider.name, modelKey, modelId });
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      `[ModelHealth] ${missing.length} configured model(s) are NO LONGER in their provider's live catalog — ` +
      `these will always fail and should be removed or re-slugged:\n` +
      missing.map((m) => `  - ${m.provider}/${m.modelKey} (${m.modelId})`).join("\n")
    );
  } else if (errors.length === 0) {
    console.log(`[ModelHealth] All ${checked} configured free models present in their live catalogs.`);
  }

  for (const e of errors) {
    console.warn(`[ModelHealth] Could not check ${e.provider}: ${e.error}`);
  }

  return { checked, missing, errors };
}

/**
 * Catches the storage-side counterpart of catalog drift: knowledge chunks
 * whose stored vector can't be compared against what the embedding provider
 * produces today — either because it was never real (null) or because its
 * dimension no longer matches. Both make that content silently unreachable
 * by semantic search, which is how 86% of one production bot's knowledge
 * base went missing without a single error being raised.
 */
export async function checkEmbeddingHealth() {
  const probe = await getEmbedding("dimension probe", "RETRIEVAL_DOCUMENT");
  if (!probe.isReal || !probe.vector?.length) {
    console.warn("[ModelHealth] Embedding provider unavailable — cannot check embedding health.");
    return { ok: false, reason: "provider_unavailable", expectedDim: null, total: 0, unusable: 0, byBot: [] };
  }
  const expectedDim = probe.vector.length;

  const total = db.prepare("SELECT COUNT(*) AS n FROM knowledge_chunks").get().n;
  const unusable = db.prepare(`
    SELECT COUNT(*) AS n FROM knowledge_chunks
    WHERE embedding IS NULL OR embedding = '' OR json_array_length(embedding) != ?
  `).get(expectedDim).n;

  const byBot = db.prepare(`
    SELECT b.name AS botName, k.bot_id AS botId, COUNT(*) AS n
    FROM knowledge_chunks k LEFT JOIN bots b ON b.id = k.bot_id
    WHERE k.embedding IS NULL OR k.embedding = '' OR json_array_length(k.embedding) != ?
    GROUP BY k.bot_id ORDER BY n DESC
  `).all(expectedDim);

  if (unusable > 0) {
    console.error(
      `[ModelHealth] ${unusable}/${total} knowledge chunks have no usable ${expectedDim}-dim embedding ` +
      `and cannot be found by semantic search. Affected bots:\n` +
      byBot.map((b) => `  - ${b.botName || b.botId} : ${b.n}`).join("\n")
    );
  } else {
    console.log(`[ModelHealth] All ${total} knowledge chunks carry a usable ${expectedDim}-dim embedding.`);
  }

  return { ok: unusable === 0, expectedDim, total, unusable, byBot };
}

// Long enough that a daily check doesn't nag every morning, short enough
// that an unfixed problem resurfaces. Mirrors the renewal-reminder pattern.
const ALERT_INTERVAL_DAYS = 3;

function alertedRecently(vendorId, eventType) {
  return !!db.prepare(`
    SELECT id FROM usage_events
    WHERE vendor_id = ? AND event_type = ? AND created_at >= datetime('now', ?)
  `).get(vendorId, eventType, `-${ALERT_INTERVAL_DAYS} days`);
}

/**
 * Runs both checks and emails the platform owner when something is wrong.
 *
 * Logging alone was not enough: the catalog check caught a genuinely broken
 * production key within minutes of shipping, but only because someone
 * happened to be reading docker logs at the time. Anything that needs a
 * human has to reach one.
 */
export async function runModelHealthChecks() {
  const [drift, embeddings] = await Promise.all([
    checkCatalogDrift().catch((err) => ({ error: String(err?.message || err) })),
    checkEmbeddingHealth().catch((err) => ({ error: String(err?.message || err) })),
  ]);

  const problems = [];
  if (drift?.missing?.length) {
    problems.push(
      `<p><strong>${drift.missing.length} configured model(s) are no longer in their provider's catalog.</strong> ` +
      `These always fail and should be removed or re-slugged:</p><ul>` +
      drift.missing.map((m) => `<li><code>${m.provider}/${m.modelKey}</code> → <code>${m.modelId}</code></li>`).join("") +
      `</ul>`
    );
  }
  if (embeddings?.unusable > 0) {
    problems.push(
      `<p><strong>${embeddings.unusable} of ${embeddings.total} knowledge chunks have no usable ` +
      `${embeddings.expectedDim}-dim embedding</strong> and cannot be found by semantic search. ` +
      `The backfill job repairs these automatically, so this should shrink daily — investigate if it does not.</p><ul>` +
      embeddings.byBot.map((b) => `<li>${b.botName || b.botId}: ${b.n} chunk(s)</li>`).join("") +
      `</ul>`
    );
  }

  if (problems.length === 0) return { alerted: false, drift, embeddings };

  // Platform-level alert, so it goes to the superadmin account rather than
  // any particular customer. usage_events needs a real vendor_id anyway.
  const owner = db.prepare("SELECT id, email FROM vendors WHERE is_superadmin = 1 ORDER BY created_at LIMIT 1").get();
  if (!owner?.email) {
    console.warn("[ModelHealth] Problems found but no superadmin vendor to alert.");
    return { alerted: false, drift, embeddings };
  }
  if (alertedRecently(owner.id, "model_health_alert")) {
    return { alerted: false, deduped: true, drift, embeddings };
  }

  try {
    await sendEmail({
      to: owner.email,
      subject: "botimi: model health check found problems",
      html: `<h2>Model health check</h2>${problems.join("")}<p style="color:#666;font-size:12px">Automated daily check from the botimi backend.</p>`,
    });
    db.prepare("INSERT INTO usage_events (id, vendor_id, event_type, metadata) VALUES (?, ?, 'model_health_alert', ?)")
      .run(uuidv4(), owner.id, JSON.stringify({
        sentAt: new Date().toISOString(),
        missingModels: drift?.missing?.length ?? 0,
        unusableChunks: embeddings?.unusable ?? 0,
      }));
    console.log(`[ModelHealth] Alert emailed to ${owner.email}.`);
    return { alerted: true, drift, embeddings };
  } catch (err) {
    console.error("[ModelHealth] Failed to send alert email:", err?.message);
    return { alerted: false, error: err?.message, drift, embeddings };
  }
}
