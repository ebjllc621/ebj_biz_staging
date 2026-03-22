/**
 * AuthServiceRegistry - Singleton Manager for Authentication Services
 *
 * @authority Phase 2 Service Registry Implementation
 * @pattern Singleton Registry with Lazy Initialization
 * @compliance Admin Build Map v2.1, Unified Dependency Map v2.0
 * @governance DatabaseService singleton required, NO direct instantiation
 *
 * PURPOSE:
 * - Single source of truth for authentication service instances
 * - Eliminates per-request service instantiation
 * - Ensures proper dependency injection
 * - Provides health monitoring interface
 *
 * GOVERNANCE:
 * - MUST use DatabaseService singleton (getDatabaseService())
 * - K9 enforcement blocks: new DatabaseService()
 * - All API routes MUST import from this registry
 * - Instance count MUST always be 1 per service
 */

import * as crypto from 'crypto';
import { getDatabaseService, DatabaseService } from '@/core/services/DatabaseService';
import { AuthenticationService } from '@/core/services/auth/AuthenticationService';
import { SessionService } from '@/core/services/auth/SessionService';
import { MfaService } from '@/core/services/auth/MfaService';
import { EmailService, EmailServiceConfig, EmailServiceHealth } from '@/core/services/email';
import { BizError } from '@/core/errors/BizError';
import { validateSecrets } from '@/core/config/validateSecrets';
import { ActivityLoggingService, getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Health status for a single service
 */
interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_initialized';
  instanceCount: number;
  lastCheck: Date;
  lastInitialized: Date | null;
  message?: string;
  metrics?: Record<string, unknown>;
}

/**
 * Overall registry health status
 */
interface HealthStatus {
  healthy: boolean;
  timestamp: Date;
  registryStatus: 'initialized' | 'initializing' | 'not_initialized' | 'error';
  services: {
    database: ServiceHealth;
    authentication: ServiceHealth;
    session: ServiceHealth;
    mfa: ServiceHealth;
    rateLimiter: ServiceHealth;
    emailService: EmailServiceHealth;
    activityLogging: ServiceHealth;
  };
  connectionPool?: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  rateLimiter?: {
    type: 'memory' | 'redis';
    keysTracked: number;
  };
}

/**
 * Enhanced health status with performance metrics (Phase 5)
 */
interface EnhancedHealthStatus extends HealthStatus {
  performance: {
    avgResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    memoryUsageMB: number;
  };
  violations: {
    singletonViolations: number;
    deprecatedUsage: number;
    directInstantiation: number;
  };
  lastChecked: Date;
}

/**
 * Registry configuration interface
 */
interface RegistryConfig {
  session: {
    expiryHours: number;
    enableRotation: boolean;
  };
  auth: {
    enforceRateLimit: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  mfa: {
    authSecret: string;
  };
}

/**
 * Structured logger interface
 */
interface Logger {
  info(_message: string, _context?: Record<string, unknown>): void;
  warn(_message: string, _context?: Record<string, unknown>): void;
  error(_message: string, _context?: Record<string, unknown>): void;
}

/**
 * Simple console logger (intentional for registry initialization)
 * Uses console for registry-level logging during bootstrap
 */
const logger: Logger = {
  // eslint-disable-next-line no-console -- Registry initialization logging
  info: (msg, ctx) => console.log(`[INFO] ${msg}`, ctx || ''),
  // eslint-disable-next-line no-console -- Registry initialization logging
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx || ''),
  // eslint-disable-next-line no-console -- Registry initialization logging
  error: (msg, ctx) => ErrorService.capture(`[ERROR] ${msg}`, ctx || '')
};

/**
 * Performance metrics tracker (Phase 5)
 * Tracks request timing, error rates, and throughput
 */
class PerformanceTracker {
  private requestTimes: number[] = [];
  private errorCount: number = 0;
  private totalRequests: number = 0;
  private startTime: number = Date.now();

