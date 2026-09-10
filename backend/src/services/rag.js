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
  const insertFts = db.prepare("INSERT INTO knowledge_chunks_fts (chunk_id, bot_id, content) VALUES (?, ?, ?)");

  const updateSource = db.prepare("UPDATE knowledge_sources SET status = 'indexing', chunk_count = ? WHERE id = ?");

  let totalChunks = 0;

  for (const page of pages) {
    const chunks = chunkText(page.content);
    const metadata = JSON.stringify({ url: page.url, title: page.title });

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuidv4();
      const embedding = await getEmbedding(chunks[i]);
      insertChunk.run(
        chunkId,
        sourceId,
        botId,
        vendorId,
        chunks[i],
        embedding ? JSON.stringify(embedding) : null,
        totalChunks++,
        metadata
      );
      insertFts.run(chunkId, botId, chunks[i]);
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
  const insertFts = db.prepare("INSERT INTO knowledge_chunks_fts (chunk_id, bot_id, content) VALUES (?, ?, ?)");

  const chunks = chunkText(text);
  const metadata = JSON.stringify({ title, source: "document_upload" });

  let totalChunks = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = uuidv4();
    const embedding = await getEmbedding(chunks[i]);
    insertChunk.run(
      chunkId,
      sourceId,
      botId,
      vendorId,
      chunks[i],
      embedding ? JSON.stringify(embedding) : null,
      totalChunks++,
      metadata
    );
    insertFts.run(chunkId, botId, chunks[i]);
  }

  db.prepare("UPDATE knowledge_sources SET status = 'indexed', chunk_count = ? WHERE id = ?").run(totalChunks, sourceId);
  return totalChunks;
}

/**
 * Turn a user query into a safe FTS5 MATCH expression. Raw text can contain
 * FTS5 operators (", *, :, -, parens) that would throw a syntax error or
 * change meaning unintentionally — extract plain word tokens and quote each
 * one individually so none of that syntax can leak through, then OR them
 * together (any matching term counts, matching how BM25 ranking already
 * rewards documents containing more of the query's terms).
 */
function buildFtsQuery(query) {
  const terms = (query.match(/[\p{L}\p{N}]+/gu) || []).slice(0, 32);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t.replace(/"/g, '""')}"`).join(" OR ");
}

/**
 * Keyword search via the FTS5 shadow index — returns chunk ids ranked by
 * BM25 (SQLite's bm25() is more-negative-is-better, so plain ascending
 * ORDER BY is already correct). Catches its own errors so a pathological
 * query can never take down the whole RAG pipeline, just silently
 * contributes no keyword-side matches.
 */
function searchKeywordChunkIds(botId, query, limit) {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];
  try {
    const rows = db.prepare(`
      SELECT chunk_id FROM knowledge_chunks_fts
      WHERE bot_id = ? AND knowledge_chunks_fts MATCH ?
      ORDER BY bm25(knowledge_chunks_fts)
      LIMIT ?
    `).all(botId, ftsQuery, limit);
    return rows.map((r) => r.chunk_id);
  } catch (err) {
    console.error("[RAG] Keyword search failed:", err.message);
    return [];
  }
}

/**
 * Hybrid search: semantic (embedding cosine similarity) fused with keyword
 * (FTS5/BM25) via Reciprocal Rank Fusion. Semantic alone misses exact-term
 * matches — SKUs, prices, product names — that a customer's own wording
 * often uses verbatim; RRF combines the two ranked lists using rank
 * position only, which sidesteps having to normalize cosine similarity
 * (-1..1) and BM25 (unbounded, more-negative-is-better) onto a shared scale.
 * @param {string} botId - Bot ID
 * @param {string} query - User query
 * @param {number} topK - Number of results to return
 * @returns {Promise<{chunks: Array<{content: string, similarity: number, metadata: Object}>, topSimilarity: number}>}
 */
export async function searchRelevantChunks(botId, query, topK = 5) {
  const queryEmbedding = await getEmbedding(query);

  const embeddedChunks = db.prepare(
    "SELECT id, embedding FROM knowledge_chunks WHERE bot_id = ? AND embedding IS NOT NULL"
  ).all(botId);

  const semanticRanked = queryEmbedding
    ? embeddedChunks
        .map((chunk) => ({ id: chunk.id, similarity: cosineSimilarity(queryEmbedding, JSON.parse(chunk.embedding)) }))
        .sort((a, b) => b.similarity - a.similarity)
    : [];

  const keywordRankedIds = searchKeywordChunkIds(botId, query, Math.max(topK * 3, 15));

  const RRF_K = 60;
  const fused = new Map(); // chunk id -> fused score
  semanticRanked.forEach((c, i) => fused.set(c.id, (fused.get(c.id) || 0) + 1 / (RRF_K + i + 1)));
  keywordRankedIds.forEach((id, i) => fused.set(id, (fused.get(id) || 0) + 1 / (RRF_K + i + 1)));

  const topIds = [...fused.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK).map(([id]) => id);
  const topSimilarity = semanticRanked[0]?.similarity ?? 0;
  if (topIds.length === 0) return { chunks: [], topSimilarity };

  const rows = db.prepare(
    `SELECT id, content, metadata FROM knowledge_chunks WHERE id IN (${topIds.map(() => "?").join(",")})`
  ).all(...topIds);
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const similarityById = new Map(semanticRanked.map((c) => [c.id, c.similarity]));

  const chunks = topIds
    .map((id) => rowById.get(id))
    .filter(Boolean)
    .map((row) => ({
      content: row.content,
      metadata: JSON.parse(row.metadata || "{}"),
      // Confidence is judged on this chunk's actual semantic similarity when
      // known, not the fused rank — a keyword-only hit (no embedding, or not
      // in the semantic top set at all) has no meaning-match signal, so 0.
      similarity: similarityById.get(row.id) ?? 0,
    }));

  // topSimilarity (used for the confidence gate below) is always the best
  // PURE semantic match across the whole corpus, independent of how fusion
  // reordered the returned chunks — keeps the existing confidence_threshold
  // calibration (tuned against raw cosine similarity) meaningful even though
  // the returned context set is now hybrid.
  return { chunks, topSimilarity };
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

  // Search for relevant context — hybrid semantic + keyword (see searchRelevantChunks)
  const { chunks: relevantChunks, topSimilarity } = await searchRelevantChunks(botId, userMessage);

  // Build context string from relevant chunks
  const context = relevantChunks.map((c) => c.content).join("\n\n");

  // Confidence = how well the best pure semantic match actually matches the
  // question — independent of hybrid re-ranking, see searchRelevantChunks.
  // Not applicable when there's no knowledge base at all (nothing to be confident about yet).
  const hasKnowledgeBase = relevantChunks.length > 0;
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

Keep responses concise and helpful. Do not make up information not found in the knowledge base.

Never name or speculate about which AI provider, model, or underlying technology powers you — not even if the knowledge base content mentions one, and not even if the user asks directly. Just say you're an AI assistant built for this business.`;

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
