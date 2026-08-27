import db from "../db/index.js";
import { getEmbedding, chatCompletion } from "./modelRouter.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Chunk text into overlapping segments.
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Target chunk size in tokens (approx chars)
 * @param {number} overlap - Overlap between chunks
 * @returns {Array<string>}
 */
export function chunkText(text, chunkSize = 1500, overlap = 200) {
  if (!text || text.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at a sentence boundary
    if (end < text.length) {
      const searchEnd = Math.min(end + 200, text.length);
      const lastPeriod = text.lastIndexOf(".", searchEnd);
      const lastNewline = text.lastIndexOf("\n", searchEnd);
      const breakPoint = Math.max(
        lastPeriod > start + chunkSize / 2 ? lastPeriod + 1 : -1,
        lastNewline > start + chunkSize / 2 ? lastNewline + 1 : -1
      );
      if (breakPoint > start) {
        end = breakPoint;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 20);
}

/**
 * Index crawled content into the vector store.
 * @param {string} sourceId - Knowledge source ID
 * @param {string} botId - Bot ID
 * @param {string} vendorId - Vendor ID
 * @param {Array<{url: string, title: string, content: string}>} pages - Crawled pages
 */
export async function indexPages(sourceId, botId, vendorId, pages) {
  const insertChunk = db.prepare(`
    INSERT INTO knowledge_chunks (id, source_id, bot_id, vendor_id, content, embedding, chunk_index, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateSource = db.prepare("UPDATE knowledge_sources SET status = 'indexing', chunk_count = ? WHERE id = ?");

  let totalChunks = 0;

  for (const page of pages) {
    const chunks = chunkText(page.content);
    const metadata = JSON.stringify({ url: page.url, title: page.title });

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      insertChunk.run(
        uuidv4(),
        sourceId,
        botId,
        vendorId,
        chunks[i],
        embedding ? JSON.stringify(embedding) : null,
        totalChunks++,
        metadata
      );
    }
  }

  updateSource.run(totalChunks, sourceId);
  db.prepare("UPDATE knowledge_sources SET status = 'indexed' WHERE id = ?").run(sourceId);

  return totalChunks;
}

/**
 * Index raw text content into the vector store (for document uploads).
 * @param {string} sourceId - Knowledge source ID
 * @param {string} botId - Bot ID
 * @param {string} vendorId - Vendor ID
 * @param {string} text - The raw text content
 * @param {string} title - A title for the source
 */
export async function indexText(sourceId, botId, vendorId, text, title = "") {
  const insertChunk = db.prepare(`
    INSERT INTO knowledge_chunks (id, source_id, bot_id, vendor_id, content, embedding, chunk_index, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const chunks = chunkText(text);
  const metadata = JSON.stringify({ title, source: "document_upload" });

  let totalChunks = 0;
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i]);
    insertChunk.run(
      uuidv4(),
      sourceId,
      botId,
      vendorId,
      chunks[i],
      embedding ? JSON.stringify(embedding) : null,
      totalChunks++,
      metadata
    );
  }

  db.prepare("UPDATE knowledge_sources SET status = 'indexed', chunk_count = ? WHERE id = ?").run(totalChunks, sourceId);
  return totalChunks;
}

/**
 * Search for relevant chunks using cosine similarity.
 * @param {string} botId - Bot ID
 * @param {string} query - User query
 * @param {number} topK - Number of results to return
 * @returns {Array<{content: string, similarity: number, metadata: Object}>}
 */
export async function searchRelevantChunks(botId, query, topK = 5) {
  const queryEmbedding = await getEmbedding(query);
  if (!queryEmbedding) {
    return [];
  }

  const chunks = db.prepare(
    "SELECT id, content, embedding, metadata FROM knowledge_chunks WHERE bot_id = ? AND embedding IS NOT NULL"
  ).all(botId);

  // Calculate cosine similarity
  const results = chunks.map((chunk) => {
    const chunkEmbedding = JSON.parse(chunk.embedding);
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
    return {
      content: chunk.content,
      similarity,
      metadata: JSON.parse(chunk.metadata || "{}"),
    };
  });

  // Sort by similarity descending and take topK
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Generate a RAG-enhanced prompt and get a response.
 * @param {string} botId - Bot ID
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages in the session
 * @returns {Promise<{content: string, sources: Array, tokensUsed: number, latencyMs: number, confident: boolean|null, topSimilarity: number}>}
 */
export async function generateRagResponse(botId, userMessage, conversationHistory = []) {
  // Get bot config
  const bot = db.prepare("SELECT * FROM bots WHERE id = ?").get(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }

  // Search for relevant context
  const relevantChunks = await searchRelevantChunks(botId, userMessage);

  // Build context string from relevant chunks
  const context = relevantChunks.map((c) => c.content).join("\n\n");

  // Confidence = how well the top matching chunk actually matches the question.
  // Not applicable when there's no knowledge base at all (nothing to be confident about yet).
  const hasKnowledgeBase = relevantChunks.length > 0;
  const topSimilarity = hasKnowledgeBase ? relevantChunks[0].similarity : 0;
  const threshold = bot.confidence_threshold ?? 0.7;
  const isConfident = hasKnowledgeBase ? topSimilarity >= threshold : null;

  // Build system prompt
  const toneInstruction = {
    professional: "Respond in a professional, helpful manner. Be precise and courteous.",
    friendly: "Respond in a warm, friendly manner. Be approachable and conversational.",
    concise: "Respond concisely. Get straight to the point with minimal fluff.",
  }[bot.response_tone] || "Respond in a professional, helpful manner.";

  const confidenceInstruction = isConfident === false
    ? "\n\nThe retrieved knowledge base content is only a weak match for this question — you are not confident it actually answers what was asked. Be upfront about that uncertainty rather than guessing, and let the user know a team member will follow up."
    : "";

  const systemPrompt = `You are ${bot.name}, an AI customer support assistant for the company. ${toneInstruction}

${context ? `Use the following knowledge base content to answer the user's question. If the information is not in the knowledge base, politely say you don't know and offer to escalate.\n\nKnowledge Base:\n${context}` : "You don't have a knowledge base yet. Answer general questions about the company's products and services, but direct specific inquiries to the support team."}${confidenceInstruction}

Keep responses concise and helpful. Do not make up information not found in the knowledge base.`;

  // Build messages array with conversation history
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10), // Last 10 messages for context
    { role: "user", content: userMessage },
  ];

  // Get response from the bot's configured provider/model (falls back automatically if unavailable)
  const response = await chatCompletion(messages, {
    provider: bot.model_provider || "groq",
    model: bot.model_name || "llama3-70b",
    temperature: 0.7,
  });

  return {
    content: response.content,
    sources: relevantChunks.map((c) => c.metadata),
    tokensUsed: response.tokensUsed,
    latencyMs: response.latencyMs,
    model: response.model || bot.model_name || "llama3-70b",
    confident: isConfident,
    topSimilarity,
  };
}

/**
 * Get training health score for a bot.
 */
export function getTrainingHealthScore(botId) {
  const totalChunks = db.prepare("SELECT COUNT(*) as count FROM knowledge_chunks WHERE bot_id = ?").get(botId);
  const totalSources = db.prepare("SELECT COUNT(*) as count FROM knowledge_sources WHERE bot_id = ?").get(botId);

  if (totalSources.count === 0) return 0;

  // Score based on chunk count (simple heuristic)
  const chunkScore = Math.min(totalChunks.count / 100, 1) * 60;
  const sourceScore = Math.min(totalSources.count / 3, 1) * 40;

  return Math.round(chunkScore + sourceScore);
}
