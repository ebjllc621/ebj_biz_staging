/**
 * ConnectionPoolManager - Centralized Database Connection Pool
 *
 * GOVERNANCE: Single source of truth for all database connections
 * - Singleton pattern enforces shared pool across application
 * - Pool statistics for monitoring and alerting (REAL-TIME via mariadb)
 * - Graceful shutdown for clean application termination
 * - Uses globalThis for Next.js HMR persistence in development mode
 *
 * @authority database-package-canonical.md - MANDATORY mariadb package
 * @governance MANDATORY singleton pattern for all DB operations
 * @scale Designed for 1M+ users/day
 * @tier ADVANCED
 * @updated 2026-01-21 - Migrated from mysql2 to mariadb for pool statistics
 * @updated 2026-01-21 - Added globalThis persistence for Next.js dev mode HMR
 */

import mariadb from 'mariadb';
import { getDatabaseConfig, DatabaseConfig } from '@core/config/database.config';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Global singleton cache for Next.js development mode
 *
 * WHY THIS IS NEEDED:
 * - In development, Next.js HMR (Hot Module Replacement) reloads modules on file changes
 * - Each reload re-executes module code, resetting static class variables
 * - Without globalThis, each HMR event creates a NEW ConnectionPoolManager
 * - Old pools remain connected to MariaDB but are orphaned (memory leak + connection exhaustion)
 *
 * HOW IT WORKS:
 * - globalThis persists across module reloads in the same Node.js process
 * - We store the singleton on globalThis so HMR finds the existing instance
 * - Result: One pool instance survives all HMR events
 *
 * WHY PRODUCTION ISN'T AFFECTED:
 * - Production builds compile once, no HMR
 * - Process restart = clean slate (old process dies, new one starts fresh)
 * - The static instance pattern works fine without globalThis in production
 * - But using globalThis is harmless in production (just an extra lookup)
 */
const globalForDb = globalThis as unknown as {
  connectionPoolManager: ConnectionPoolManager | undefined;
};

export interface PoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  utilizationPercent: number;
  isAtCapacity: boolean;
}

/**
 * Extended pool metrics for operational monitoring
 * Provides cumulative/historical data instead of point-in-time snapshots
 *
 * @phase Database Manager Enhancement
 */
export interface PoolMetrics {
  // Cumulative counters (since server start)
  totalQueries: number;
  totalErrors: number;
  totalTimeouts: number;
  serverStartTime: Date;

  // Rolling window (last 5 minutes)
  queriesPerMinute: number;
  avgLatencyMs: number;
  p95LatencyMs: number;

  // Peak tracking
  peakActiveConnections: number;
  peakUtilizationPercent: number;
  peakTimestamp: Date | null;

  // Acquisition timing
  avgAcquisitionTimeMs: number;

  // Health indicators
  lastQueryTimestamp: Date | null;
  connectionErrorsLast5Min: number;
}

/**
 * Error log entry for detailed error tracking
 * @phase Database Manager Error Log Enhancement
 */
export interface ErrorLogEntry {
  timestamp: number;
  isoTimestamp: string;
  message: string;
  code?: string;
  context?: string;
}

/**
 * Callback type for persisting errors to database
 * @phase Database Error Persistence Integration
 */
