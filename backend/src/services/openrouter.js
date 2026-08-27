import config from "../config.js";

/**
 * OpenRouter — OpenAI-compatible gateway to many hosted models. Curated to
 * the free (":free") tier here; these are shared-pool and can rate-limit
 * or rotate out without notice, so callers should be ready to fall back.
 */
const MODELS = {
  "auto": { modelId: "openrouter/free", contextWindow: 200_000 },
  "glm-5.2": { modelId: "z-ai/glm-5.2:free", contextWindow: 256_000 },
  "minimax-m3": { modelId: "minimax/minimax-m3:free", contextWindow: 1_048_576 },
  "nemotron-ultra": { modelId: "nvidia/nemotron-3-ultra-550b-a55b:free", contextWindow: 1_000_000 },
  "nemotron-super": { modelId: "nvidia/nemotron-3-super-120b-a12b:free", contextWindow: 262_144 },
  "gemma-4": { modelId: "google/gemma-4-31b-it:free", contextWindow: 262_144 },
  "inkling": { modelId: "thinkingmachines/inkling:free", contextWindow: 1_048_576 },
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
    signal: AbortSignal.timeout(20000),
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
