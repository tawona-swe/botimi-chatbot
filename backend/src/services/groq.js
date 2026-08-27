import Groq from "groq-sdk";
import config from "../config.js";

let groqClient = null;

function getClient() {
  if (!groqClient) {
    if (!config.groq.apiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }
    groqClient = new Groq({ apiKey: config.groq.apiKey });
  }
  return groqClient;
}

// Model IDs updated 2026-07-08 per Groq deprecation schedule.
// llama3-70b-8192 and llama3-8b-8192 deprecated Aug 2025.
// llama-3.3-70b-versatile and llama-3.1-8b-instant shut down Aug 16, 2026.
const MODELS = {
  "llama3-70b": { modelId: "openai/gpt-oss-120b", contextWindow: 32768, priority: 1 },
  "llama3-8b": { modelId: "openai/gpt-oss-20b", contextWindow: 8192, priority: 2 },
  "mixtral-8x7b": { modelId: "qwen/qwen3.6-27b", contextWindow: 32768, priority: 3 },
};

/**
 * Send a chat completion request to Groq.
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options
 * @param {string} options.model - Model key from MODELS map
 * @param {number} options.temperature - 0-1
 * @param {number} options.maxTokens - Max tokens in response
 * @param {boolean} options.stream - Whether to stream
 * @returns {Promise<Object>} { content, tokensUsed, latencyMs, model }
 */
export async function chatCompletion(messages, options = {}) {
  const client = getClient();
  const modelKey = options.model || "llama3-70b";
  const modelConfig = MODELS[modelKey] || MODELS["llama3-70b"];
  const startTime = Date.now();

  const completion = await client.chat.completions.create({
    model: modelConfig.modelId,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    stream: options.stream ?? false,
    ...(options.tools ? { tools: options.tools } : {}),
    ...(options.tool_choice ? { tool_choice: options.tool_choice } : {}),
  });

  const latencyMs = Date.now() - startTime;

  if (options.stream) {
    return { stream: completion, model: modelConfig.modelId };
  }

  return {
    content: completion.choices[0]?.message?.content || "",
    toolCalls: completion.choices[0]?.message?.tool_calls || null,
    tokensUsed: completion.usage?.total_tokens || 0,
    latencyMs,
    model: modelConfig.modelId,
  };
}

/**
 * Stream a chat completion — returns a ReadableStream.
 */
export async function streamChat(messages, options = {}) {
  const client = getClient();
  const modelKey = options.model || "llama3-70b";
  const modelConfig = MODELS[modelKey] || MODELS["llama3-70b"];

  const stream = await client.chat.completions.create({
    model: modelConfig.modelId,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    stream: true,
  });

  return stream;
}

/**
 * Embedding via Groq. Groq does not actually serve an embeddings endpoint
 * as of this writing, so this will fail — callers should fall back to a
 * real embedding provider (see modelRouter.js) rather than treat a null
 * return here as "no embedding available anywhere."
 */
export async function getEmbedding(text) {
  try {
    const client = getClient();
    const response = await client.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0]?.embedding || null;
  } catch {
    return null;
  }
}

/**
 * Deterministic hash-derived pseudo-embedding. NOT semantically meaningful —
 * this is a last-resort fallback for when no real embedding provider is
 * configured/reachable, so RAG search degrades to "no matches" instead of
 * crashing. Never treat its output as an actual measure of relevance.
 */
export function hashEmbedding(text) {
  const dim = 384;
  const embedding = new Array(dim);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    const seed = Math.sin(hash * (i + 1)) * 10000;
    embedding[i] = seed - Math.floor(seed);
  }
  return embedding;
}

export { getClient, MODELS };
