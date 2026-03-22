/**
 * Rate Limit Configuration
 *
 * GOVERNANCE COMPLIANCE:
 * - Phase R4.3 - Rate Limiting Implementation
 * - Uses TokenBucketLimiter for enforcement
 * - Environment-based configuration
 *
 * Features:
 * - PUBLIC endpoints: 60 requests/minute
 * - AUTHENTICATED endpoints: 300 requests/minute
 * - ADMIN endpoints: 600 requests/minute
 * - AUTH endpoints: 10 requests/minute (brute force protection)
 * - SEARCH endpoints: 100 requests/minute
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.3 - Rate Limiting Implementation
 */

export interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per second
  windowMs: number;       // Time window in milliseconds (for display purposes)
}

/**
 * Rate Limit Tiers
 * Configured per endpoint type for optimal security and performance
 */
export const RATE_LIMITS = {
  /**
   * PUBLIC - Endpoints without authentication
   * 60 requests per minute
   * Use for: /api/listings, /api/categories/hierarchy
   */
  PUBLIC: {
    maxTokens: 60,
    refillRate: 60 / 60, // 1 token per second
    windowMs: 60000 // 1 minute
  } as RateLimitConfig,

  /**
   * AUTHENTICATED - Endpoints requiring user authentication
   * 300 requests per minute
   * Use for: /api/my-listings, /api/subscriptions
   */
  AUTHENTICATED: {
    maxTokens: 300,
    refillRate: 300 / 60, // 5 tokens per second
    windowMs: 60000 // 1 minute
  } as RateLimitConfig,

  /**
   * ADMIN - Admin-only endpoints
   * 600 requests per minute
   * Use for: /api/admin/*
   */
  ADMIN: {
    maxTokens: 600,
    refillRate: 600 / 60, // 10 tokens per second
    windowMs: 60000 // 1 minute
  } as RateLimitConfig,

  /**
   * AUTH - Authentication endpoints (stricter limits)
   * 10 requests per minute (prevents brute force attacks)
   * Use for: /api/auth/login, /api/auth/register
   */
  AUTH: {
    maxTokens: 10,
    refillRate: 10 / 60, // ~0.17 tokens per second
    windowMs: 60000 // 1 minute
  } as RateLimitConfig,

  /**
   * SEARCH - Search and filter endpoints
   * 100 requests per minute
   * Use for: /api/listings/search
   */
  SEARCH: {
    maxTokens: 100,
    refillRate: 100 / 60, // ~1.67 tokens per second
    windowMs: 60000 // 1 minute
  } as RateLimitConfig,

  /**
   * BIZWIRE - BizWire contact messaging endpoints
   * 10 requests per hour (prevents message spam)
   * Use for: /api/listings/[id]/bizwire POST, /api/listings/[id]/bizwire/[threadId]/reply POST
   */
  BIZWIRE: {
    maxTokens: 10,
    refillRate: 10 / 3600,
    windowMs: 3600000
  } as RateLimitConfig
} as const;
