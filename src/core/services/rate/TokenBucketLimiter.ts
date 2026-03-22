/**
 * TokenBucketLimiter - Token Bucket Rate Limiting Service
 *
 * @authority PHASE_2.4_BRAIN_PLAN.md (Supporting Services - Task 2.6)
 * @governance Build Map v2.1 ENHANCED - STANDARD tier
 * @governance Service Architecture v2.0 compliance
 * @tier STANDARD - Token bucket algorithm with dual stores
 *
 * PURPOSE:
 * - Token bucket rate limiting algorithm
 * - In-memory store for development
 * - Redis store for production
 * - Configurable limits per endpoint
 * - Next.js middleware integration
 *
 * PHASE 2.4 IMPLEMENTATION:
 * - Token bucket algorithm with automatic refill
 * - Memory-based and Redis-based stores
 * - Rate limit middleware for API routes
 * - Environment-based configuration
 *
 * USAGE:
 * ```typescript
 * const limiter = new TokenBucketLimiter(store, config);
 * const allowed = await limiter.isAllowed('user:123');
 * ```
 */

// GOVERNANCE: Token bucket rate limiting algorithm
// GOVERNANCE: In-memory store for development, Redis for production

/**
 * Storage backend interface for rate limiter
 * GOVERNANCE: Abstraction for pluggable storage (memory/Redis)
 */
export interface LimiterStore {
  get(key: string): Promise<{ tokens: number; lastRefill: number } | null>;
  set(key: string, value: { tokens: number; lastRefill: number }): Promise<void>;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per second
  windowMs: number;       // Time window in milliseconds (for display purposes)
}

/**
 * TokenBucketLimiter - Rate limiting service using token bucket algorithm
 * GOVERNANCE: Prevents API abuse using token bucket algorithm
 * GOVERNANCE: Supports in-memory (dev) and Redis (prod) stores
 *
 * @tier STANDARD - Token bucket algorithm with dual store support
 * @complexity 200-300 lines, dual storage backends
 */
export class TokenBucketLimiter {
  private store: LimiterStore;
  private config: RateLimitConfig;

  constructor(store: LimiterStore, config: RateLimitConfig) {
    this.store = store;
    this.config = config;
  }

  /**
   * Check if request is allowed (consume 1 token)
   * GOVERNANCE: Token bucket algorithm with automatic refill
   *
   * @param key - Unique identifier for rate limit bucket
   * @returns true if request allowed, false if rate limited
   */
  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();

    // Get current bucket state
    let bucket = await this.store.get(key);

    if (!bucket) {
      // Initialize new bucket (consume first token)
      bucket = {
        tokens: this.config.maxTokens - 1,
        lastRefill: now
      };
      await this.store.set(key, bucket);
      return true;
    }

    // Calculate tokens to add based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.config.refillRate;

    // Update bucket with refilled tokens (capped at max)
    bucket.tokens = Math.min(
      this.config.maxTokens,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;

    // Check if request allowed (need at least 1 token)
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      await this.store.set(key, bucket);
      return true;
    }

    // Rate limit exceeded
    await this.store.set(key, bucket);
    return false;
  }

  /**
   * Get current bucket state (for debugging)
   * GOVERNANCE: Inspection method for monitoring
   *
   * @param key - Bucket key to inspect
   * @returns Current bucket state or null if not found
   */
  async getState(key: string): Promise<{ tokens: number; lastRefill: number } | null> {
    return await this.store.get(key);
  }

  /**
   * Reset bucket to max tokens (for testing)
   * GOVERNANCE: Administrative method for testing/debugging
   *
   * @param key - Bucket key to reset
   */
  async reset(key: string): Promise<void> {
    await this.store.set(key, {
      tokens: this.config.maxTokens,
      lastRefill: Date.now()
    });
  }

  /**
   * Get configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

/**
 * In-Memory Store (Development)
 * GOVERNANCE: Development and testing environment
 */
