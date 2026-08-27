import config from "../config.js";

/**
 * OpenCode Zen — OpenAI-compatible gateway curated by the OpenCode team.
 * The catalog mixes paid models (e.g. "gpt-5.5", "claude-sonnet-5" — these
 * need a payment method on the workspace) with genuinely free "*-free"
 * models that work on a bare API key. Only the free ones are listed here.
 * Like other shared free pools (see openrouter.js), individual free models
 * can be transiently unavailable/rate-limited — that's normal, not a bug;
 * the router falls back automatically when one is down.
 */
const MODELS = {
  "mimo-v2.5": { modelId: "mimo-v2.5-free", contextWindow: 128_000 },
  "hy3": { modelId: "hy3-free", contextWindow: 128_000 },
  "deepseek-v4-flash": { modelId: "deepseek-v4-flash-free", contextWindow: 200_000 },
  "nemotron-3-ultra": { modelId: "nemotron-3-ultra-free", contextWindow: 128_000 },
  "nemotron-3.5-lightning": { modelId: "nemotron-3.5-lightning-free", contextWindow: 128_000 },
};

function getApiKey() {
  if (!config.opencodeZen?.apiKey) {
    throw new Error("OPENCODE_ZEN_API_KEY not configured");
  }
  return config.opencodeZen.apiKey;
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
  const modelKey = options.model || "mimo-v2.5";
  const modelConfig = MODELS[modelKey] || MODELS["mimo-v2.5"];
  const startTime = Date.now();

  const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
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
    throw new Error(`OpenCode Zen API error (${response.status}): ${errText.slice(0, 300)}`);
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
