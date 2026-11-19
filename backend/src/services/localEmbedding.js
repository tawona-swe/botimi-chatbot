import path from "node:path";
import { pipeline, env } from "@huggingface/transformers";
import config from "../config.js";

/**
 * Embeddings computed in-process, on this server's own CPU.
 *
 * Replaces the hosted embedding API as the default. The motivation is not
 * cost alone -- it is that a hosted free tier is a moving target. Over a
 * single day this project hit an expired key, four model slugs retired out
 * of a free tier, a stale model id, and an exhausted daily quota. A model
 * file sitting on local disk cannot expire, rotate, rate-limit, or bill.
 *
 * It is also simply faster for this workload: ~17ms per embedding with no
 * network hop, versus a round trip to a hosted API, and a full re-embed of
 * the production corpus (7,308 chunks) takes about two minutes instead of
 * roughly eight days of trickling inside a 1k/day quota.
 *
 * Model: BGE small v1.5, 384 dimensions. Chosen over MiniLM for retrieval
 * quality at the same dimensionality and a comparable footprint. It is an
 * asymmetric model -- queries are meant to carry a prefix that passages do
 * not -- which maps onto the RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT task
 * types the callers already pass. Skipping that prefix measurably weakens
 * question-to-passage matching, the same failure the Gemini taskType
 * comment in gemini.js documents.
 */

const MODEL_ID = "Xenova/bge-small-en-v1.5";

// BGE v1.5's documented query instruction. Passages are embedded bare.
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

// Cache into the same persistent volume the database lives on, so the
// ~130MB download happens once for the lifetime of the volume rather than
// on every container rebuild.
env.cacheDir = path.join(path.dirname(config.db.path), "models");

let extractorPromise = null;

/**
 * Loads the model once per process. Callers share the same promise, so a
 * cold start blocks whoever arrives first rather than kicking off parallel
 * downloads; warmUp() at boot means that is normally nobody.
 */
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID).catch((err) => {
      // Don't cache a rejected promise -- otherwise one transient failure
      // (e.g. no network on the very first download) would permanently
      // disable embeddings for the life of the process.
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/**
 * Load the model ahead of first use. Fire-and-forget at startup: the first
 * download takes a couple of minutes, and without this the first visitor
 * after a fresh deploy would be the one waiting for it.
 */
export async function warmUp() {
  const started = Date.now();
  try {
    await getExtractor();
    console.log(`[LocalEmbedding] ${MODEL_ID} ready in ${Date.now() - started}ms (cache: ${env.cacheDir})`);
    return true;
  } catch (err) {
    console.error(`[LocalEmbedding] Failed to load ${MODEL_ID}:`, err?.message);
    return false;
  }
}

/**
 * @param {string} text
 * @param {string} taskType - RETRIEVAL_QUERY or RETRIEVAL_DOCUMENT
 * @returns {Promise<number[]>} A 384-dim normalized vector.
 */
export async function embed(text, taskType = "RETRIEVAL_DOCUMENT") {
  const extractor = await getExtractor();
  const input = taskType === "RETRIEVAL_QUERY" ? QUERY_PREFIX + text : text;
  const output = await extractor(input, { pooling: "cls", normalize: true });
  return Array.from(output.data);
}

export { MODEL_ID };
