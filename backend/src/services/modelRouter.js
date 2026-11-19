import * as groq from "./groq.js";
import * as gemini from "./gemini.js";
import * as openrouter from "./openrouter.js";
import * as opencodezen from "./opencodezen.js";
import * as localEmbedding from "./localEmbedding.js";
import config from "../config.js";

/**
 * Model routing logic per botimi spec §6.3.
 *
 * Default: GPT-OSS 120B (Groq) for best quality.
 * Vendor can override provider + model in bot settings (model_provider,
 * model_name). If the chosen provider/model isn't configured, or the call
 * fails for any reason (including a free-tier rate limit), this cascades
 * through every other free model from every configured provider — Groq's
 * other models, then OpenRouter's and OpenCode Zen's whole free catalogs,
 * then Gemini — stopping at the first one that succeeds. Every provider
 * here is a genuinely free tier (see each service file for its model
 * list); this cascade exists so hitting one provider's free-tier ceiling
 * degrades to a different free model instead of costing money or failing
 * the chat. All model switches are invisible to the end user.
 *
 * Model IDs updated 2026-07-08 per Groq deprecation schedule.
 * llama3-70b-8192/llama3-8b-8192 deprecated Aug 2025.
 * llama-3.3-70b-versatile/llama-3.1-8b-instant shut down Aug 16, 2026.
 */

const GROQ_PROVIDER = "groq";
const GEMINI_PROVIDER = "gemini";
const OPENROUTER_PROVIDER = "openrouter";
const OPENCODE_ZEN_PROVIDER = "opencodezen";

const SERVICES = {
  [GROQ_PROVIDER]: groq,
  [GEMINI_PROVIDER]: gemini,
  [OPENROUTER_PROVIDER]: openrouter,
  [OPENCODE_ZEN_PROVIDER]: opencodezen,
};

const DEFAULT_MODEL_BY_PROVIDER = {
  [GROQ_PROVIDER]: "llama3-70b",
  [GEMINI_PROVIDER]: "gemini-flash",
  [OPENROUTER_PROVIDER]: "auto",
  [OPENCODE_ZEN_PROVIDER]: "deepseek-v4.1-flash",
};

// Every (provider, model) pair worth falling back through, in the order
// to try them — Groq's own other models first (same provider, so a
// transient blip there is cheapest to retry), then each shared free pool
// in full, then Gemini last (also used for embeddings, so kept as the
// final safety net rather than burned early on chat traffic). Built from
// each service's own MODELS map rather than hand-duplicated here, so a
// model added to e.g. opencodezen.js automatically joins the cascade.
const FALLBACK_ORDER = [
  [GROQ_PROVIDER, groq.MODELS],
  [OPENROUTER_PROVIDER, openrouter.MODELS],
  [OPENCODE_ZEN_PROVIDER, opencodezen.MODELS],
  [GEMINI_PROVIDER, gemini.MODELS],
].flatMap(([provider, models]) => Object.keys(models).map((modelKey) => ({ provider, modelKey })));

// First attempt gets the full per-provider timeout; every cascade attempt
// after that uses a shorter one, so a total-outage worst case (every free
// pool down at once) still resolves in well under a minute instead of
// potentially minutes of serial 20s timeouts.
const FALLBACK_TIMEOUT_MS = 8000;

// How long a candidate stays benched after each class of failure. Without
// this, a rate-limited provider is rediscovered as dead on every single
// request — e.g. an exhausted OpenCode Zen free quota meant 12 consecutive
// doomed round trips per message, since nothing remembered the previous
// 429. A dead/renamed slug gets a much longer bench because it will not
// recover on its own: it needs the model list updating (see
// services/modelHealth.js, which detects exactly that).
const COOLDOWN_MS = {
  quota: 10 * 60 * 1000, // 429 — free-tier cap, recovers on its own
  gone: 6 * 60 * 60 * 1000, // 404/400 — slug retired or renamed, needs a human
  auth: 30 * 60 * 1000, // 401/403 — bad/expired key, needs a human but cheap to recheck
  transient: 60 * 1000, // 5xx, timeouts, network — usually self-heals fast
};

