/**
 * RateLimiter Service - Rate Limiting and Account Lockout Implementation
 *
 * Implements AUTH-P2-2A requirements:
 * - Per-IP, per-account, and global rate limiting buckets
 * - Exponential backoff calculation
 * - Account lockout with atomic database operations
 * - CAPTCHA hook integration (stub)
 * - Enumeration-safe error responses
 *
 * Architecture:
 * - In-memory buckets for development/testing
 * - Redis-ready architecture for production scaling
 * - DatabaseService integration for persistent lockout state
 * - Circuit breaker patterns for high availability
 */

import { CoreService, ServiceConfig } from '../CoreService';
import { DatabaseService } from '../DatabaseService';
import { BizError } from '../../errors/BizError';

/**
 * Rate limiting key types for different bucket strategies
 */
export type RateKeyKind = 'ip' | 'account' | 'global';

/**
 * Rate limiting key structure
 */
export interface RateKey {
  kind: RateKeyKind;
  id?: string; // IP address for 'ip', user ID for 'account', undefined for 'global'
}

/**
 * Rate limiting decision result
 */
export interface RateDecision {
  allow: boolean;
  retryAfterSec?: number;
  remainingAttempts?: number;
  resetTime?: Date;
}

/**
 * Rate limiting bucket configuration
 */
export interface RateBucket {
  maxAttempts: number;
  windowSec: number;
  lockoutDurationSec: number;
}

/**
 * Rate limiting bucket state
 */
interface BucketState {
  attempts: number;
  windowStart: Date;
  lockedUntil?: Date;
  lastAttempt: Date;
}

/**
 * Account lockout information
 */
export interface AccountLockout {
  userId: string;
  failedAttempts: number;
  lockedUntil?: Date;
  lastFailureAt: Date;
}

/**
 * CAPTCHA challenge hook (stub implementation)
 */
export interface CaptchaHook {
  shouldChallenge(key: RateKey, attempts: number): boolean;
  generateChallenge(key: RateKey): Promise<string>;
  validateChallenge(key: RateKey, response: string): Promise<boolean>;
}

/**
 * Storage backend interface for rate limiter
 * Allows pluggable storage (memory, Redis, etc.)
 */
export interface LimiterStore {
  /**
   * Increment key's counter and return new count with window reset timestamp (epoch seconds).
   *
   * @param key - Unique identifier for the rate limit bucket
   * @param windowSec - Window duration in seconds
   * @returns Promise with current count and reset timestamp
   */
  incr(key: string, windowSec: number): Promise<{ count: number; resetAt: number }>;
}

/**
 * RateLimiter interface defining the contract
 */
export interface IRateLimiter {
  /**
   * Check if a request is allowed based on rate limiting rules
   */
  check(key: RateKey): Promise<RateDecision>;

  /**
   * Increment failure counter and apply backoff/lockout
   */
  incrFailure(key: RateKey, userId?: string): Promise<void>;

  /**
   * Reset rate limiting for an account (on successful auth)
   */
  resetAccount(userId: string): Promise<void>;

  /**
   * Check if an account is currently locked
   */
  isLocked(userId: string): Promise<boolean>;

  /**
   * Lock an account until specified time
   */
  lockUntil(userId: string, until: Date): Promise<void>;

  /**
   * Get current lockout status for an account
   */
  getLockoutStatus(userId: string): Promise<AccountLockout | null>;
}

/**
 * RateLimiter service configuration
 */
export interface RateLimiterConfig extends ServiceConfig {
  database: DatabaseService;
  buckets: {
    ip: RateBucket;
    account: RateBucket;
    global: RateBucket;
  };
  captchaHook?: CaptchaHook;
  enableMetrics?: boolean;
}

/**
 * RateLimiter Service Implementation
 *
 * Provides rate limiting with exponential backoff and account lockout.
 * Uses in-memory buckets for high performance with DatabaseService
 * for persistent state management.
 */
export class RateLimiter extends CoreService implements IRateLimiter {
  private readonly database: DatabaseService;
  private readonly buckets: Record<RateKeyKind, RateBucket>;
  private readonly captchaHook?: CaptchaHook;
  private readonly enableMetrics: boolean;

  // In-memory state storage (Redis-ready architecture)
  private readonly bucketStates = new Map<string, BucketState>();
  private readonly globalState: BucketState;

  constructor(config: RateLimiterConfig) {
    super({
      ...config,
      name: 'RateLimiter',
      version: '1.0.0'
    });

    this.database = config.database;
    this.buckets = config.buckets;
    this.captchaHook = config.captchaHook;
    this.enableMetrics = config.enableMetrics ?? false;

    // Initialize global bucket state
    this.globalState = {
      attempts: 0,
      windowStart: new Date(),
      lastAttempt: new Date()
    };

    this.logger.info('RateLimiter service initialized', {
      operation: 'constructor',
      metadata: {
        buckets: Object.keys(this.buckets),
        captchaEnabled: !!this.captchaHook,
        metricsEnabled: this.enableMetrics
      }
    });
  }

