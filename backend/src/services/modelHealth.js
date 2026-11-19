import config from "../config.js";
import { MODELS as GROQ_MODELS } from "./groq.js";
import { MODELS as OPENROUTER_MODELS } from "./openrouter.js";
import { MODELS as OPENCODE_MODELS } from "./opencodezen.js";

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
