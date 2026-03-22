/**
 * TokenBucketLimiter Test Suite
 *
 * @authority PHASE_2.4_BRAIN_PLAN.md (Supporting Services - Task 2.6)
 * @governance Build Map v2.1 ENHANCED - Test coverage 70%+
 * @test_target src/core/services/rate/TokenBucketLimiter.ts
 *
 * TEST OBJECTIVES:
 * - Verify token bucket algorithm implementation
 * - Verify token refill over time
 * - Verify max tokens limit enforcement
 * - Verify separate keys handled independently
 * - Verify in-memory store functionality
 * - Verify rate limit middleware
 *
 * COVERAGE TARGET: 70%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TokenBucketLimiter,
  MemoryLimiterStore,
  RedisLimiterStore,
  createRateLimitMiddleware,
  createRateLimiter,
  RateLimitPresets,
  LimiterStore,
  RateLimitConfig
} from '../TokenBucketLimiter';

describe('TokenBucketLimiter', () => {
  let store: MemoryLimiterStore;
  let limiter: TokenBucketLimiter;
  let config: RateLimitConfig;

  beforeEach(() => {
    store = new MemoryLimiterStore();
    config = {
      maxTokens: 10,
      refillRate: 1, // 1 token per second
      windowMs: 60000
    };
    limiter = new TokenBucketLimiter(store, config);
  });

  afterEach(() => {
    store.clear();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(limiter).toBeDefined();
      expect(limiter.getConfig()).toEqual(config);
    });

    it('should log initialization', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      new TokenBucketLimiter(store, config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TokenBucketLimiter initialized')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isAllowed', () => {
    it('should allow first request and initialize bucket', async () => {
      const allowed = await limiter.isAllowed('test-key');

      expect(allowed).toBe(true);

      const state = await limiter.getState('test-key');
      expect(state).toBeDefined();
      expect(state!.tokens).toBe(9); // 10 - 1 consumed
    });

    it('should allow requests up to max tokens', async () => {
      const key = 'test-key';

      // Consume all 10 tokens
      for (let i = 0; i < 10; i++) {
        const allowed = await limiter.isAllowed(key);
        expect(allowed).toBe(true);
      }

      // 11th request should be blocked
      const blocked = await limiter.isAllowed(key);
      expect(blocked).toBe(false);
    });

    it('should refill tokens over time', async () => {
      const key = 'test-key';

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.isAllowed(key);
      }

      // Next request should be blocked
      expect(await limiter.isAllowed(key)).toBe(false);

      // Wait 2 seconds (2 tokens should refill at 1 token/sec)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should allow 2 more requests
      expect(await limiter.isAllowed(key)).toBe(true);
      expect(await limiter.isAllowed(key)).toBe(true);
      expect(await limiter.isAllowed(key)).toBe(false);
    });

    it('should handle separate keys independently', async () => {
      const key1 = 'user-1';
      const key2 = 'user-2';

      // Consume tokens from key1
      for (let i = 0; i < 10; i++) {
        await limiter.isAllowed(key1);
      }

      // key1 should be blocked
      expect(await limiter.isAllowed(key1)).toBe(false);

      // key2 should still work
      expect(await limiter.isAllowed(key2)).toBe(true);

      const state1 = await limiter.getState(key1);
      const state2 = await limiter.getState(key2);

      expect(state1!.tokens).toBeLessThan(1);
      expect(state2!.tokens).toBe(9);
    });

    it('should cap tokens at max tokens after refill', async () => {
      const key = 'test-key';

      // Use 1 token
      await limiter.isAllowed(key);

      // Wait 20 seconds (should refill 20 tokens but cap at 10)
      await new Promise(resolve => setTimeout(resolve, 20000));

      // Should have max 10 tokens, not 29 (9 remaining + 20 refilled)
      for (let i = 0; i < 10; i++) {
        expect(await limiter.isAllowed(key)).toBe(true);
      }
      expect(await limiter.isAllowed(key)).toBe(false);
    }, 25000); // Increase timeout for this test

    it('should handle fractional token refill correctly', async () => {
      const key = 'test-key';

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.isAllowed(key);
      }

      // Wait 500ms (should refill 0.5 tokens - not enough for a request)
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(await limiter.isAllowed(key)).toBe(false);

      // Wait another 500ms (total 1 second, 1 full token)
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(await limiter.isAllowed(key)).toBe(true);
    }, 3000);
  });

  describe('getState', () => {
    it('should return null for non-existent key', async () => {
      const state = await limiter.getState('non-existent');
      expect(state).toBeNull();
    });

    it('should return current bucket state', async () => {
      const key = 'test-key';

      await limiter.isAllowed(key);

      const state = await limiter.getState(key);
      expect(state).toBeDefined();
      expect(state!.tokens).toBe(9);
      expect(state!.lastRefill).toBeGreaterThan(0);
    });

    it('should show updated state after token consumption', async () => {
      const key = 'test-key';

      await limiter.isAllowed(key);
      const state1 = await limiter.getState(key);

      await limiter.isAllowed(key);
      const state2 = await limiter.getState(key);

      expect(state2!.tokens).toBeLessThanOrEqual(state1!.tokens);
    });
  });

  describe('reset', () => {
    it('should reset bucket to max tokens', async () => {
      const key = 'test-key';

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.isAllowed(key);
      }

      expect(await limiter.isAllowed(key)).toBe(false);

      // Reset bucket
      await limiter.reset(key);

      // Should allow requests again
      expect(await limiter.isAllowed(key)).toBe(true);

      const state = await limiter.getState(key);
      expect(state!.tokens).toBe(9); // 10 - 1 consumed
    });

    it('should update lastRefill timestamp on reset', async () => {
      const key = 'test-key';

      await limiter.isAllowed(key);

      const beforeReset = Date.now();
      await limiter.reset(key);
      const afterReset = Date.now();

      const state = await limiter.getState(key);
      expect(state!.lastRefill).toBeGreaterThanOrEqual(beforeReset);
      expect(state!.lastRefill).toBeLessThanOrEqual(afterReset);
    });
  });

  describe('getConfig', () => {
    it('should return limiter configuration', () => {
      const returnedConfig = limiter.getConfig();

      expect(returnedConfig).toEqual(config);
      expect(returnedConfig.maxTokens).toBe(10);
      expect(returnedConfig.refillRate).toBe(1);
      expect(returnedConfig.windowMs).toBe(60000);
    });

    it('should return a copy of config (not reference)', () => {
      const config1 = limiter.getConfig();
      const config2 = limiter.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});

describe('MemoryLimiterStore', () => {
  let store: MemoryLimiterStore;

  beforeEach(() => {
    store = new MemoryLimiterStore();
  });

  describe('get and set', () => {
    it('should return null for non-existent key', async () => {
      const value = await store.get('non-existent');
      expect(value).toBeNull();
    });

    it('should store and retrieve bucket state', async () => {
      const key = 'test-key';
      const value = { tokens: 5, lastRefill: Date.now() };

      await store.set(key, value);
      const retrieved = await store.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should update existing bucket state', async () => {
      const key = 'test-key';

      await store.set(key, { tokens: 5, lastRefill: 1000 });
      await store.set(key, { tokens: 3, lastRefill: 2000 });

      const value = await store.get(key);
      expect(value!.tokens).toBe(3);
      expect(value!.lastRefill).toBe(2000);
    });

    it('should handle multiple keys', async () => {
      await store.set('key1', { tokens: 5, lastRefill: 1000 });
      await store.set('key2', { tokens: 8, lastRefill: 2000 });

      const value1 = await store.get('key1');
      const value2 = await store.get('key2');

      expect(value1!.tokens).toBe(5);
      expect(value2!.tokens).toBe(8);
    });
  });

  describe('clear', () => {
    it('should clear all buckets', async () => {
      await store.set('key1', { tokens: 5, lastRefill: 1000 });
      await store.set('key2', { tokens: 8, lastRefill: 2000 });

      expect(store.size()).toBe(2);

      store.clear();

      expect(store.size()).toBe(0);
      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBeNull();
    });
  });

  describe('size', () => {
    it('should return number of buckets', async () => {
      expect(store.size()).toBe(0);

      await store.set('key1', { tokens: 5, lastRefill: 1000 });
      expect(store.size()).toBe(1);

      await store.set('key2', { tokens: 8, lastRefill: 2000 });
      expect(store.size()).toBe(2);

      await store.set('key1', { tokens: 3, lastRefill: 3000 });
      expect(store.size()).toBe(2); // Update, not add
    });
  });
});

describe('RedisLimiterStore', () => {
  let mockRedisClient: unknown;
  let store: RedisLimiterStore;

  beforeEach(() => {
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn()
    };
    store = new RedisLimiterStore(mockRedisClient);
  });

  describe('get', () => {
    it('should retrieve and parse bucket state', async () => {
      const value = { tokens: 5, lastRefill: 1000 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await store.get('test-key');

      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if key not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await store.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await store.get('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Redis get error:',
        'Redis connection failed'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should store bucket state with TTL', async () => {
      const value = { tokens: 5, lastRefill: 1000 };
      mockRedisClient.set.mockResolvedValue('OK');

      await store.set('test-key', value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(value),
        'EX',
        3600
      );
    });

    it('should not throw on Redis error (graceful degradation)', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        store.set('test-key', { tokens: 5, lastRefill: 1000 })
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Redis set error:',
        'Redis connection failed'
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('createRateLimitMiddleware', () => {
  let store: MemoryLimiterStore;
  let limiter: TokenBucketLimiter;
  let middleware: (request: Request) => Promise<Response | null>;

  beforeEach(() => {
    store = new MemoryLimiterStore();
    limiter = new TokenBucketLimiter(store, {
      maxTokens: 3,
      refillRate: 1,
      windowMs: 60000
    });
    middleware = createRateLimitMiddleware(limiter);
  });

  it('should allow request when under rate limit', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });

    const response = await middleware(request);

    expect(response).toBeNull(); // Null means request allowed
  });

  it('should block request when rate limit exceeded', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });

    // Consume all tokens
    await middleware(request);
    await middleware(request);
    await middleware(request);

    // 4th request should be blocked
    const response = await middleware(request);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
  });

  it('should return 429 response with proper headers', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });

    // Consume all tokens
    await middleware(request);
    await middleware(request);
    await middleware(request);

    const response = await middleware(request);
    const body = await response!.json();

    expect(body.error).toBe('Rate limit exceeded');
    expect(response!.headers.get('Retry-After')).toBeDefined();
    expect(response!.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should extract IP from x-forwarded-for header', async () => {
    const request1 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
    });

    const request2 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.2' }
    });

    // Different IPs should have independent limits
    await middleware(request1);
    await middleware(request1);
    await middleware(request1);

    // First IP exhausted
    expect(await middleware(request1)).not.toBeNull();

    // Second IP still has tokens
    expect(await middleware(request2)).toBeNull();
  });

  it('should handle missing IP headers gracefully', async () => {
    const request = new Request('http://localhost:3000/api/test');

    const response = await middleware(request);

    expect(response).toBeNull(); // Should still work with 'unknown' IP
  });
});

describe('createRateLimiter', () => {
  it('should create limiter with default config', () => {
    const limiter = createRateLimiter();

    expect(limiter).toBeInstanceOf(TokenBucketLimiter);
    const config = limiter.getConfig();
    expect(config.maxTokens).toBeDefined();
    expect(config.refillRate).toBeDefined();
  });

  it('should use provided store', () => {
    const customStore = new MemoryLimiterStore();
    const limiter = createRateLimiter(customStore);

    expect(limiter).toBeInstanceOf(TokenBucketLimiter);
  });

  it('should merge provided config with defaults', () => {
    const limiter = createRateLimiter(undefined, { maxTokens: 50 });

    const config = limiter.getConfig();
    expect(config.maxTokens).toBe(50);
    expect(config.refillRate).toBeDefined(); // Should still have default
  });

  it('should read configuration from environment variables', () => {
    process.env.RATE_LIMIT_MAX_TOKENS = '20';
    process.env.RATE_LIMIT_REFILL_RATE = '2';

    const limiter = createRateLimiter();
    const config = limiter.getConfig();

    expect(config.maxTokens).toBe(20);
    expect(config.refillRate).toBe(2);

    // Cleanup
    delete process.env.RATE_LIMIT_MAX_TOKENS;
    delete process.env.RATE_LIMIT_REFILL_RATE;
  });
});

describe('RateLimitPresets', () => {
  it('should have AUTH_STRICT preset', () => {
    expect(RateLimitPresets.AUTH_STRICT).toBeDefined();
    expect(RateLimitPresets.AUTH_STRICT.maxTokens).toBe(5);
  });

  it('should have AUTH_MODERATE preset', () => {
    expect(RateLimitPresets.AUTH_MODERATE).toBeDefined();
    expect(RateLimitPresets.AUTH_MODERATE.maxTokens).toBe(10);
  });

  it('should have PASSWORD_RESET preset', () => {
    expect(RateLimitPresets.PASSWORD_RESET).toBeDefined();
    expect(RateLimitPresets.PASSWORD_RESET.maxTokens).toBe(3);
  });

  it('should have API_GENERAL preset', () => {
    expect(RateLimitPresets.API_GENERAL).toBeDefined();
    expect(RateLimitPresets.API_GENERAL.maxTokens).toBe(100);
  });

  it('should work with TokenBucketLimiter', () => {
    const store = new MemoryLimiterStore();
    const limiter = new TokenBucketLimiter(store, RateLimitPresets.AUTH_STRICT);

    expect(limiter.getConfig().maxTokens).toBe(5);
  });
});