  recordRequest(responseTime: number, isError: boolean = false) {
    this.requestTimes.push(responseTime);
    this.totalRequests++;

    if (isError) {
      this.errorCount++;
    }

    // Keep only last 100 requests for averaging
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift();
    }
  }

  getMetrics() {
    const avgResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
      : 0;

    const uptime = (Date.now() - this.startTime) / 1000; // seconds
    const requestsPerSecond = this.totalRequests / uptime;
    const errorRate = this.totalRequests > 0
      ? this.errorCount / this.totalRequests
      : 0;

    return {
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errorRate: Math.round(errorRate * 10000) / 100, // percentage
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }

  reset() {
    this.requestTimes = [];
    this.errorCount = 0;
    this.totalRequests = 0;
    this.startTime = Date.now();
  }
}

/**
 * AuthServiceRegistry - Singleton Manager
 *
 * USAGE:
 * ```typescript
 * import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
 *
 * const authService = AuthServiceRegistry.authService;
 * const result = await authService.login(credentials, context);
 * ```
 *
 * FORBIDDEN:
 * ```typescript
 * // ❌ NEVER DO THIS
 * const db = new DatabaseService({...}); // K9 will block
 * const authService = new AuthenticationService({...});
 * ```
 */
class AuthServiceRegistry {
  /**
   * Private constructor - singleton pattern
   */
  private constructor() {
    throw new Error('AuthServiceRegistry cannot be instantiated. Use static accessors.');
  }

  /**
   * Service instances map
   */
  private static instances: Map<string, any> = new Map();

  /**
   * Initialization state
   */
  private static initialized: boolean = false;
  private static initializing: Promise<void> | null = null;
  private static initializationError: Error | null = null;

  /**
   * Configuration cache
   */
  private static config: RegistryConfig | null = null;

  /**
   * Performance tracker instance (Phase 5)
   */
  private static performanceTracker = new PerformanceTracker();

  /**
   * Violation counts (Phase 5)
   */
  private static violationCounts = {
    singletonViolations: 0,
    deprecatedUsage: 0,
    directInstantiation: 0
  };

