/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based solutions like @upstash/ratelimit
 */

interface RateLimitConfig {
  /** Max requests in the time window */
  limit: number;
  /** Time window in seconds */
  windowSec: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // Reset window if expired
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowSec * 1000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  // Within window
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