export interface ErrorPersistenceData {
  errorType: string;
  errorMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export type ErrorPersistenceCallback = (_data: ErrorPersistenceData) => Promise<void>;

/**
 * Rate limiting configuration for error persistence
 */
interface ErrorRateLimitConfig {
  maxErrorsPerMinute: number;
  maxErrorsPerTypePerMinute: number;
}

/**
 * Default rate limiting: prevent error storm flooding
 */
const DEFAULT_ERROR_RATE_LIMIT: ErrorRateLimitConfig = {
  maxErrorsPerMinute: 30,        // Max 30 errors total per minute
  maxErrorsPerTypePerMinute: 10  // Max 10 of same error type per minute
};

/**
 * Memory history point for tracking memory over time
 * @phase Database Manager Charts Enhancement
 */
export interface MemoryHistoryPoint {
  timestamp: number;
  value: number;
}

export interface PoolHealthResult {
  healthy: boolean;
  initialized: boolean;
  connected: boolean;
  stats: PoolStats;
  lastSuccessfulQuery: Date | null;
  errors: string[];
}

/**
 * Historical metrics data point for charting
 * @phase Database Manager Charts Enhancement
 * @updated 2026-01-24 - Added p95LatencyMs, poolUtilization, acquisitionTimeMs for expanded charts
 */
export interface MetricsHistoryPoint {
  timestamp: number;
  queriesPerMinute: number;
  avgLatencyMs: number;
  activeConnections: number;
  idleConnections: number;
  errors: number;
  // New fields for expanded Activity Monitor
  p95LatencyMs: number;
  poolUtilizationPercent: number;
  acquisitionTimeMs: number;
}

/**
 * Query type breakdown for activity monitoring
 * @phase Database Manager Charts Enhancement
 */
export interface QueryTypeCounters {
  selects: number;
  inserts: number;
  updates: number;
  deletes: number;
  other: number;
}

/**
 * Historical query type data point
 */
export interface QueryTypeHistoryPoint {
  timestamp: number;
  counts: QueryTypeCounters;
}

class ConnectionPoolManager {
  private pool: mariadb.Pool | null = null;
  private config: DatabaseConfig;
  private initializePromise: Promise<void> | null = null;
  private isShuttingDown: boolean = false;
  private lastSuccessfulQuery: Date | null = null;

  // Metrics tracking for operational monitoring
  private metrics: PoolMetrics;
  private latencyBuffer: number[] = [];
  private acquisitionBuffer: number[] = [];
  private queryTimestamps: number[] = [];
  private errorTimestamps: number[] = [];

  // History tracking for charts (5 minutes at 5-second intervals = 60 points)
  private metricsHistory: MetricsHistoryPoint[] = [];
  private queryTypeCounters: QueryTypeCounters = { selects: 0, inserts: 0, updates: 0, deletes: 0, other: 0 };
  private queryTypeHistory: QueryTypeHistoryPoint[] = [];
  private readonly HISTORY_MAX_POINTS = 60;
  private lastHistorySnapshot: number = 0;

  // Error log tracking for detailed error display
  private errorLog: ErrorLogEntry[] = [];
  private readonly ERROR_LOG_MAX_ENTRIES = 100;

  // Memory history tracking for memory trend chart
  private memoryHistory: MemoryHistoryPoint[] = [];
  private readonly MEMORY_HISTORY_MAX_POINTS = 60;

  // Error persistence callback (wired by ServiceRegistry)
  private errorPersistenceCallback: ErrorPersistenceCallback | null = null;
  private errorRateLimitConfig: ErrorRateLimitConfig = DEFAULT_ERROR_RATE_LIMIT;
  private persistedErrorTimestamps: number[] = [];
  private persistedErrorTypeTimestamps: Map<string, number[]> = new Map();

  /**
   * Private constructor enforces singleton pattern
   */
  private constructor() {
    this.config = getDatabaseConfig();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics with default values
   */
  private initializeMetrics(): PoolMetrics {
    return {
      totalQueries: 0,
      totalErrors: 0,
      totalTimeouts: 0,
      serverStartTime: new Date(),
      queriesPerMinute: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      peakActiveConnections: 0,
      peakUtilizationPercent: 0,
      peakTimestamp: null,
      avgAcquisitionTimeMs: 0,
      lastQueryTimestamp: null,
      connectionErrorsLast5Min: 0,
    };
  }

  /**
   * Get singleton instance
   * GOVERNANCE: All pool access MUST go through this method
   *
   * Uses globalThis to persist across Next.js HMR reloads in development.
   * This prevents connection pool accumulation during development.
   */
  static getInstance(): ConnectionPoolManager {
    // Check globalThis first (survives HMR in development)
    if (globalForDb.connectionPoolManager) {
      return globalForDb.connectionPoolManager;
    }

    // Create new instance and store in globalThis
    const instance = new ConnectionPoolManager();
    globalForDb.connectionPoolManager = instance;

    return instance;
  }

  /**
   * Get the shared connection pool
   * Auto-initializes on first access (thread-safe)
   */
  async getPool(): Promise<mariadb.Pool> {
    if (this.isShuttingDown) {
      throw new Error('ConnectionPoolManager is shutting down');
    }

    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Pool initialization failed');
    }

    return this.pool;
  }

