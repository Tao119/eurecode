/**
 * Rate limiter with Redis support for production scalability
 * Falls back to in-memory for development or when Redis is unavailable
 */

import { Redis } from "@upstash/redis";

interface RateLimitConfig {
  /** Max requests in the time window */
  limit: number;
  /** Time window in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// Initialize Redis client if configured
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      redis = new Redis({ url, token });
      return redis;
    } catch {
      console.warn("Failed to initialize Redis, falling back to in-memory rate limiting");
    }
  }
  return null;
}

// In-memory fallback store
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute (for in-memory store)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);
}

/**
 * Check rate limit using in-memory store
 */
function checkMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  // Reset window if expired
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowSec * 1000;
    memoryStore.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  // Within window - check limit
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check rate limit using Redis (sliding window log algorithm)
 */
async function checkRedisRateLimit(
  redis: Redis,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  const windowStart = now - windowMs;
  const key = `ratelimit:${identifier}`;

  // Use a pipeline for atomic operations
  const pipeline = redis.pipeline();

  // Remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count current entries in the window
  pipeline.zcard(key);

  // Add the current request with timestamp as score
  pipeline.zadd(key, { score: now, member: `${now}:${Math.random()}` });

  // Set expiry on the key
  pipeline.expire(key, config.windowSec + 1);

  const results = await pipeline.exec();
  const currentCount = (results[1] as number) || 0;

  const resetAt = now + windowMs;

  if (currentCount >= config.limit) {
    // Over limit - remove the entry we just added
    await redis.zremrangebyscore(key, now, now);
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: Math.max(0, config.limit - currentCount - 1),
    resetAt,
  };
}

/**
 * Check rate limit for a given identifier
 * Uses Redis if available, falls back to in-memory
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redisClient = getRedisClient();

  if (redisClient) {
    try {
      return await checkRedisRateLimit(redisClient, identifier, config);
    } catch (error) {
      console.warn("Redis rate limit check failed, using memory fallback:", error);
    }
  }

  return checkMemoryRateLimit(identifier, config);
}

/**
 * Synchronous rate limit check (in-memory only)
 * Use this when you need a sync check and Redis isn't critical
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkMemoryRateLimit(identifier, config);
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  /** Chat API - 60 requests per minute */
  chat: (userId: string) =>
    checkRateLimit(`chat:${userId}`, { limit: 60, windowSec: 60 }),

  /** Learning creation - 30 per minute */
  learning: (userId: string) =>
    checkRateLimit(`learning:${userId}`, { limit: 30, windowSec: 60 }),

  /** Conversation creation - 20 per minute */
  conversation: (userId: string) =>
    checkRateLimit(`conversation:${userId}`, { limit: 20, windowSec: 60 }),

  /** API general - 100 requests per minute */
  api: (userId: string) =>
    checkRateLimit(`api:${userId}`, { limit: 100, windowSec: 60 }),

  /** Auth attempts - 5 per minute */
  auth: (identifier: string) =>
    checkRateLimit(`auth:${identifier}`, { limit: 5, windowSec: 60 }),

  /** Admin operations - 30 per minute */
  admin: (userId: string) =>
    checkRateLimit(`admin:${userId}`, { limit: 30, windowSec: 60 }),
};

/**
 * Synchronous rate limiters (in-memory only)
 */
export const rateLimitersSync = {
  chat: (userId: string) =>
    checkRateLimitSync(`chat:${userId}`, { limit: 60, windowSec: 60 }),

  learning: (userId: string) =>
    checkRateLimitSync(`learning:${userId}`, { limit: 30, windowSec: 60 }),

  conversation: (userId: string) =>
    checkRateLimitSync(`conversation:${userId}`, { limit: 20, windowSec: 60 }),

  api: (userId: string) =>
    checkRateLimitSync(`api:${userId}`, { limit: 100, windowSec: 60 }),

  auth: (identifier: string) =>
    checkRateLimitSync(`auth:${identifier}`, { limit: 5, windowSec: 60 }),

  admin: (userId: string) =>
    checkRateLimitSync(`admin:${userId}`, { limit: 30, windowSec: 60 }),
};

/**
 * Create rate limit headers for HTTP response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}

/**
 * Create a rate limit error response
 */
export function rateLimitErrorResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "リクエスト制限を超えました。しばらく待ってから再試行してください。",
        retryAfter,
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...rateLimitHeaders(result),
      },
    }
  );
}