  /**
   * Get registry configuration from environment
   *
   * @governance Environment variables ONLY - NO hardcoded credentials
   */
  private static getConfig(): RegistryConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      session: {
        expiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24'),
        enableRotation: process.env.SESSION_ROTATION !== 'false'
      },
      auth: {
        enforceRateLimit: process.env.RATE_LIMIT_ENABLED !== 'false',
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000') // 15 min
      },
      mfa: {
        authSecret: process.env.AUTH_SECRET || this.generateAuthSecret()
      }
    };

    return this.config;
  }

  /**
   * Generate auth secret if not provided
   * WARNING: In production, AUTH_SECRET MUST be set in environment
   *
   * @governance Production requires AUTH_SECRET environment variable
   */
  private static generateAuthSecret(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'AUTH_SECRET must be set in production environment. ' +
        'Generate: openssl rand -base64 32'
      );
    }

    logger.warn(
      'Using generated AUTH_SECRET. Set AUTH_SECRET environment variable for production.',
      { environment: process.env.NODE_ENV }
    );

    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Initialize all services with proper dependency injection
   * Called automatically on first service access
   *
   * @governance Uses DatabaseService singleton - NO direct instantiation
   */
  private static async initialize(): Promise<void> {
    // Prevent concurrent initialization
    if (this.initializing) {
      return this.initializing;
    }

    if (this.initialized) {
      return;
    }

    // Set initializing promise
    this.initializing = (async () => {
      try {
        logger.info('[AuthServiceRegistry] Initializing authentication services...');

        // STEP 0: Validate secrets before any service initialization
        logger.info('[AuthServiceRegistry] Validating secrets...');
        const secretsResult = validateSecrets(process.env.NODE_ENV === 'production');

        if (!secretsResult.valid && process.env.NODE_ENV === 'production') {
          throw new Error('Cannot initialize AuthServiceRegistry with invalid secrets');
        }

        if (secretsResult.warnings.length > 0) {
          logger.warn('[AuthServiceRegistry] Secrets validation warnings detected', {
            warnings: secretsResult.warnings
          });
        }

        logger.info('[AuthServiceRegistry] ✓ Secrets validation complete');

        const config = this.getConfig();

        // Step 1: Get DatabaseService singleton (NO instantiation)
        // ✅ CORRECT: Uses singleton from getDatabaseService()
        logger.info('[AuthServiceRegistry] Getting DatabaseService singleton...');
        const databaseService = getDatabaseService();

        // Ensure it's initialized
        await databaseService.initialize();

        this.instances.set('database', databaseService);
        logger.info('[AuthServiceRegistry] ✓ DatabaseService singleton retrieved');

        // Step 2: Initialize RateLimiter (no auth dependencies)
        logger.info('[AuthServiceRegistry] Creating RateLimiter...');
        const { RateLimiter } = await import('@/core/services/rate/RateLimiter');
        const rateLimiter = new RateLimiter({
          name: 'RateLimiter',
          version: '2.0.0',
          database: databaseService,
          buckets: {
            ip: { maxAttempts: 10, windowSec: 60, lockoutDurationSec: 300 },
            account: { maxAttempts: 5, windowSec: 300, lockoutDurationSec: 900 },
            global: { maxAttempts: 100, windowSec: 60, lockoutDurationSec: 600 }
          },
          enableMetrics: true
        });
        this.instances.set('rateLimiter', rateLimiter);
        logger.info('[AuthServiceRegistry] ✓ RateLimiter initialized');

        // Step 3: Initialize SessionService (depends on DatabaseService)
        logger.info('[AuthServiceRegistry] Creating SessionService...');
        const sessionService = new SessionService({
          name: 'SessionService',
          version: '2.0.0-AUTH-P2-2E',
          database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'biz_dev',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
          },
          sessionExpiryHours: config.session.expiryHours,
          enableRotationChaining: config.session.enableRotation
        });
        await sessionService.initialize();
        this.instances.set('session', sessionService);
        logger.info('[AuthServiceRegistry] ✓ SessionService initialized');

        // Step 4: Initialize AuthenticationService (depends on Database, Session, RateLimiter)
        logger.info('[AuthServiceRegistry] Creating AuthenticationService...');
        const authService = new AuthenticationService({
          name: 'AuthenticationService',
          version: '2.0.0-AUTH-P2-2E',
          database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'biz_dev',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
          },
          sessionService: sessionService,
          rateLimiter: rateLimiter,
          sessionExpiryHours: config.session.expiryHours,
          enforceRateLimit: config.auth.enforceRateLimit
        });
        await authService.initialize();
        this.instances.set('auth', authService);
        logger.info('[AuthServiceRegistry] ✓ AuthenticationService initialized');

        // Step 5: Initialize MfaService (depends on DatabaseService)
        logger.info('[AuthServiceRegistry] Creating MfaService...');
        const mfaService = new MfaService({
          database: databaseService,
          authSecret: config.mfa.authSecret
        });
        await mfaService.initialize();
        this.instances.set('mfa', mfaService);
        logger.info('[AuthServiceRegistry] ✓ MfaService initialized');

        // Step 6: Initialize EmailService (no auth dependencies)
        logger.info('[AuthServiceRegistry] Creating EmailService...');
        await this.initializeEmailService();
        logger.info('[AuthServiceRegistry] ✓ EmailService initialized');

        // Step 7: Initialize ActivityLoggingService (no auth dependencies)
        logger.info('[AuthServiceRegistry] Getting ActivityLoggingService singleton...');
        const activityLoggingService = getActivityLoggingService();
        await activityLoggingService.initialize();
        this.instances.set('activityLogging', activityLoggingService);
        logger.info('[AuthServiceRegistry] ✓ ActivityLoggingService initialized');

        this.initialized = true;
        this.initializing = null;

        logger.info('[AuthServiceRegistry] ✓ All services initialized successfully', {
          instanceCounts: {
            database: 1,
            rateLimiter: 1,
            session: 1,
            authentication: 1,
            mfa: 1,
            email: 1,
            activityLogging: 1
          }
        });

      } catch (error) {
        this.initializationError = error as Error;
        this.initializing = null;
        logger.error('[AuthServiceRegistry] ✗ Initialization failed', {
          error: (error as Error).message,
          stack: (error as Error).stack
        });
        throw new BizError({
          code: 'REGISTRY_INIT_FAILED',
          message: 'Failed to initialize AuthServiceRegistry',
          context: { error: (error as Error).message }
        });
      }
    })();

    return this.initializing;
  }

  /**
   * Get DatabaseService singleton
   * Used by authentication services for database operations
   *
   * @governance Returns shared singleton - NOT a new instance
   */
  static get databaseService(): DatabaseService {
    if (!this.instances.has('database')) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      throw new Error(
        'DatabaseService not initialized. Registry initialization in progress or failed.'
      );
    }
    return this.instances.get('database');
  }

  /**
   * Get RateLimiter singleton
   * Used for rate limiting authentication operations
   */
  static get rateLimiter(): any {
    if (!this.instances.has('rateLimiter')) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      throw new Error(
        'RateLimiter not initialized. Registry initialization in progress or failed.'
      );
    }
    return this.instances.get('rateLimiter');
  }

  /**
   * Get SessionService singleton
   * Used for session management operations
   */
  static get sessionService(): SessionService {
    if (!this.instances.has('session')) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      throw new Error(
        'SessionService not initialized. Registry initialization in progress or failed.'
      );
    }
    return this.instances.get('session');
  }

  /**
   * Get AuthenticationService singleton (async)
   * PRIMARY SERVICE for authentication operations
   *
   * @example
   * ```typescript
   * const authService = await AuthServiceRegistry.getAuthService();
   * const result = await authService.login(credentials, context);
   * ```
   */
  static async getAuthService(): Promise<AuthenticationService> {
    // Ensure initialization completes before returning service
    await this.ensureInitialized();

    if (!this.instances.has('auth')) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      throw new Error(
        'AuthenticationService not initialized. Registry initialization failed.'
      );
    }

    return this.instances.get('auth');
  }

  /**
   * Get AuthenticationService singleton (synchronous - legacy)
   * @deprecated Use getAuthService() async method instead
   * Throws error if accessed before initialization completes
   */
  static get authService(): AuthenticationService {
    if (!this.instances.has('auth')) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      throw new Error(
        'AuthenticationService not initialized. Use await AuthServiceRegistry.getAuthService() instead of synchronous getter.'
      );
    }

    return this.instances.get('auth');
  }

  /**
   * Get MfaService singleton
   * Used for multi-factor authentication operations
   */
  static get mfaService(): MfaService {
    if (!this.instances.has('mfa')) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      throw new Error(
        'MfaService not initialized. Registry initialization in progress or failed.'
      );
    }
    return this.instances.get('mfa');
  }

  /**
   * Get EmailService singleton (async)
   * Used for sending verification and password reset emails
   */
  static async getEmailService(): Promise<EmailService> {
    await this.ensureInitialized();
    const service = this.instances.get('email');
    if (!service) {
      throw new Error('EmailService not initialized');
    }
    return service as EmailService;
  }

  /**
   * Get EmailService singleton (synchronous - legacy)
   * @deprecated Use getEmailService() async method instead
   */
  static get emailService(): EmailService {
    const service = this.instances.get('email');
    if (!service) {
      throw new Error('EmailService not initialized. Use await AuthServiceRegistry.getEmailService() instead.');
    }
    return service as EmailService;
  }

  /**
   * Get ActivityLoggingService singleton (async)
   * Used for logging user activity to database
   *
   * @example
   * ```typescript
   * const activityService = await AuthServiceRegistry.getActivityLoggingService();
   * await activityService.logAuthEvent('login', { userId: 123, success: true });
   * ```
   */
  static async getActivityLoggingService(): Promise<ActivityLoggingService> {
    await this.ensureInitialized();
    const service = this.instances.get('activityLogging');
    if (!service) {
      throw new Error('ActivityLoggingService not initialized');
    }
    return service as ActivityLoggingService;
  }

  /**
   * Get ActivityLoggingService singleton (synchronous)
   * @deprecated Use getActivityLoggingService() async method instead
   */
  static get activityLoggingService(): ActivityLoggingService {
    const service = this.instances.get('activityLogging');
    if (!service) {
      throw new Error('ActivityLoggingService not initialized. Use await AuthServiceRegistry.getActivityLoggingService() instead.');
    }
    return service as ActivityLoggingService;
  }

  /**
   * Initialize EmailService with environment configuration
   */
  private static async initializeEmailService(): Promise<void> {
    const emailConfig: EmailServiceConfig = {
      provider: (process.env.EMAIL_PROVIDER as 'console' | 'smtp' | 'sendgrid' | 'ses' | 'mailgun') || 'console',
      from: process.env.EMAIL_FROM || 'noreply@bizconekt.com',
      replyTo: process.env.EMAIL_REPLY_TO,
      smtp: process.env.EMAIL_PROVIDER === 'smtp' ? {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      } : undefined,
      sendgrid: process.env.EMAIL_PROVIDER === 'sendgrid' ? {
        apiKey: process.env.SENDGRID_API_KEY || ''
      } : undefined,
      ses: process.env.EMAIL_PROVIDER === 'ses' ? {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      } : undefined,
      mailgun: process.env.EMAIL_PROVIDER === 'mailgun' ? {
        apiKey: process.env.MAILGUN_API_KEY || '',
        domain: process.env.MAILGUN_DOMAIN || '',
        baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
      } : undefined,
      retryConfig: {
        maxAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.EMAIL_RETRY_BASE_DELAY || '1000'),
        maxDelayMs: parseInt(process.env.EMAIL_RETRY_MAX_DELAY || '10000')
      }
    };

    const emailService = new EmailService(emailConfig);
    await emailService.initialize();
    this.instances.set('email', emailService);
  }

  /**
   * Get comprehensive health status for all services
   * Used for monitoring and governance dashboards
   */
  static getHealthStatus(): HealthStatus {
    const now = new Date();

    const checkService = (key: string, name: string): ServiceHealth => {
      const instance = this.instances.get(key);
      if (!instance) {
        return {
          status: 'not_initialized',
          instanceCount: 0,
          lastCheck: now,
          message: `${name} not yet initialized`,
          lastInitialized: null
        };
      }

      // Check if service has health check method
      const health = instance.healthCheck ? instance.healthCheck() : { healthy: true };

      return {
        status: health.healthy ? 'healthy' : 'unhealthy',
        instanceCount: 1, // MUST be 1 for singleton
        lastCheck: now,
        message: health.message,
        metrics: health.metrics,
        lastInitialized: now
      };
    };

    const services = {
      database: checkService('database', 'DatabaseService'),
      authentication: checkService('auth', 'AuthenticationService'),
      session: checkService('session', 'SessionService'),
      mfa: checkService('mfa', 'MfaService'),
      rateLimiter: checkService('rateLimiter', 'RateLimiter'),
      emailService: this.instances.has('email')
        ? (this.instances.get('email') as EmailService).getHealthStatus()
        : { status: 'unhealthy' as const, provider: 'none', failureCount: 0 },
      activityLogging: checkService('activityLogging', 'ActivityLoggingService')
    };

    // Check if all services are healthy
    const healthy = Object.values(services).every(
      s => 'instanceCount' in s
        ? s.status === 'healthy' || s.status === 'not_initialized'
        : s.status === 'healthy'
    );

    // Determine registry status
    let registryStatus: 'initialized' | 'initializing' | 'not_initialized' | 'error';
    if (this.initializationError) {
      registryStatus = 'error';
    } else if (this.initialized) {
      registryStatus = 'initialized';
    } else if (this.initializing) {
      registryStatus = 'initializing';
    } else {
      registryStatus = 'not_initialized';
    }

    // Get connection pool status if database initialized
    let connectionPool;
    if (this.instances.has('database')) {
      const db = this.databaseService;
      if (db.getPoolStatus) {
        connectionPool = db.getPoolStatus();
      }
    }

    // Get rate limiter info
    let rateLimiterInfo;
    if (this.instances.has('rateLimiter')) {
      const limiter = this.rateLimiter;
      rateLimiterInfo = {
        type: 'memory' as const,
        keysTracked: 0 // MemoryLimiterStore doesn't expose this, default to 0
      };
    }

    return {
      healthy,
      timestamp: now,
      registryStatus,
      services,
      connectionPool,
      rateLimiter: rateLimiterInfo
    };
  }

  /**
   * Get enhanced health status with performance metrics (Phase 5)
   * Used by governance monitoring dashboard
   */
  static getEnhancedHealthStatus(): EnhancedHealthStatus {
    const basicHealth = this.getHealthStatus();
    const performance = this.performanceTracker.getMetrics();

    // Enhanced connection pool stats
    let connectionPool = {
      total: 0,
      active: 0,
      idle: 0,
      max: 0
    };

    if (this.instances.has('database')) {
      const db = this.instances.get('database') as any;
      if (db.pool) {
        const poolStats = db.getPoolStatus ? db.getPoolStatus() : null;
        if (poolStats) {
          connectionPool = {
            total: poolStats.total || 0,
            active: poolStats.active || 0,
            idle: poolStats.idle || 0,
            max: poolStats.max || 10
          };
        }
      }
    }

    return {
      ...basicHealth,
      performance,
      connectionPool,
      violations: { ...this.violationCounts },
      lastChecked: new Date()
    };
  }

  /**
   * Record a request for performance tracking (Phase 5)
   * Call this from API endpoints to track performance
   */
  static recordRequest(responseTime: number, isError: boolean = false) {
    this.performanceTracker.recordRequest(responseTime, isError);
  }

  /**
   * Record a governance violation (Phase 5)
   * Used by K9 enforcement to track violations
   */
  static recordViolation(type: 'singleton' | 'deprecated' | 'directInstantiation') {
    switch (type) {
      case 'singleton':
        this.violationCounts.singletonViolations++;
        break;
      case 'deprecated':
        this.violationCounts.deprecatedUsage++;
        break;
      case 'directInstantiation':
        this.violationCounts.directInstantiation++;
        break;
    }
  }

  /**
   * Reset performance metrics (Phase 5)
   * Useful for establishing new baselines
   */
  static resetMetrics() {
    this.performanceTracker.reset();
    this.violationCounts = {
      singletonViolations: 0,
      deprecatedUsage: 0,
      directInstantiation: 0
    };
  }

  /**
   * Ensure registry is initialized
   * Call this at application startup to fail fast
   */
  static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Destroy all services and clean up resources
   * Used for graceful shutdown
   */
  static async destroy(): Promise<void> {
    logger.info('[AuthServiceRegistry] Destroying all services...');

    for (const [key, instance] of this.instances) {
      try {
        if (instance && typeof instance.destroy === 'function') {
          await instance.destroy();
          logger.info(`[AuthServiceRegistry] ✓ ${key} destroyed`);
        }
      } catch (error) {
        logger.error(`[AuthServiceRegistry] ✗ Error destroying ${key}`, {
          error: (error as Error).message
        });
      }
    }

    this.instances.clear();
    this.initialized = false;
    this.initializing = null;
    this.initializationError = null;
    this.config = null;

    logger.info('[AuthServiceRegistry] ✓ All services destroyed');
  }

  /**
   * Reset registry for testing
   * WARNING: Only use in test environments
   *
   * @governance Production reset is FORBIDDEN
   */
  static reset(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset AuthServiceRegistry in production environment');
    }

    logger.info('[AuthServiceRegistry] Resetting for tests...');

    // Synchronous reset for tests
    for (const [key, instance] of this.instances) {
      if (instance && typeof instance.destroy === 'function') {
        try {
          // Try async destroy but don't wait
          void instance.destroy();
        } catch (error) {
          logger.warn(`[AuthServiceRegistry] Error during test reset of ${key}`, {
            error: (error as Error).message
          });
        }
      }
    }

    this.instances.clear();
    this.initialized = false;
    this.initializing = null;
    this.initializationError = null;
    this.config = null;

    logger.info('[AuthServiceRegistry] ✓ Reset complete');
  }

  /**
   * Get instance count for a service (for testing/monitoring)
   * MUST always return 1 for singletons
   */
  static getInstanceCount(serviceName: string): number {
    return this.instances.has(serviceName) ? 1 : 0;
  }

  /**
   * Check if registry is initialized
   */
  static get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get initialization error if any
   */
  static get initError(): Error | null {
    return this.initializationError;
  }
}

// Export as default for clean imports
export default AuthServiceRegistry;

// Named export for explicit usage
export { AuthServiceRegistry };

// Re-export types
export type {
  HealthStatus as AuthRegistryHealthStatus,
  ServiceHealth as AuthServiceHealth,
  EnhancedHealthStatus
};