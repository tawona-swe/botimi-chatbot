import * as groq from "./groq.js";
import * as gemini from "./gemini.js";
import config from "../config.js";

/**
 * Model routing logic per botimi spec §6.3.
 *
 * Default: GPT-OSS 120B (Groq) for best quality.
 * If Groq rate limit hit: auto-switch to Gemini 1.5 Flash.
 * If query is simple (< 100 chars, no code blocks): route to GPT-OSS 20B for speed.
 * Vendor can override default model in bot settings.
 * All model switches are invisible to the end user.
 *
 * Model IDs updated 2026-07-08 per Groq deprecation schedule.
 * llama3-70b-8192/llama3-8b-8192 deprecated Aug 2025.
 * llama-3.3-70b-versatile/llama-3.1-8b-instant shut down Aug 16, 2026.
 */

const GROQ_PROVIDER = "groq";
const GEMINI_PROVIDER = "gemini";

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
  const service = provider === GEMINI_PROVIDER ? gemini : groq;

  if (options.stream) {
    return service.streamChat(messages, { ...options, model: modelKey });
  }

  return service.chatCompletion(messages, { ...options, model: modelKey });
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
  const preferredModel = options.model || "llama3-70b";
  const preferredProvider = options.provider || GROQ_PROVIDER;
  const startTime = Date.now();

  // Determine if this is a simple query for fast-routing
  const simple = isSimpleQuery(messages);
  let modelKey = preferredModel;
  let provider = preferredProvider;

  // §6.3: Simple queries route to GPT-OSS 20B for speed
  if (simple && provider === GROQ_PROVIDER && preferredModel === "llama3-70b") {
    modelKey = "llama3-8b";
  }

  // If Gemini is preferred (vendor override), try that first
  if (provider === GEMINI_PROVIDER && !config.gemini.apiKey) {
    // Fallback to Groq if Gemini not configured
    provider = GROQ_PROVIDER;
    modelKey = preferredModel;
  }

  // Attempt primary provider
  try {
    const result = await callProvider(provider, modelKey, messages, options);
    return {
      ...result,
      provider,
      _routed: false,
    };
  } catch (err) {
    const errMsg = err.message || "";

    // §6.3: If Groq rate limit hit → auto-switch to Gemini
    if (provider === GROQ_PROVIDER && config.gemini.apiKey &&
        (errMsg.includes("429") || errMsg.includes("rate_limit") || errMsg.includes("RATE_LIMIT"))) {
      console.warn("[Router] Groq rate limited, falling back to Gemini Flash");
      try {
        const fallbackResult = await callProvider(GEMINI_PROVIDER, "gemini-1.5-flash", messages, options);
        return {
          ...fallbackResult,
          provider: GEMINI_PROVIDER,
          _routed: true,
          _fallbackReason: "groq_rate_limit",
        };
      } catch (geminiErr) {
        // Both providers failed — throw the original error
        console.error("[Router] Both Groq and Gemini failed");
        throw err;
      }
    }

    // If Gemini fails and Groq is available, fallback to Groq
    if (provider === GEMINI_PROVIDER && config.groq.apiKey) {
      console.warn("[Router] Gemini failed, falling back to Groq");
      try {
        const fallbackResult = await callProvider(GROQ_PROVIDER, "llama3-70b", messages, options);
        return {
          ...fallbackResult,
          provider: GROQ_PROVIDER,
          _routed: true,
          _fallbackReason: "gemini_error",
        };
      } catch {
        throw err;
      }
    }

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

  // Final fallback: Groq's hash-based embedding
  return groq.getEmbedding(text);
}

export { GROQ_PROVIDER, GEMINI_PROVIDER };
