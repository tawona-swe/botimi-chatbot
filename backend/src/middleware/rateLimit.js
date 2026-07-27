import rateLimit from "express-rate-limit";

/**
 * General API rate limiter.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

/**
 * Stricter rate limiter for auth endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

/**
 * Rate limiter for chat endpoint — per vendor.
 */
export function chatRateLimiter(req, res, next) {
  const vendorId = req.vendor?.id || req.body?.apiKey || "anonymous";

  // Simple in-memory rate limiting (would use Redis in production)
  if (!global._chatRateMap) {
    global._chatRateMap = new Map();
  }

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30; // Groq free tier limit

  const record = global._chatRateMap.get(vendorId) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  global._chatRateMap.set(vendorId, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please try again in a minute.",
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
  }

  next();
}
