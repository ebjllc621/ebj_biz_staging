/**
 * Rate Limiting Feature - Public API
 *
 * Phase 2 cleanup: Removed competing implementations (limiter.ts, memoryStore.ts)
 * Phase 3C: Updated to re-export from canonical src/core/services/rate/
 *
 * Provides comprehensive rate limiting for authentication endpoints
 * with three-dimensional limiting (per-IP, per-account, global)
 * and exponential backoff.
 */

// Re-export canonical implementations only
export { RateLimiter, type IRateLimiter, type LimiterStore } from '@/core/services/rate/RateLimiter';
export { MemoryLimiterStore } from '@/core/services/rate/MemoryLimiterStore';
export { RedisLimiterStore } from './redisStore';

// Constants
export { LIMITS, BACKOFF, KEY_PREFIXES, HTTP_RATE_LIMIT, RATE_LIMIT_ERROR } from './constants';

// Remove the createRateLimiter factory - use AuthServiceRegistry instead