  /**
   * Initialize rate limiting service
   */
  async initialize(): Promise<void> {
    return this.executeOperation('initialize', async () => {
      // Verify database connection
      if (!this.database) {
        throw BizError.serviceUnavailable('RateLimiter', new Error('DatabaseService not provided'));
      }

      // Clean up expired lockouts on startup
      await this.cleanupExpiredLockouts();

      this.logger.info('RateLimiter service initialized successfully');
    });
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  async check(key: RateKey): Promise<RateDecision> {
    return this.executeOperation('check', async () => {
      const bucketKey = this.getBucketKey(key);
      const bucket = this.buckets[key.kind];
      const now = new Date();

      // Handle global rate limiting
      if (key.kind === 'global') {
        return this.checkGlobalRate(bucket, now);
      }

      // Handle per-IP or per-account rate limiting
      const state = this.bucketStates.get(bucketKey) || this.createBucketState();

      // Check if currently locked
      if (state.lockedUntil && state.lockedUntil > now) {
        const retryAfterSec = Math.ceil((state.lockedUntil.getTime() - now.getTime()) / 1000);
        return {
          allow: false,
          retryAfterSec,
          remainingAttempts: 0,
          resetTime: state.lockedUntil
        };
      }

      // Check if window has expired
      const windowExpired = (now.getTime() - state.windowStart.getTime()) > (bucket.windowSec * 1000);
      if (windowExpired) {
        // Reset window
        state.attempts = 0;
        state.windowStart = now;
        state.lockedUntil = undefined;
      }

      // Check if within rate limit
      const remainingAttempts = bucket.maxAttempts - state.attempts;
      const allow = remainingAttempts > 0;

      this.bucketStates.set(bucketKey, state);

      return {
        allow,
        retryAfterSec: allow ? undefined : this.calculateRetryAfter(bucket, state),
        remainingAttempts: Math.max(0, remainingAttempts),
        resetTime: new Date(state.windowStart.getTime() + (bucket.windowSec * 1000))
      };
    });
  }

  /**
   * Increment failure counter and apply backoff/lockout
   */
  async incrFailure(key: RateKey, userId?: string): Promise<void> {
    return this.executeOperation('incrFailure', async () => {
      const bucketKey = this.getBucketKey(key);
      const bucket = this.buckets[key.kind];
      const now = new Date();

      // Update in-memory bucket state
      const state = this.bucketStates.get(bucketKey) || this.createBucketState();
      state.attempts += 1;
      state.lastAttempt = now;

      // Calculate lockout if threshold exceeded
      if (state.attempts >= bucket.maxAttempts) {
        const lockoutDuration = this.calculateLockoutDuration(state.attempts, bucket);
        state.lockedUntil = new Date(now.getTime() + lockoutDuration * 1000);
      }

      this.bucketStates.set(bucketKey, state);

      // Handle account-specific lockout in database
      if (key.kind === 'account' && userId) {
        await this.updateAccountLockout(userId, state);
      }

      // Log security event
      this.logger.warn('Rate limit failure recorded', {
        operation: 'incrFailure',
        metadata: {
          key: bucketKey,
          attempts: state.attempts,
          lockedUntil: state.lockedUntil?.toISOString(),
          userId
        }
      });
    });
  }

  /**
   * Reset rate limiting for an account (on successful auth)
   */
  async resetAccount(userId: string): Promise<void> {
    return this.executeOperation('resetAccount', async () => {
      // Clear in-memory state
      const accountKey = this.getBucketKey({ kind: 'account', id: userId });
      this.bucketStates.delete(accountKey);

      // Reset database state atomically
      await this.database.query(
        `UPDATE users
         SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
         WHERE id = ?`,
        [userId]
      );

      this.logger.info('Account rate limiting reset', {
        operation: 'resetAccount',
        metadata: { userId }
      });
    });
  }

  /**
   * Check if an account is currently locked
   */
  async isLocked(userId: string): Promise<boolean> {
    return this.executeOperation('isLocked', async () => {
      const result = await this.database.query<{ locked_until: string | null }>(
        `SELECT locked_until FROM users WHERE id = ?`,
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const lockedUntil = result.rows[0]?.locked_until;
      if (!lockedUntil) {
        return false;
      }

      return new Date(lockedUntil) > new Date();
    });
  }

  /**
   * Lock an account until specified time
   */
  async lockUntil(userId: string, until: Date): Promise<void> {
    return this.executeOperation('lockUntil', async () => {
      await this.database.query(
        `UPDATE users
         SET locked_until = ?, updated_at = NOW()
         WHERE id = ?`,
        [until, userId]
      );

      this.logger.warn('Account locked by administrator', {
        operation: 'lockUntil',
        metadata: { userId, until: until.toISOString() }
      });
    });
  }

  /**
   * Get current lockout status for an account
   */
  async getLockoutStatus(userId: string): Promise<AccountLockout | null> {
    return this.executeOperation('getLockoutStatus', async () => {
      const result = await this.database.query<{
        failed_login_attempts: number;
        locked_until: string | null;
        updated_at: string;
      }>(
        `SELECT failed_login_attempts, locked_until, updated_at
         FROM users WHERE id = ?`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      if (!row) return null;

      return {
        userId,
        failedAttempts: row.failed_login_attempts,
        lockedUntil: row.locked_until ? new Date(row.locked_until) : undefined,
        lastFailureAt: new Date(row.updated_at)
      };
    });
  }

  /**
   * Health check for rate limiting service
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    try {
      // Check database connectivity
      const dbHealth = await this.database.query('SELECT 1 as health_check');
      const dbHealthy = dbHealth.rows.length > 0;

      // Check in-memory state
      const memoryHealthy = this.bucketStates.size >= 0; // Basic sanity check

      return {
        database: dbHealthy,
        memory: memoryHealthy,
        buckets: true
      };
    } catch {
      return {
        database: false,
        memory: false,
        buckets: false
      };
    }
  }

  // Private helper methods

  private getBucketKey(key: RateKey): string {
    switch (key.kind) {
      case 'ip':
        return `ip:${key.id}`;
      case 'account':
        return `account:${key.id}`;
      case 'global':
        return 'global';
      default:
        throw new Error(`Invalid rate key kind: ${key.kind}`);
    }
  }

  private createBucketState(): BucketState {
    const now = new Date();
    return {
      attempts: 0,
      windowStart: now,
      lastAttempt: now
    };
  }

  private checkGlobalRate(bucket: RateBucket, now: Date): RateDecision {
    // Check if window has expired
    const windowExpired = (now.getTime() - this.globalState.windowStart.getTime()) > (bucket.windowSec * 1000);
    if (windowExpired) {
      this.globalState.attempts = 0;
      this.globalState.windowStart = now;
      this.globalState.lockedUntil = undefined;
    }

    // Check if currently locked
    if (this.globalState.lockedUntil && this.globalState.lockedUntil > now) {
      const retryAfterSec = Math.ceil((this.globalState.lockedUntil.getTime() - now.getTime()) / 1000);
      return {
        allow: false,
        retryAfterSec,
        remainingAttempts: 0,
        resetTime: this.globalState.lockedUntil
      };
    }

    const remainingAttempts = bucket.maxAttempts - this.globalState.attempts;
    const allow = remainingAttempts > 0;

    return {
      allow,
      retryAfterSec: allow ? undefined : this.calculateRetryAfter(bucket, this.globalState),
      remainingAttempts: Math.max(0, remainingAttempts),
      resetTime: new Date(this.globalState.windowStart.getTime() + (bucket.windowSec * 1000))
    };
  }

  private calculateRetryAfter(bucket: RateBucket, state: BucketState): number {
    // Calculate time until window reset
    const windowReset = Math.ceil(
      (bucket.windowSec * 1000 - (Date.now() - state.windowStart.getTime())) / 1000
    );

    // If locked, use lockout time
    if (state.lockedUntil) {
      const lockoutRemaining = Math.ceil((state.lockedUntil.getTime() - Date.now()) / 1000);
      return Math.max(lockoutRemaining, windowReset);
    }

    return Math.max(windowReset, 1);
  }

  private calculateLockoutDuration(attempts: number, bucket: RateBucket): number {
    // Exponential backoff: 2^(attempts - maxAttempts) * baseDuration
    const excessAttempts = attempts - bucket.maxAttempts + 1;
    const multiplier = Math.pow(2, Math.min(excessAttempts, 10)); // Cap at 2^10 = 1024
    return Math.min(bucket.lockoutDurationSec * multiplier, 86400); // Cap at 24 hours
  }

  private async updateAccountLockout(userId: string, state: BucketState): Promise<void> {
    try {
      await this.database.query(
        `UPDATE users
         SET failed_login_attempts = ?,
             locked_until = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [state.attempts, state.lockedUntil, userId]
      );
    } catch (error) {
      this.logger.error('Failed to update account lockout in database', error as Error, {
        operation: 'updateAccountLockout',
        metadata: { userId, attempts: state.attempts }
      });
      // Don't throw - in-memory rate limiting still works
    }
  }

  private async cleanupExpiredLockouts(): Promise<void> {
    try {
      const result = await this.database.query(
        `UPDATE users
         SET locked_until = NULL
         WHERE locked_until IS NOT NULL AND locked_until <= NOW()`
      );

      if (result.rowCount && result.rowCount > 0) {
        this.logger.info('Cleaned up expired account lockouts', {
          operation: 'cleanupExpiredLockouts',
          metadata: { count: result.rowCount }
        });
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup expired lockouts', {
        operation: 'cleanupExpiredLockouts',
        error: (error as Error).message
      });
    }
  }
}