// candidateKey -> { until: epochMs, kind, detail }. Deliberately in-process
// and unpersisted: it is a latency optimisation, not state worth surviving
// a restart, and a fresh process re-learning the picture costs one request.
const cooldowns = new Map();

function candidateKey(provider, modelKey) {
  return `${provider}/${modelKey}`;
}

/**
 * Bucket a provider error so it can be benched for an appropriate time.
 * Providers attach `status`/`retryAfter` to their thrown errors; the string
 * checks are only a backstop for transport-level failures that never got a
 * HTTP status at all.
 */
function classifyFailure(err) {
  const status = err?.status;
  const msg = String(err?.message || "").toLowerCase();
  const blamesTheModel = msg.includes("model") || msg.includes("does not exist") || msg.includes("unavailable");

  if (status === 429) return "quota";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "gone";
  // A 400 is ambiguous: OpenCode Zen returns one for a dead slug, but a
  // malformed request returns one too — and that failure mode is real here
  // (passing role='bot' straight through used to make Groq 400 on every
  // multi-turn chat). Benching 6h on the latter would take the whole
  // cascade down for hours over a caller-side bug, so only blame the model
  // when the message actually does.
  if (status === 400) return blamesTheModel ? "gone" : "transient";
  if (status >= 500) return "transient";

  if (msg.includes("rate limit") || msg.includes("usage limit") || msg.includes("quota")) return "quota";
  if (msg.includes("does not exist") || msg.includes("unavailable")) return "gone";
  return "transient";
}

// A provider's own Retry-After wins when it is longer than our default
// (OpenCode Zen really does report ~16h until its free quota resets), but
// it is clamped so a malformed or absurd value can't bench a working
// candidate indefinitely. Note Retry-After may legally be an HTTP-date
// rather than seconds; the providers normalise that to null, so it lands
// on the default rather than NaN.
const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function benchCandidate(provider, modelKey, err) {
  const kind = classifyFailure(err);
  const retryAfterMs = Number.isFinite(err?.retryAfter) ? err.retryAfter * 1000 : 0;
  const until = Date.now() + Math.min(Math.max(COOLDOWN_MS[kind], retryAfterMs), MAX_COOLDOWN_MS);
  cooldowns.set(candidateKey(provider, modelKey), { kind, until, detail: String(err?.message || "").slice(0, 200) });

  // A retired slug is a config problem that will never fix itself, so say so
  // loudly rather than letting it decay into a silent per-request tax.
  if (kind === "gone") {
    console.error(`[Router] ${candidateKey(provider, modelKey)} looks retired/renamed — benched ${COOLDOWN_MS.gone / 3600000}h. Run checkCatalogDrift(). Detail: ${err?.message?.slice(0, 200)}`);
  }
}

function isBenched(provider, modelKey) {
  const entry = cooldowns.get(candidateKey(provider, modelKey));
  if (!entry) return false;
  if (Date.now() >= entry.until) {
    cooldowns.delete(candidateKey(provider, modelKey));
    return false;
  }
  return true;
}

/** Current bench state, for the health endpoint / debugging. */
export function getCooldowns() {
  const now = Date.now();
  return [...cooldowns.entries()]
    .filter(([, v]) => v.until > now)
    .map(([candidate, v]) => ({ candidate, kind: v.kind, secondsLeft: Math.round((v.until - now) / 1000), detail: v.detail }));
}

function isConfigured(provider) {
  if (provider === GROQ_PROVIDER) return !!config.groq.apiKey;
  if (provider === GEMINI_PROVIDER) return !!config.gemini.apiKey;
  if (provider === OPENROUTER_PROVIDER) return !!config.openrouter.apiKey;
  if (provider === OPENCODE_ZEN_PROVIDER) return !!config.opencodeZen.apiKey;
  return false;
}

/**
 * Determine if a query is simple (short, no context needed).
 */
