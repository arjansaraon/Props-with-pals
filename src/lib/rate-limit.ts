/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Note: This works for single-instance deployments. For multi-instance
 * production (e.g., Vercel with multiple serverless functions), consider
 * using Upstash Redis rate limiting: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = rateLimitStore.get(key);

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Increment count
  entry.count += 1;

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request.
 * Uses X-Forwarded-For header (for proxied requests) or falls back to a default.
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (works behind proxies like Vercel, Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for development/local
  return 'localhost';
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
  // General API requests: 100 requests per minute
  api: { limit: 100, windowSeconds: 60 },

  // Authentication/sensitive operations: 10 requests per minute
  auth: { limit: 10, windowSeconds: 60 },

  // Pool creation: 5 per minute (prevent spam)
  createPool: { limit: 5, windowSeconds: 60 },

  // Join pool: 20 per minute
  joinPool: { limit: 20, windowSeconds: 60 },
} as const;
