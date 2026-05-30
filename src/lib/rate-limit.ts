import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const upstashLimiters = new Map<string, Ratelimit>();

const MAX_BUCKETS = 5000;

function pruneIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

function getUpstashLimiter(limit: number, windowMs: number, prefix: string): Ratelimit | null {
  const url = import.meta.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const key = `${prefix}:${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (limiter) return limiter;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: `sdcj:${prefix}`,
  });
  upstashLimiters.set(key, limiter);
  return limiter;
}

/**
 * Fenêtre fixe en mémoire (instance Node unique).
 * Si UPSTASH_REDIS_REST_* est configuré, utilise Redis (Vercel multi-instance).
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  pruneIfNeeded();
  const now = Date.now();
  let b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
  prefix = "rl",
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(limit, windowMs, prefix);
  if (upstash) {
    try {
      const { success, reset } = await upstash.limit(key);
      if (!success) {
        return {
          ok: false,
          retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
        };
      }
      return { ok: true };
    } catch (e) {
      console.error("[rate-limit] Upstash indisponible, repli mémoire:", e);
    }
  }
  return rateLimit(key, limit, windowMs);
}
