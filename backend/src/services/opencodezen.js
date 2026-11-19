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
// Free-model list, verified live against GET /zen/v1/models on 2026-11-19
// rather than transcribed from the pricing page — the two disagree. Note
// "big-pickle" carries NO "-free" suffix even though it is $0.00 (every
// other free model here does), and "jev-1.13-free" is on the pricing page
// but absent from the served catalog entirely. Both would have been silent
// permanent failures. Also note "deepseek-v4.1-flash" exists in the catalog
// WITHOUT the suffix as a paid model — the "-free" one below is the free
// variant, don't "tidy" the name. Re-check via checkCatalogDrift() in
// services/modelHealth.js; this pool genuinely rotates.
const MODELS = {
  "deepseek-v4.1-flash": { modelId: "deepseek-v4.1-flash-free", contextWindow: 200_000 },
  "mimo-v2.6-flash": { modelId: "mimo-v2.6-flash-free", contextWindow: 128_000 },
  "longcat-2.5": { modelId: "longcat-2.5-free", contextWindow: 128_000 },
  "nemotron-3.5-lightning": { modelId: "nemotron-3.5-lightning-free", contextWindow: 128_000 },
  "nemotron-3.5-super-vl": { modelId: "nemotron-3.5-super-vl-free", contextWindow: 128_000 },
  "hy4-flash": { modelId: "hy4-flash-free", contextWindow: 128_000 },
  "inkling-2-small": { modelId: "inkling-2-small-free", contextWindow: 128_000 },
  "flint-40b": { modelId: "flint-40b-free", contextWindow: 128_000 },
  "beam": { modelId: "beam-free", contextWindow: 128_000 },
  "big-pickle": { modelId: "big-pickle", contextWindow: 200_000 },
  "iceman": { modelId: "iceman-free", contextWindow: 128_000 },
  "tidepool-alpha": { modelId: "tidepool-alpha-free", contextWindow: 128_000 },
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
    signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    const err = new Error(`OpenCode Zen API error (${response.status}): ${errText.slice(0, 300)}`);
    // Carried so modelRouter can tell a quota block (retryable soon) from a
    // dead/renamed slug (retryable never) without parsing this message.
    err.status = response.status;
    err.retryAfter = Number(response.headers.get("retry-after")) || null;
    throw err;
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
