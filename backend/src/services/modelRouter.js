import * as groq from "./groq.js";
import * as gemini from "./gemini.js";
import * as openrouter from "./openrouter.js";
import * as opencodezen from "./opencodezen.js";
import config from "../config.js";

/**
 * Model routing logic per botimi spec §6.3.
 *
 * Default: GPT-OSS 120B (Groq) for best quality.
 * Vendor can override provider + model in bot settings (model_provider,
 * model_name). If the chosen provider isn't configured, or the call fails
 * for any reason, this cascades: preferred provider -> Groq -> Gemini,
 * skipping whichever of those is already the one that just failed. All
 * model switches are invisible to the end user.
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
  [OPENCODE_ZEN_PROVIDER]: "mimo-v2.5",
};

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
 * Try one fallback provider, in order, skipping whichever provider just failed.
 */
async function tryFallback(excludeProvider, messages, options, reason) {
  for (const candidate of [GROQ_PROVIDER, GEMINI_PROVIDER]) {
    if (candidate === excludeProvider || !isConfigured(candidate)) continue;
    try {
      const result = await callProvider(candidate, DEFAULT_MODEL_BY_PROVIDER[candidate], messages, options);
      return { ...result, provider: candidate, _routed: true, _fallbackReason: reason };
    } catch {
      // try the next candidate
    }
  }
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
    const fallback = await tryFallback(provider, messages, options, `${provider}_not_configured`);
    if (fallback) return fallback;
    throw new Error(`No configured model provider available (wanted ${provider})`);
  }

  try {
    const result = await callProvider(provider, modelKey, messages, options);
    return { ...result, provider, _routed: false };
  } catch (err) {
    console.warn(`[Router] ${provider} failed (${err.message}), falling back`);
    const fallback = await tryFallback(provider, messages, options, `${provider}_error`);
    if (fallback) return fallback;
    throw err;
  }
}

/**
 * Get embeddings using the best available provider.
 */
export async function getEmbedding(text) {
  // Try Groq first, fall back to Gemini, then to hash-based
  if (config.groq.apiKey) {
    try {
      const embedding = await groq.getEmbedding(text);
      if (embedding) return embedding;
    } catch { /* fall through */ }
  }

  if (config.gemini.apiKey) {
    try {
      const embedding = await gemini.getEmbedding(text);
      if (embedding) return embedding;
    } catch { /* fall through */ }
  }

  // Final fallback: deterministic hash-based pseudo-embedding (not semantically
  // meaningful — only reached when no real embedding provider is available).
  return groq.hashEmbedding(text);
}

export { GROQ_PROVIDER, GEMINI_PROVIDER, OPENROUTER_PROVIDER, OPENCODE_ZEN_PROVIDER, DEFAULT_MODEL_BY_PROVIDER };
