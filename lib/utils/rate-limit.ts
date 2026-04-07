// ============================================================
// lib/utils/rate-limit.ts
// Token-bucket rate limiter backed by an in-memory Map.
// Swap the store for Redis (Upstash) in production.
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms
}

// In-memory store (single instance per process).
// For multi-instance production: use Upstash Redis.
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Maximum requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment the rate limit counter for a given key.
 *
 * @param key       - Unique identifier (IP address, user ID, etc.)
 * @param config    - Limit & window configuration
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = { limit: 10, windowMs: 60_000 }
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry or window has expired, create fresh entry
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, newEntry);

    // Clean up expired keys every ~1000 new entries to prevent memory leak
    if (store.size % 1000 === 0) {
      cleanupExpired(now);
    }

    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Window is still active
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

function cleanupExpired(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}
