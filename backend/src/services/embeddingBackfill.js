import db from "../db/index.js";
import config from "../config.js";
import { getEmbedding, getStorableEmbedding } from "./modelRouter.js";

/**
 * Repairs knowledge chunks that have no usable embedding.
 *
 * Two populations end up here:
 *
 *  1. Chunks indexed while the embedding provider was failing. These used to
 *     be written as hash-fallback noise that *looked* like a valid vector
 *     (see getStorableEmbedding for the full story — 6,304 of 7,308
 *     production chunks were in this state on 2026-11-19). Indexing now
 *     stores null instead, but the historical rows still need repairing.
 *  2. Chunks embedded by a previous model with a different dimension. A
 *     vector from another model is not comparable with the current one —
 *     cosineSimilarity's length guard scores them a flat 0 against every
 *     query — so a dimension change silently makes that content unreachable
 *     by semantic search until it is re-embedded.
 *
 * Both are the same repair: produce a real, current-dimension vector.
 *
 * The expected dimension is probed from the provider each run rather than
 * hardcoded, so swapping embedding models needs no change here — the new
 * dimension simply makes every old chunk a candidate, and successive runs
 * migrate the corpus across.
 *
 * Quota is the binding constraint (Gemini's free embedding tier is ~1k
 * requests/day, shared with live chat traffic), so this is deliberately a
 * trickle: it repairs up to `limit` chunks, stops the moment the provider
 * starts refusing, and resumes on the next run. A large backlog heals over
 * several days instead of failing in one burst.
 */

// The hosted provider is quota-bound (~1k requests/day shared with live
// chat), so it gets a trickle that leaves headroom and resumes next run.
// The local model has no quota at all and runs at ~17ms per embedding, so
// capping it would be self-inflicted: a full 7,308-chunk corpus completes
// in roughly two minutes, versus ten days at the hosted batch size.
const DEFAULT_LIMIT = config.embeddingProvider === "local" ? 50_000 : 800;

/** Chunks still needing a real, current-dimension embedding. */
export function countPendingChunks(expectedDim) {
  return db.prepare(`
    SELECT COUNT(*) AS n FROM knowledge_chunks
    WHERE embedding IS NULL OR embedding = '' OR json_array_length(embedding) != ?
  `).get(expectedDim).n;
}

/**
 * @param {Object} options
 * @param {number} options.limit - Max chunks to repair this run.
 * @returns {Promise<{expectedDim: number|null, repaired: number, failed: number, remaining: number, stoppedEarly: boolean, reason?: string}>}
 */
export async function backfillEmbeddings({ limit = DEFAULT_LIMIT } = {}) {
  // Probe the provider for the dimension it currently returns. Doubles as a
  // liveness check: if this isn't a real embedding, the provider is down or
  // out of quota and the whole run would just write nulls over nulls.
  const probe = await getEmbedding("dimension probe", "RETRIEVAL_DOCUMENT");
  if (!probe.isReal || !probe.vector?.length) {
    console.warn("[EmbeddingBackfill] Embedding provider unavailable — skipping this run.");
    return { expectedDim: null, repaired: 0, failed: 0, remaining: -1, stoppedEarly: true, reason: "provider_unavailable" };
  }
  const expectedDim = probe.vector.length;

  const pendingBefore = countPendingChunks(expectedDim);
  if (pendingBefore === 0) return { expectedDim, repaired: 0, failed: 0, remaining: 0, stoppedEarly: false };

  const candidates = db.prepare(`
    SELECT id, content FROM knowledge_chunks
    WHERE embedding IS NULL OR embedding = '' OR json_array_length(embedding) != ?
    LIMIT ?
  `).all(expectedDim, limit);

  const update = db.prepare("UPDATE knowledge_chunks SET embedding = ? WHERE id = ?");

  let repaired = 0;
  let failed = 0;
  let stoppedEarly = false;
  let reason;

  console.log(`[EmbeddingBackfill] ${pendingBefore} chunk(s) need a ${expectedDim}-dim embedding; repairing up to ${candidates.length} this run.`);

  for (const chunk of candidates) {
    let stored;
    try {
      stored = await getStorableEmbedding(chunk.content);
    } catch (err) {
      stored = null;
      reason = String(err?.message || "").slice(0, 200);
    }

    if (!stored) {
      failed++;
      // Two consecutive refusals means the provider is out of quota rather
      // than one chunk being awkward. Stop instead of burning the rest of
      // the batch on calls that will all fail the same way; the remaining
      // chunks keep their null and get picked up next run.
      if (failed >= 2) {
        stoppedEarly = true;
        reason = reason || "provider_refusing";
        break;
      }
      continue;
    }

    update.run(stored, chunk.id);
    repaired++;
  }

  const remaining = countPendingChunks(expectedDim);
  const summary = `[EmbeddingBackfill] repaired ${repaired}, failed ${failed}, ${remaining} still pending${stoppedEarly ? ` (stopped early: ${reason})` : ""}.`;
  if (stoppedEarly) console.warn(summary);
  else console.log(summary);

  return { expectedDim, repaired, failed, remaining, stoppedEarly, reason };
}