  /**
   * Get REAL-TIME pool statistics
   * Uses mariadb's built-in methods for accurate monitoring
   * @authority database-package-canonical.md
   */
  getPoolStats(): PoolStats {
    const maxConnections = this.config.connectionLimit || 10;

    if (!this.pool) {
      return {
        total: maxConnections,
        active: 0,
        idle: 0,
        waiting: 0,
        utilizationPercent: 0,
        isAtCapacity: false
      };
    }

    // ✅ REAL VALUES from mariadb package
    const active = this.pool.activeConnections();
    const total = this.pool.totalConnections();
    const idle = this.pool.idleConnections();
    const waiting = this.pool.taskQueueSize();

    const utilizationPercent = maxConnections > 0 ? (active / maxConnections) * 100 : 0;
    const isAtCapacity = total >= maxConnections;

    return {
      total,
      active,
      idle,
      waiting,
      utilizationPercent,
      isAtCapacity
    };
  }

  /**
   * Record a query execution for metrics
   * Call this after each query completes
   *
   * @param latencyMs - Query execution time in milliseconds
   */
  recordQueryExecution(latencyMs: number): void {
    this.metrics.totalQueries++;
    this.metrics.lastQueryTimestamp = new Date();

    // Add to rolling buffer (keep last 1000)
    this.latencyBuffer.push(latencyMs);
    if (this.latencyBuffer.length > 1000) {
      this.latencyBuffer.shift();
    }

    this.queryTimestamps.push(Date.now());
    // Remove timestamps older than 5 minutes
    const fiveMinAgo = Date.now() - 300000;
    this.queryTimestamps = this.queryTimestamps.filter(t => t > fiveMinAgo);

    // Update peak if current active > peak
    const currentActive = this.pool?.activeConnections() || 0;
    if (currentActive > this.metrics.peakActiveConnections) {
      this.metrics.peakActiveConnections = currentActive;
      this.metrics.peakUtilizationPercent =
        (currentActive / (this.config.connectionLimit || 10)) * 100;
      this.metrics.peakTimestamp = new Date();
    }
  }

  /**
   * Record connection acquisition time
   *
   * @param timeMs - Time to acquire connection in milliseconds
   */
  recordAcquisitionTime(timeMs: number): void {
    this.acquisitionBuffer.push(timeMs);
    if (this.acquisitionBuffer.length > 100) {
      this.acquisitionBuffer.shift();
    }
  }

  /**
   * Record a connection error (simple - no message)
   */
  recordError(): void {
    this.metrics.totalErrors++;
    this.errorTimestamps.push(Date.now());
    const fiveMinAgo = Date.now() - 300000;
    this.errorTimestamps = this.errorTimestamps.filter(t => t > fiveMinAgo);
  }

  /**
   * Record a detailed error with message
   * Stores in-memory AND persists to database (with rate limiting)
   * @param message - Error message to log
   * @param code - Optional error code
   * @param context - Optional context (e.g., query, operation name)
   */
  recordDetailedError(message: string, code?: string, context?: string): void {
    this.recordError(); // Also record in simple error tracking

    const now = Date.now();
    const entry: ErrorLogEntry = {
      timestamp: now,
      isoTimestamp: new Date(now).toISOString(),
      message,
      code,
      context
    };

    this.errorLog.push(entry);

    // Keep only last N entries
    if (this.errorLog.length > this.ERROR_LOG_MAX_ENTRIES) {
      this.errorLog.shift();
    }

    // Persist to database if callback is set and within rate limits
    if (this.errorPersistenceCallback) {
      this.persistErrorToDatabase(message, code, context);
    }
  }

  /**
   * Set callback for persisting errors to database
   * Called by ServiceRegistry to wire up ErrorTrackingService
   * @param callback - Async function to persist error data
   * @param config - Optional rate limiting configuration
   * @phase Database Error Persistence Integration
   */
  setErrorPersistenceCallback(
    callback: ErrorPersistenceCallback,
    config?: Partial<ErrorRateLimitConfig>
  ): void {
    this.errorPersistenceCallback = callback;
    if (config) {
      this.errorRateLimitConfig = { ...this.errorRateLimitConfig, ...config };
    }
    console.log('[ConnectionPoolManager] Error persistence callback registered');
  }

