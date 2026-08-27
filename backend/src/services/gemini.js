import config from "../config.js";

let geminiClient = null;
let requestCount = 0;
let requestResetAt = Date.now() + 60000;

/**
 * Get or create the Gemini client.
 * Uses Google's Generative Language API via fetch (no SDK dependency).
 */
function getClient() {
  if (!config.gemini?.apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return { apiKey: config.gemini.apiKey };
}

// Using Google's "-latest" aliases (rather than pinned version numbers like
// "gemini-1.5-flash") so this doesn't silently go stale again as Google
// retires older dated models — Google keeps these pointed at their current
// flash/pro model.
const MODELS = {
  "gemini-flash": {
    modelId: "gemini-flash-latest",
    contextWindow: 1_048_576,
    priority: 1,
    cost: "free",
  },
  "gemini-pro": {
    modelId: "gemini-pro-latest",
    contextWindow: 1_048_576,
    priority: 2,
    cost: "free",
  },
};

/**
 * Check rate limits per Gemini free tier.
 */
function checkRateLimit(modelKey) {
  const now = Date.now();
  if (now > requestResetAt) {
    requestCount = 0;
    requestResetAt = now + 60000;
  }

  // Free tier: 15 req/min for Flash, 2 req/min for Pro
  const limits = {
    "gemini-flash": config.limits.geminiRequestsPerMin || 15,
    "gemini-pro": 2,
  };
  const limit = limits[modelKey] || 15;

  if (requestCount >= limit) {
    throw new Error(`GEMINI_RATE_LIMIT: ${modelKey} exceeded ${limit} req/min`);
  }
  requestCount++;
}

/**
 * Build the request body for Gemini content generation.
 */
function buildRequestBody(messages, options) {
  // Convert OpenAI-style messages to Gemini format
  const contents = [];
  let systemInstruction = null;

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: [{ text: msg.content }],
      });
    }
  }

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  return body;
}

/**
 * Send a chat completion to Google Gemini.
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options
 * @param {string} options.model - Model key from MODELS map
 * @param {number} options.temperature - 0-1
 * @param {number} options.maxTokens - Max output tokens
 * @returns {Promise<Object>} { content, tokensUsed, latencyMs, model }
 */
export async function chatCompletion(messages, options = {}) {
  const client = getClient();
  const modelKey = options.model || "gemini-flash";
  const modelConfig = MODELS[modelKey] || MODELS["gemini-flash"];

  checkRateLimit(modelKey);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.modelId}:generateContent?key=${client.apiKey}`;
  const body = buildRequestBody(messages, options);
  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text || "";
  const tokenUsage = data.usageMetadata || {};

  return {
    content,
    tokensUsed: (tokenUsage.promptTokenCount || 0) + (tokenUsage.candidatesTokenCount || 0),
    latencyMs,
    model: modelConfig.modelId,
  };
}

/**
 * Stream a chat completion from Gemini.
 * Returns a ReadableStream-like async generator.
 */
export async function streamChat(messages, options = {}) {
  const client = getClient();
  const modelKey = options.model || "gemini-flash";
  const modelConfig = MODELS[modelKey] || MODELS["gemini-flash"];

  checkRateLimit(modelKey);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.modelId}:streamGenerateContent?alt=sse&key=${client.apiKey}`;
  const body = buildRequestBody(messages, options);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini stream error (${response.status}): ${errText}`);
  }

  // Return the response body as a ReadableStream for SSE parsing
  return response.body;
}

/**
 * Generate embeddings using Gemini.
 */
export async function getEmbedding(text) {
  const client = getClient();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${client.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.embedding?.values || null;
}

export { getClient, MODELS };
