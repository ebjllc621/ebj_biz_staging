/**
 * Rate Limiting Constants and Configuration
 *
 * Defines rate limiting policies for different endpoints and backoff parameters.
 * Three-dimensional rate limiting: per-IP, per-account, and global buckets.
 */

/**
 * Rate limiting configuration for different endpoints
 * Each endpoint has three dimensions: per-IP, per-account, and global limits
 */
export const LIMITS = {
  /**
   * Login endpoint rate limits
   * - Per-IP: 10 attempts per minute (prevents IP-based brute force)
   * - Per-Account: 5 attempts per 5 minutes (prevents credential stuffing)
   * - Global: 500 attempts per minute (prevents system overload)
   */
  login: {
    perIP: { limit: 10, windowSec: 60 },
    perAccount: { limit: 5, windowSec: 300 },
    global: { limit: 500, windowSec: 60 }
  },

  /**
   * Resend verification email rate limits
   * - Per-IP: 5 attempts per hour (prevents email spam from IP)
   * - Per-Account: 3 attempts per hour (prevents email spam to account)
   * - Global: 200 attempts per minute (prevents system email overload)
   */
  resend: {
    perIP: { limit: 5, windowSec: 3600 },
    perAccount: { limit: 3, windowSec: 3600 },
    global: { limit: 200, windowSec: 60 }
  }
} as const;

/**
 * Exponential backoff configuration
 * Used to calculate retry-after delays for rate limited requests
 */
export const BACKOFF = {
  /** Base delay in seconds for first violation */
  baseSec: 10,
  /** Exponential factor for subsequent violations */
  factor: 2,
  /** Maximum backoff delay in seconds (1 hour) */
  maxSec: 3600
} as const;

/**
 * Rate limiting bucket key prefixes
 * Used to namespace different types of rate limits
 */
export const KEY_PREFIXES = {
  LOGIN_IP: 'login:ip:',
  LOGIN_ACCOUNT: 'login:acct:',
  LOGIN_GLOBAL: 'login:global',
  RESEND_IP: 'resend:ip:',
  RESEND_ACCOUNT: 'resend:acct:',
  RESEND_GLOBAL: 'resend:global'
} as const;

/**
 * HTTP status codes and headers used in rate limiting
 */
export const HTTP_RATE_LIMIT = {
  /** HTTP 429 Too Many Requests status code */
  TOO_MANY_REQUESTS: 429,
  /** Retry-After header name */
  RETRY_AFTER_HEADER: 'retry-after',
  /** Content-Type for JSON responses */
  CONTENT_TYPE_JSON: 'application/json; charset=utf-8'
} as const;

/**
 * Standard rate limiting error response
 */
export const RATE_LIMIT_ERROR = {
  code: 'RATE_LIMITED',
  message: 'Please try again later.'
} as const;