  /**
   * Check if error persistence is within rate limits
   * @param errorType - Type of error for per-type limiting
   */
  private isWithinRateLimit(errorType: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old timestamps
    this.persistedErrorTimestamps = this.persistedErrorTimestamps.filter(t => t > oneMinuteAgo);

    // Check global rate limit
    if (this.persistedErrorTimestamps.length >= this.errorRateLimitConfig.maxErrorsPerMinute) {
      return false;
    }

    // Clean up and check per-type rate limit
    const typeTimestamps = this.persistedErrorTypeTimestamps.get(errorType) || [];
    const recentTypeTimestamps = typeTimestamps.filter(t => t > oneMinuteAgo);
    this.persistedErrorTypeTimestamps.set(errorType, recentTypeTimestamps);

    if (recentTypeTimestamps.length >= this.errorRateLimitConfig.maxErrorsPerTypePerMinute) {
      return false;
    }

    return true;
  }

  /**
   * Persist error to database via callback (fire-and-forget with rate limiting)
   * @param message - Error message
   * @param code - Error code
   * @param context - Error context (truncated SQL, operation name)
   */
  private persistErrorToDatabase(message: string, code?: string, context?: string): void {
    // Determine error type from code or message
    const errorType = this.classifyErrorType(code, message);

    console.log('[ConnectionPoolManager] persistErrorToDatabase called:', { errorType, message: message.substring(0, 50) });

    // Check rate limits
    if (!this.isWithinRateLimit(errorType)) {
      // Skip persistence but log that we're rate limiting
      console.warn('[ConnectionPoolManager] Error persistence rate limit reached - skipping DB write');
      return;
    }

    // Record timestamps for rate limiting
    const now = Date.now();
    this.persistedErrorTimestamps.push(now);
    const typeTimestamps = this.persistedErrorTypeTimestamps.get(errorType) || [];
    typeTimestamps.push(now);
    this.persistedErrorTypeTimestamps.set(errorType, typeTimestamps);

    // Determine severity based on error type
    const severity = this.classifyErrorSeverity(code, message);

    // Fire-and-forget: don't await, don't block
    this.errorPersistenceCallback!({
      errorType,
      errorMessage: message,
      severity,
      metadata: {
        errorCode: code,
        context: context,
        source: 'ConnectionPoolManager',
        timestamp: new Date().toISOString()
      }
    }).catch(err => {
      // Circuit breaker: log but don't fail
      ErrorService.capture('[ConnectionPoolManager] Failed to persist error to database:', err);
    });
  }

  /**
   * Classify error type from code or message
   */
  private classifyErrorType(code?: string, message?: string): string {
    if (code) {
      // Common MariaDB error codes
      if (code === 'ER_CON_COUNT_ERROR' || code === 'POOL_NOMORE_GETCONN') {
        return 'ConnectionPoolExhausted';
      }
      if (code === 'ECONNREFUSED' || code === 'PROTOCOL_CONNECTION_LOST') {
        return 'ConnectionLost';
      }
      if (code === 'ER_LOCK_DEADLOCK') {
        return 'DeadlockError';
      }
      if (code === 'ER_LOCK_WAIT_TIMEOUT') {
        return 'LockTimeoutError';
      }
      if (code.startsWith('ER_')) {
        return 'DatabaseError';
      }
    }

    // Fallback classification from message
    const msg = message?.toLowerCase() || '';
    if (msg.includes('timeout')) return 'TimeoutError';
    if (msg.includes('connection')) return 'ConnectionError';
    if (msg.includes('deadlock')) return 'DeadlockError';

    return 'DatabaseError';
  }

  /**
   * Classify error severity from code or message
   */
  private classifyErrorSeverity(code?: string, message?: string): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: connection pool exhausted, connection lost
    if (code === 'ER_CON_COUNT_ERROR' || code === 'POOL_NOMORE_GETCONN' ||
        code === 'ECONNREFUSED' || code === 'PROTOCOL_CONNECTION_LOST') {
      return 'critical';
    }

