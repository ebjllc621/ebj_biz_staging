/**
 * Rate Limiting Service Exports
 *
 * Centralized exports for AUTH-P2-2A rate limiting implementation.
 * Provides clean interface for importing rate limiting functionality.
 * Phase 3: Import types before use to fix type errors
 */

// Import types for internal use
import type {
  RateKey,
  RateKeyKind,
  RateDecision,
  RateBucket,
  AccountLockout,
  CaptchaHook,
  RateLimiterConfig
} from './RateLimiter';

// Core RateLimiter implementation
export { RateLimiter } from './RateLimiter';

// Interfaces and types
export type {
  IRateLimiter,
  RateKey,
  RateKeyKind,
  RateDecision,
  RateBucket,
  AccountLockout,
  CaptchaHook,
  RateLimiterConfig
} from './RateLimiter';

// Default rate limiting configurations
export const DEFAULT_RATE_BUCKETS = {
  ip: {
    maxAttempts: 10,           // 10 attempts per IP
    windowSec: 300,            // 5 minute window
    lockoutDurationSec: 900    // 15 minute base lockout
  },
  account: {
    maxAttempts: 5,            // 5 attempts per account
    windowSec: 300,            // 5 minute window
    lockoutDurationSec: 1800   // 30 minute base lockout
  },
  global: {
    maxAttempts: 100,          // 100 attempts globally
    windowSec: 60,             // 1 minute window
    lockoutDurationSec: 300    // 5 minute base lockout
  }
} as const;

// Rate limiting error codes
export const RATE_LIMIT_ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED'
} as const;

export type RateLimitErrorCode = keyof typeof RATE_LIMIT_ERROR_CODES;

// Utility functions for rate limiting
export class RateLimitUtils {
  /**
   * Create rate key for IP-based limiting
   */
  static createIPKey(ipAddress: string): RateKey {
    return { kind: 'ip', id: ipAddress };
  }

  /**
   * Create rate key for account-based limiting
   */
  static createAccountKey(userId: string): RateKey {
    return { kind: 'account', id: userId };
  }

  /**
   * Create rate key for global limiting
   */
  static createGlobalKey(): RateKey {
    return { kind: 'global' };
  }

  /**
   * Format retry-after header value
   */
  static formatRetryAfter(seconds: number): string {
    return Math.ceil(seconds).toString();
  }

  /**
   * Calculate exponential backoff delay
   */
  static calculateBackoff(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 300000); // Cap at 5 minutes
  }

  /**
   * Check if error is rate limiting related
   */
  static isRateLimitError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const validCodes = Object.values(RATE_LIMIT_ERROR_CODES) as string[];
    return Boolean(code && validCodes.includes(code));
  }
}

// HTTP headers for rate limiting
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After'
} as const;

/**
 * Rate limiting response headers
 */
export interface RateLimitHeaders {
  [RATE_LIMIT_HEADERS.LIMIT]?: string;
  [RATE_LIMIT_HEADERS.REMAINING]?: string;
  [RATE_LIMIT_HEADERS.RESET]?: string;
  [RATE_LIMIT_HEADERS.RETRY_AFTER]?: string;
}

/**
 * Create rate limiting headers from decision
 */
export function createRateLimitHeaders(
  decision: RateDecision,
  bucket: RateBucket
): RateLimitHeaders {
  const headers: RateLimitHeaders = {};

  headers[RATE_LIMIT_HEADERS.LIMIT] = bucket.maxAttempts.toString();

  if (decision.remainingAttempts !== undefined) {
    headers[RATE_LIMIT_HEADERS.REMAINING] = decision.remainingAttempts.toString();
  }

  if (decision.resetTime) {
    headers[RATE_LIMIT_HEADERS.RESET] = Math.floor(decision.resetTime.getTime() / 1000).toString();
  }

  if (decision.retryAfterSec) {
    headers[RATE_LIMIT_HEADERS.RETRY_AFTER] = RateLimitUtils.formatRetryAfter(decision.retryAfterSec);
  }

  return headers;
}