function isSimpleQuery(messages) {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user") return false;
  const text = lastMsg.content || "";
  // Simple = short message without code blocks or complex formatting
  return text.length < 100 && !text.includes("```") && !text.includes("{") && !text.includes("\n");
}

/**
 * Map provider+model to the actual service call.
 */
async function callProvider(provider, modelKey, messages, options) {
  const service = SERVICES[provider];
  if (!service) throw new Error(`Unknown provider: ${provider}`);

  if (options.stream && service.streamChat) {
    return service.streamChat(messages, { ...options, model: modelKey });
  }

  return service.chatCompletion(messages, { ...options, model: modelKey });
}

/**
 * Walk the full fallback cascade (every free model on every configured
 * provider), skipping whichever single (provider, modelKey) pair was just
 * tried as the primary attempt, and returning the first one that succeeds.
 */
async function tryFallback(excludeProvider, excludeModelKey, messages, options, reason) {
  const attempted = [];

  // Two passes: benched candidates are skipped first time round, then tried
  // anyway if nothing else worked. A stale bench entry must never be able to
  // turn a recoverable situation into a hard failure for the visitor.
  for (const ignoreBench of [false, true]) {
    for (const { provider, modelKey } of FALLBACK_ORDER) {
      if (provider === excludeProvider && modelKey === excludeModelKey) continue;
      if (!isConfigured(provider)) continue;
      const key = candidateKey(provider, modelKey);
      if (attempted.includes(key)) continue;
      if (!ignoreBench && isBenched(provider, modelKey)) continue;
      attempted.push(key);
      try {
        const result = await callProvider(provider, modelKey, messages, { ...options, timeoutMs: FALLBACK_TIMEOUT_MS });
        // How deep the cascade had to go is the leading indicator that the
        // free pools are drying up — it climbs well before anything starts
        // failing outright. Only logged past the first fallback, since
        // landing on the very next candidate is routine.
        if (attempted.length > 1) {
          console.warn(`[Router] recovered on fallback #${attempted.length} (${key}) after: ${attempted.slice(0, -1).join(", ")}`);
        }
        return { ...result, provider, _routed: true, _fallbackReason: reason, _attempted: attempted };
      } catch (err) {
        benchCandidate(provider, modelKey, err);
      }
    }
  }

  console.warn(`[Router] every fallback exhausted (${attempted.length} tried): ${attempted.join(", ")}`);
  return null;
}

/**
 * Smart chat completion with automatic fallback and model routing.
 *
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options
 * @param {string} options.model - Preferred model (from bot settings)
 * @param {number} options.temperature - 0-1
 * @param {number} options.maxTokens - Max tokens in response
 * @param {boolean} options.stream - Whether to stream
 * @param {string} options.provider - Preferred provider override
 * @returns {Promise<Object>} { content, tokensUsed, latencyMs, model, provider }
 */
export async function chatCompletion(messages, options = {}) {
  let provider = options.provider || GROQ_PROVIDER;
  if (!SERVICES[provider]) provider = GROQ_PROVIDER;
  let modelKey = options.model || DEFAULT_MODEL_BY_PROVIDER[provider];

  // §6.3: Simple queries route to GPT-OSS 20B for speed
  const simple = isSimpleQuery(messages);
  if (simple && provider === GROQ_PROVIDER && modelKey === "llama3-70b") {
    modelKey = "llama3-8b";
  }

  // If the preferred provider isn't configured at all, go straight to fallback.
  if (!isConfigured(provider)) {
    console.warn(`[Router] ${provider} not configured, falling back`);
    const fallback = await tryFallback(provider, modelKey, messages, options, `${provider}_not_configured`);
    if (fallback) return fallback;
    throw new Error("No configured model provider available — every free-tier fallback was also exhausted or unconfigured");
  }

  // Likewise if the preferred candidate is already known to be down — no
  // point spending a round trip to be told the same thing again.
  if (isBenched(provider, modelKey)) {
    const fallback = await tryFallback(provider, modelKey, messages, options, `${provider}_cooling_down`);
    if (fallback) return fallback;
    // Everything was benched and the ignore-bench pass failed too; fall
    // through and give the preferred candidate its own chance anyway.
  }

  try {
    const result = await callProvider(provider, modelKey, messages, options);
    return { ...result, provider, _routed: false };
  } catch (err) {
    console.warn(`[Router] ${provider}/${modelKey} failed (${err.message}), falling back`);
    benchCandidate(provider, modelKey, err);
    const fallback = await tryFallback(provider, modelKey, messages, options, `${provider}_error`);
    if (fallback) return fallback;
    throw err;
  }
}

