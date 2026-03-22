/**
 * Rate Limit Middleware - API route rate limiting
 *
 * GOVERNANCE COMPLIANCE:
 * - Phase R4.3 - Rate Limiting Implementation
 * - Uses TokenBucketLimiter for enforcement
 * - Next.js 14 App Router middleware pattern
 * - OSI Layer 7 (Application Layer) rate limiting
 *
 * Features:
 * - Per-IP rate limiting
 * - Configurable limits per endpoint type
 * - 429 Too Many Requests response
 * - Retry-After header
 * - Custom key generation (IP + user-specific)
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.3 - Rate Limiting Implementation
 * @tier STANDARD
 */

import { NextRequest, NextResponse } from 'next/server';
import { TokenBucketLimiter, MemoryLimiterStore } from '@core/services/rate/TokenBucketLimiter';
import { RateLimitConfig } from '@core/config/rateLimits';

/**
 * Rate limiter instances (in-memory storage)
 * In production, consider using Redis for distributed rate limiting
 */
const limiters = new Map<string, TokenBucketLimiter>();
const store = new MemoryLimiterStore();

/**
 * Get or create rate limiter for endpoint
 */
function getLimiter(endpoint: string, config: RateLimitConfig): TokenBucketLimiter {
  const key = `${endpoint}:${config.maxTokens}:${config.windowMs}`;

  if (!limiters.has(key)) {
    limiters.set(key, new TokenBucketLimiter(store, config));
  }

  return limiters.get(key)!;
}

/**
 * Get client identifier (IP address or custom key)
 */
function getClientKey(req: NextRequest, keyGenerator?: (req: NextRequest) => string): string {
  if (keyGenerator) {
    return keyGenerator(req);
  }

  // Extract IP from headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() || 'unknown' : realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Rate Limit Middleware Factory
 *
 * @param config - Rate limit configuration
 * @param keyGenerator - Optional custom key generator (e.g., combine IP + email)
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { RATE_LIMITS } from '@core/config/rateLimits';
 * import { rateLimitMiddleware } from '@core/middleware/rateLimitMiddleware';
 *
 * export async function GET(request: NextRequest) {
 *   // Apply rate limiting
 *   const rateLimitResponse = await rateLimitMiddleware(RATE_LIMITS.PUBLIC)(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Handler logic
 *   return NextResponse.json({ data: 'success' });
 * }
 * ```
 *
 * @example Custom key generator for auth endpoints
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await rateLimitMiddleware(
 *     RATE_LIMITS.AUTH,
 *     (req) => {
 *       const body = await req.json();
 *       const ip = req.headers.get('x-forwarded-for') || 'unknown';
 *       return `${ip}:${body.email}`; // Rate limit per IP + email
 *     }
 *   )(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Handler logic
 * }
 * ```
 */
export function rateLimitMiddleware(
  config: RateLimitConfig,
  keyGenerator?: (req: NextRequest) => string
) {
  return async function middleware(req: NextRequest): Promise<NextResponse | null> {
    const endpoint = req.nextUrl.pathname;
    const limiter = getLimiter(endpoint, config);
    const clientKey = getClientKey(req, keyGenerator);

    // Check rate limit
    const allowed = await limiter.isAllowed(clientKey);

    if (!allowed) {
      // Rate limit exceeded - return 429 response
      const retryAfter = Math.ceil(1 / config.refillRate); // Time to get 1 token (in seconds)

      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxTokens.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
          }
        }
      );
    }

    // Request allowed - return null to proceed
    return null;
  };
}

/**
 * Get rate limit headers for successful responses (optional)
 * Call this to add rate limit information to your API responses
 *
 * @example
 * ```typescript
 * const response = NextResponse.json({ data });
 * const headers = await getRateLimitHeaders(request, RATE_LIMITS.PUBLIC);
 * headers.forEach((value, key) => response.headers.set(key, value));
 * return response;
 * ```
 */
export async function getRateLimitHeaders(
  req: NextRequest,
  config: RateLimitConfig,
  keyGenerator?: (req: NextRequest) => string
): Promise<Headers> {
  const headers = new Headers();
  const endpoint = req.nextUrl.pathname;
  const limiter = getLimiter(endpoint, config);
  const clientKey = getClientKey(req, keyGenerator);

  const state = await limiter.getState(clientKey);

  if (state) {
    headers.set('X-RateLimit-Limit', config.maxTokens.toString());
    headers.set('X-RateLimit-Remaining', Math.floor(state.tokens).toString());
    headers.set('X-RateLimit-Reset', new Date(state.lastRefill + config.windowMs).toISOString());
  }

  return headers;
}
