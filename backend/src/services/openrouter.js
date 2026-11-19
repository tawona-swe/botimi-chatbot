import config from "../config.js";

/**
 * OpenRouter — OpenAI-compatible gateway to many hosted models. Curated to
 * the free (":free") tier here; these are shared-pool and can rate-limit
 * or rotate out without notice, so callers should be ready to fall back.
 *
 * List verified live against GET https://openrouter.ai/api/v1/models on
 * 2026-11-19 (filtered to id.endsWith(':free')) — four previously-listed
 * slugs (glm-5.2, minimax-m3, nemotron-super, the old "inkling") had been
 * retired from the free tier and now 404 with "use this slug instead"
 * pointing at the *paid* version; removed rather than swapped in, since
 * the whole point of this list is never paying for any of them. Re-check
 * that endpoint periodically — this pool genuinely rotates.
 */
const MODELS = {
  "auto": { modelId: "openrouter/free", contextWindow: 200_000 },
  "nemotron-ultra": { modelId: "nvidia/nemotron-3-ultra-550b-a55b:free", contextWindow: 1_000_000 },
  "gemma-4": { modelId: "google/gemma-4-31b-it:free", contextWindow: 262_144 },
  "gemma-4-26b": { modelId: "google/gemma-4-26b-a4b-it:free", contextWindow: 262_144 },
  "ling-3.2-flash": { modelId: "inclusionai/ling-3.2-flash:free", contextWindow: 1_048_576 },
  "ernie-5.5-flash": { modelId: "baidu/ernie-5.5-flash-preview:free", contextWindow: 1_024_000 },
  "inkling-2-small": { modelId: "thinkingmachines/inkling-2-small:free", contextWindow: 1_048_576 },
  "lfm-3": { modelId: "liquid/lfm-3-1.7b:free", contextWindow: 262_144 },
  "particle-1": { modelId: "particle-ai/particle-1:free", contextWindow: 1_048_576 },
  "flint-v1": { modelId: "recursive/flint-v1.0:free", contextWindow: 262_144 },
  "nemotron-3.5-super-vl": { modelId: "nvidia/nemotron-3.5-super-vl:free", contextWindow: 1_000_000 },
  "dots-3-note": { modelId: "dots-studio/dots-3-note-preview:free", contextWindow: 512_000 },
  "nemotron-3.5-lightning": { modelId: "nvidia/nemotron-3.5-lightning:free", contextWindow: 1_000_000 },
  "north-mini-code": { modelId: "cohere/north-mini-code:free", contextWindow: 256_000 },
  "nemotron-3-nano-omni": { modelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", contextWindow: 256_000 },
};

function getApiKey() {
  if (!config.openrouter?.apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  return config.openrouter.apiKey;
}

/**
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options
 * @param {string} options.model - Model key from MODELS map
 * @param {number} options.temperature - 0-1
 * @param {number} options.maxTokens - Max tokens in response
 * @returns {Promise<Object>} { content, tokensUsed, latencyMs, model }
 */
export async function chatCompletion(messages, options = {}) {
  const apiKey = getApiKey();
  const modelKey = options.model || "auto";
  const modelConfig = MODELS[modelKey] || MODELS["auto"];
  const startTime = Date.now();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.frontendUrl || "http://localhost:3000",
      "X-Title": config.appName || "botimi",
    },
    body: JSON.stringify({
      model: modelConfig.modelId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenRouter API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  return {
    content,
    tokensUsed: data.usage?.total_tokens || 0,
    latencyMs,
    model: modelConfig.modelId,
  };
}

export { MODELS };