/**
 * Get embeddings using the best available provider. Groq is deliberately
 * not tried here — it has no embeddings endpoint at all (confirmed live:
 * any model name 404s with "model_not_found"), so attempting it was a
 * guaranteed-fail network round trip on every single chat message, and
 * previously masked a real bug: since the caller only ever saw a plain
 * vector back, there was no way to tell a genuine Gemini embedding apart
 * from the meaningless hash-based fallback below, so on any request where
 * Gemini also failed, confidence scoring silently ran on random noise and
 * came back "not confident" almost every time even when the answer itself
 * (built from keyword-search-matched context, unaffected by this) was
 * good — every message escalating as a false low-confidence handoff.
 * Returning { vector, isReal } lets rag.js tell the difference and skip
 * confidence scoring entirely (same as "no knowledge base yet") instead
 * of trusting a fake similarity score.
 */
export async function getEmbedding(text, taskType = "RETRIEVAL_DOCUMENT") {
  // Exactly one embedding provider is ever consulted. Unlike chat, this
  // must NOT cascade across providers: two embedding models produce
  // vectors of different dimensions in different vector spaces, so a
  // fallback would quietly write chunks that cosineSimilarity's length
  // guard scores 0 against every query — i.e. content that exists but can
  // never be retrieved. One provider, or a flagged-unreal vector.
  try {
    const vector = config.embeddingProvider === "gemini"
      ? (config.gemini.apiKey ? await gemini.getEmbedding(text, taskType) : null)
      : await localEmbedding.embed(text, taskType);
    if (vector?.length) return { vector, isReal: true };
  } catch (err) {
    console.warn(`[Router] ${config.embeddingProvider} embedding failed: ${err?.message}`);
  }

  // Final fallback: deterministic hash-based pseudo-embedding (not semantically
  // meaningful — only reached when no real embedding provider is available).
  // Safe at query time because callers check isReal and skip confidence
  // scoring; never write it to storage (see getStorableEmbedding).
  return { vector: groq.hashEmbedding(text), isReal: false };
}

/**
 * The only way an embedding should ever reach the database.
 *
 * Returns a JSON string to store, or null when no *real* embedding could be
 * produced. The hash fallback above is a tolerable momentary degradation at
 * query time (callers check `isReal` and skip confidence scoring), but
 * writing it to storage is corruption: it is noise that looks like a valid
 * vector, nothing marks it as fake, and cosineSimilarity's length guard then
 * returns a flat 0 for that chunk against every real query vector — so the
 * content becomes permanently unreachable by semantic search.
 *
 * That is not hypothetical. On 2026-11-19, 6,304 of 7,308 production chunks
 * were found to be stored hash vectors (384-dim, the hash function's
 * signature) because both indexing paths destructured only `vector` and
 * ignored `isReal`. Storing null instead leaves the chunk visibly
 * un-embedded, which backfillEmbeddings() then repairs on its next run.
 */
export async function getStorableEmbedding(text) {
  const { vector, isReal } = await getEmbedding(text, "RETRIEVAL_DOCUMENT");
  return isReal && vector ? JSON.stringify(vector) : null;
}

export { GROQ_PROVIDER, GEMINI_PROVIDER, OPENROUTER_PROVIDER, OPENCODE_ZEN_PROVIDER, DEFAULT_MODEL_BY_PROVIDER };
