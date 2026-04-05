import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  /** Maximum burst tokens */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Window (ms) after which idle entries are pruned */
  pruneAfter: number;
}

/**
 * In-memory token-bucket rate limiter keyed by IP.
 * Returns an Express middleware that responds 429 when the bucket is empty.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const buckets = new Map<string, RateLimitEntry>();

  // Prune stale entries periodically to avoid unbounded memory growth.
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now - entry.lastRefill > options.pruneAfter) {
        buckets.delete(key);
      }
    }
  }, options.pruneAfter);
  pruneInterval.unref();

  return (request: Request, response: Response, next: NextFunction): void => {
    const ip = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const now = Date.now();

    let entry = buckets.get(ip);

    if (!entry) {
      entry = { tokens: options.maxTokens, lastRefill: now };
      buckets.set(ip, entry);
    }

    // Refill tokens based on elapsed time.
    const elapsed = (now - entry.lastRefill) / 1000;
    entry.tokens = Math.min(options.maxTokens, entry.tokens + elapsed * options.refillRate);
    entry.lastRefill = now;

    if (entry.tokens < 1) {
      const retryAfter = Math.ceil((1 - entry.tokens) / options.refillRate);
      response.set("Retry-After", String(retryAfter));
      response.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later."
      });
      return;
    }

    entry.tokens -= 1;
    next();
  };
};