    // High: deadlocks, lock timeouts
    if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT') {
      return 'high';
    }

    // Check message for severity hints
    const msg = message?.toLowerCase() || '';
    if (msg.includes('critical') || msg.includes('fatal')) return 'critical';
    if (msg.includes('timeout') || msg.includes('deadlock')) return 'high';

    // Default to medium for most database errors
    return 'medium';
  }

  /**
   * Get error log entries
   * @param limit - Maximum entries to return (default: 50)
   */
  getErrorLog(limit: number = 50): ErrorLogEntry[] {
    // If there are error timestamps but no error log entries,
    // create placeholder entries for historical errors (pre-upgrade compatibility)
    if (this.errorLog.length === 0 && this.errorTimestamps.length > 0) {
      for (const timestamp of this.errorTimestamps) {
        this.errorLog.push({
          timestamp,
          isoTimestamp: new Date(timestamp).toISOString(),
          message: 'Database error (details not captured - recorded before error logging upgrade)',
          code: undefined,
          context: undefined
        });
      }
    }

    // Return most recent entries first
    return [...this.errorLog].reverse().slice(0, limit);
  }

  /**
   * Record memory usage for history tracking
   * @param usagePercent - Current memory usage percentage
   */
  recordMemoryUsage(usagePercent: number): void {
    const now = Date.now();
    this.memoryHistory.push({
      timestamp: now,
      value: usagePercent
    });

    // Keep only last N points
    if (this.memoryHistory.length > this.MEMORY_HISTORY_MAX_POINTS) {
      this.memoryHistory.shift();
    }
  }

  /**
   * Get memory history for charting
   */
  getMemoryHistory(): MemoryHistoryPoint[] {
    return [...this.memoryHistory];
  }

  /**
   * Get comprehensive pool metrics
   * Returns cumulative and rolling window statistics
   */
  getPoolMetrics(): PoolMetrics {
    const fiveMinAgo = Date.now() - 300000;

    // Calculate queries per minute (last 5 min average)
    const recentQueries = this.queryTimestamps.filter(t => t > fiveMinAgo).length;
    const queriesPerMinute = recentQueries / 5;

    // Calculate latency percentiles
    const sortedLatencies = [...this.latencyBuffer].sort((a, b) => a - b);
    const avgLatencyMs = sortedLatencies.length > 0
      ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
      : 0;
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95LatencyMs = sortedLatencies[p95Index] || 0;

    // Calculate avg acquisition time
    const avgAcquisitionTimeMs = this.acquisitionBuffer.length > 0
      ? this.acquisitionBuffer.reduce((a, b) => a + b, 0) / this.acquisitionBuffer.length
      : 0;

    return {
      ...this.metrics,
      queriesPerMinute: Math.round(queriesPerMinute * 10) / 10,
      avgLatencyMs: Math.round(avgLatencyMs * 10) / 10,
      p95LatencyMs: Math.round(p95LatencyMs * 10) / 10,
      avgAcquisitionTimeMs: Math.round(avgAcquisitionTimeMs * 10) / 10,
      connectionErrorsLast5Min: this.errorTimestamps.filter(t => t > fiveMinAgo).length,
    };
  }

  /**
   * Record query type for activity breakdown
   * @param sql - SQL query string to classify
   */
  recordQueryType(sql: string): void {
    const command = sql.trim().split(/\s+/)[0]?.toUpperCase();
    switch (command) {
      case 'SELECT': this.queryTypeCounters.selects++; break;
      case 'INSERT': this.queryTypeCounters.inserts++; break;
      case 'UPDATE': this.queryTypeCounters.updates++; break;
      case 'DELETE': this.queryTypeCounters.deletes++; break;
      default: this.queryTypeCounters.other++; break;
    }

    // Take periodic snapshots for history (every 5 seconds)
    this.maybeRecordHistorySnapshot();
  }

  /**
   * Take a snapshot of current metrics for history charts
   * Called automatically every 5 seconds during activity
   */
  private maybeRecordHistorySnapshot(): void {
    const now = Date.now();
    if (now - this.lastHistorySnapshot < 5000) {
      return; // Not time for a snapshot yet
    }

    this.lastHistorySnapshot = now;
    const fiveMinAgo = now - 300000;

    // Calculate current metrics for this snapshot
    const recentQueries = this.queryTimestamps.filter(t => t > fiveMinAgo).length;
    const queriesPerMinute = recentQueries / 5;

    const sortedLatencies = [...this.latencyBuffer].sort((a, b) => a - b);
    const avgLatencyMs = sortedLatencies.length > 0
      ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
      : 0;

    const recentErrors = this.errorTimestamps.filter(t => t > now - 60000).length;

    // Calculate P95 latency for history point
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95LatencyMs = sortedLatencies[p95Index] || 0;

    // Calculate pool utilization
    const active = this.pool?.activeConnections() || 0;
    const idle = this.pool?.idleConnections() || 0;
    const maxConnections = this.config.connectionLimit || 10;
    const poolUtilizationPercent = maxConnections > 0 ? (active / maxConnections) * 100 : 0;

    // Calculate average acquisition time
    const avgAcquisitionTimeMs = this.acquisitionBuffer.length > 0
      ? this.acquisitionBuffer.reduce((a, b) => a + b, 0) / this.acquisitionBuffer.length
      : 0;

    // Record metrics history point
    const metricsPoint: MetricsHistoryPoint = {
      timestamp: now,
      queriesPerMinute: Math.round(queriesPerMinute * 10) / 10,
      avgLatencyMs: Math.round(avgLatencyMs * 10) / 10,
      activeConnections: active,
      idleConnections: idle,
      errors: recentErrors,
      // New expanded fields
      p95LatencyMs: Math.round(p95LatencyMs * 10) / 10,
      poolUtilizationPercent: Math.round(poolUtilizationPercent * 10) / 10,
      acquisitionTimeMs: Math.round(avgAcquisitionTimeMs * 10) / 10
    };

    this.metricsHistory.push(metricsPoint);
    if (this.metricsHistory.length > this.HISTORY_MAX_POINTS) {
      this.metricsHistory.shift();
    }

    // Record query type history point
    const queryTypePoint: QueryTypeHistoryPoint = {
      timestamp: now,
      counts: { ...this.queryTypeCounters }
    };

    this.queryTypeHistory.push(queryTypePoint);
    if (this.queryTypeHistory.length > this.HISTORY_MAX_POINTS) {
      this.queryTypeHistory.shift();
    }
  }

  /**
   * Get metrics history for charting
   * Returns up to 60 data points (5 minutes at 5-second intervals)
   */
  getMetricsHistory(): MetricsHistoryPoint[] {
    return [...this.metricsHistory];
  }

  /**
   * Get current query type counters
   */
  getQueryTypeCounts(): QueryTypeCounters {
    return { ...this.queryTypeCounters };
  }

  /**
   * Get query type history for charting
   */
  getQueryTypeHistory(): QueryTypeHistoryPoint[] {
    return [...this.queryTypeHistory];
  }

  /**
   * Perform health check on the pool
   */
  async healthCheck(): Promise<PoolHealthResult> {
    const errors: string[] = [];
    let connected = false;
    let conn: mariadb.PoolConnection | null = null;

    try {
      const pool = await this.getPool();
      conn = await pool.getConnection();
      await conn.query('SELECT 1 as health_check');
      connected = true;
      this.lastSuccessfulQuery = new Date();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Always release connection, even if query fails
      if (conn) {
        conn.release();
      }
    }

    const stats = this.getPoolStats();

    return {
      healthy: connected && !this.isShuttingDown,
      initialized: this.pool !== null,
      connected,
      stats,
      lastSuccessfulQuery: this.lastSuccessfulQuery,
      errors
    };
  }

  /**
   * Gracefully shutdown the pool
   * @param drainTimeoutMs - Time to wait for active queries to complete (default: 5000ms)
   */
  async shutdown(drainTimeoutMs: number = 5000): Promise<void> {
    if (this.isShuttingDown) {
      return; // Already shutting down
    }

    this.isShuttingDown = true;
    console.log('[ConnectionPoolManager] Initiating graceful shutdown...');

    if (this.pool) {
      // Wait for drain timeout to allow active queries to complete
      await new Promise(resolve => setTimeout(resolve, drainTimeoutMs));

      try {
        await this.pool.end();
        console.log('[ConnectionPoolManager] Pool closed successfully');
      } catch (error) {
        ErrorService.capture('[ConnectionPoolManager] Error closing pool:', error);
      }

      this.pool = null;
    }

    // Clear globalThis reference
    globalForDb.connectionPoolManager = undefined;
    this.isShuttingDown = false;
  }

  /**
   * Check if pool is initialized
   */
  isInitialized(): boolean {
    return this.pool !== null;
  }

  /**
   * Get current configuration (read-only)
   */
  getConfig(): Readonly<DatabaseConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Ensure pool is initialized (thread-safe)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.pool) {
      return;
    }

    if (!this.initializePromise) {
      this.initializePromise = this.initialize();
    }

    await this.initializePromise;
  }

  /**
   * Initialize the connection pool
   */
  private async initialize(): Promise<void> {
    console.log('[ConnectionPoolManager] Initializing connection pool...', {
      host: this.config.host,
      database: this.config.database,
      connectionLimit: this.config.connectionLimit
    });

    this.pool = mariadb.createPool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      connectionLimit: this.config.connectionLimit || 100,
      idleTimeout: this.config.idleTimeout || 60000,
      acquireTimeout: this.config.acquireTimeout || 30000,
      // mariadb-specific optimizations
      multipleStatements: false,
      compress: false,

      // Windows compatibility fixes for mariadb package
      // CRITICAL: Prevents GSSAPI auth timeout issues on Windows (30s → <1s)
      permitLocalInfile: false,          // Prevents connection hangs on Windows
      connectTimeout: 10000,             // Faster timeout than default 30s
      initializationTimeout: 10000,      // Fail fast if pool can't initialize
      charset: 'utf8mb4',                // Explicit charset
      collation: 'utf8mb4_unicode_ci',    // Match database collation (prevents UNION collation errors)
      trace: false                       // Disable trace logging
    });

    // Test connection
    try {
      const conn = await this.pool.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      this.lastSuccessfulQuery = new Date();
      console.log('[ConnectionPoolManager] Pool initialized successfully with mariadb');

      // Wire up error persistence immediately after pool is ready
      // This ensures database errors are logged from the very first query
      this.initializeErrorPersistenceEarly();
    } catch (error) {
      ErrorService.capture('[ConnectionPoolManager] Failed to initialize pool:', error);
      this.pool = null;
      throw error;
    }
  }

  /**
   * Initialize error persistence callback early (at pool startup)
   *
   * WHY THIS EXISTS:
   * - Previously, error persistence was only initialized when someone visited /api/admin/database/health
   * - This meant errors occurring before that visit were only logged to memory (volatile)
   * - By initializing here, errors are persisted to the database from the first query
   *
   * CIRCULAR DEPENDENCY PREVENTION:
   * - Uses dynamic import to avoid circular deps at module load time
   * - ServiceRegistry imports ConnectionPoolManager, so we can't import it statically here
   *
   * FALLBACK BEHAVIOR:
   * - If initialization fails, errors still go to in-memory buffer + console
   * - Pool operation is not affected by initialization failures
   *
   * @phase Database Error Persistence Fix - Early Initialization
   */
  private initializeErrorPersistenceEarly(): void {
    // Use dynamic import to avoid circular dependency
    // ServiceRegistry → DatabaseService → ConnectionPoolManager (circular if static)
    import('./ServiceRegistry')
      .then(({ initializeErrorPersistence }) => {
        initializeErrorPersistence();
        console.log('[ConnectionPoolManager] Error persistence initialized at startup');
      })
      .catch(err => {
        // Non-fatal: errors will still go to in-memory buffer + console
        console.warn('[ConnectionPoolManager] Could not initialize error persistence (non-fatal):', err.message);
      });
  }
}

/**
 * Get ConnectionPoolManager singleton
 * GOVERNANCE: MANDATORY for all database pool access
 */
export function getConnectionPoolManager(): ConnectionPoolManager {
  return ConnectionPoolManager.getInstance();
}

export { ConnectionPoolManager };
