/**
 * In-memory rate limiter.
 * Sufficient for single-instance dev/MVP deployments.
 * Replace with Redis-based solution (upstash/ratelimit) for multi-instance production.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPrune = Date.now();

function pruneStale(windowMs: number) {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > windowMs) store.delete(key);
  }
}

/**
 * @param identifier  Unique key (e.g. IP + route)
 * @param limit       Max requests per window
 * @param windowMs    Window duration in milliseconds
 * @returns           { limited: boolean; remaining: number }
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number } {
  pruneStale(windowMs);

  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || now - existing.windowStart > windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return { limited: false, remaining: limit - 1 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return { limited: existing.count > limit, remaining };
}