export class MemoryLimiterStore implements LimiterStore {
  private store: Map<string, { tokens: number; lastRefill: number }> = new Map();

  async get(key: string): Promise<{ tokens: number; lastRefill: number } | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: { tokens: number; lastRefill: number }): Promise<void> {
    this.store.set(key, value);
  }

  /**
   * Clear all buckets (for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get bucket count (for debugging)
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Redis Store (Production)
 * GOVERNANCE: Production environment with persistence
 */
export class RedisLimiterStore implements LimiterStore {
  private client: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  };

  constructor(redisClient: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  }) {
    this.client = redisClient;
  }

  async get(key: string): Promise<{ tokens: number; lastRefill: number } | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: { tokens: number; lastRefill: number }): Promise<void> {
    try {
      // Set with 1 hour TTL to prevent memory leaks
      await this.client.set(key, JSON.stringify(value), 'EX', 3600);
    } catch (error) {
      // Don't throw - allow graceful degradation
    }
  }
}

/**
 * Rate Limit Middleware for Next.js API routes
 * GOVERNANCE: Next.js 14 App Router middleware integration
 *
 * @param limiter - TokenBucketLimiter instance
 * @returns Middleware function
 */
export function createRateLimitMiddleware(limiter: TokenBucketLimiter) {
  return async (request: Request): Promise<Response | null> => {
    // Extract IP address from request headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Create rate limit key
    const key = `rate_limit:${ip}`;

    // Check rate limit
    const allowed = await limiter.isAllowed(key);

    if (!allowed) {
      // Rate limit exceeded - return 429 response
      const config = limiter.getConfig();
      const retryAfter = Math.ceil(1 / config.refillRate); // Time to get 1 token

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxTokens.toString(),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    // Request allowed - return null to proceed
    return null;
  };
}

/**
 * Create rate limiter with environment-based configuration
 * GOVERNANCE: Factory function for consistent instantiation
 *
 * @param store - Optional store (defaults to memory)
 * @param config - Optional config (defaults from env)
 * @returns Configured TokenBucketLimiter instance
 */
export function createRateLimiter(
  store?: LimiterStore,
  config?: Partial<RateLimitConfig>
): TokenBucketLimiter {
  // Use memory store by default
  const limiterStore = store || new MemoryLimiterStore();

  // Default configuration (can be overridden by env vars)
  const defaultConfig: RateLimitConfig = {
    maxTokens: parseInt(process.env.RATE_LIMIT_MAX_TOKENS || '10'),
    refillRate: parseFloat(process.env.RATE_LIMIT_REFILL_RATE || '1'), // tokens per second
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') // 1 minute
  };

  const finalConfig = { ...defaultConfig, ...config };

  return new TokenBucketLimiter(limiterStore, finalConfig);
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  AUTH_STRICT: {
    maxTokens: 5,
    refillRate: 5 / (15 * 60), // 5 tokens over 15 minutes
    windowMs: 15 * 60 * 1000
  },

  /**
   * Moderate rate limit for login attempts
   * 10 requests per 15 minutes
   */
  AUTH_MODERATE: {
    maxTokens: 10,
    refillRate: 10 / (15 * 60), // 10 tokens over 15 minutes
    windowMs: 15 * 60 * 1000
  },

  /**
   * Relaxed rate limit for password reset
   * 3 requests per hour
   */
  PASSWORD_RESET: {
    maxTokens: 3,
    refillRate: 3 / (60 * 60), // 3 tokens over 1 hour
    windowMs: 60 * 60 * 1000
  },

  /**
   * General API rate limit
   * 100 requests per minute
   */
  API_GENERAL: {
    maxTokens: 100,
    refillRate: 100 / 60, // 100 tokens per minute
    windowMs: 60 * 1000
  }
} as const;

/**
 * Export singleton instances (optional - for convenience)
 */
let memoryStoreInstance: MemoryLimiterStore | null = null;

export function getMemoryStore(): MemoryLimiterStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = new MemoryLimiterStore();
  }
  return memoryStoreInstance;
}
