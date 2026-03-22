/**
 * Centralized Database Configuration
 * Single source of truth for all database connection settings
 *
 * @governance Phase R2.4 - Environment Configuration Security
 * @see docs/codeReview/12-8-25/phases/R2_BRAIN_PLAN.md
 * @authority Build Map v2.1 ENHANCED - Configuration management
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit?: number;
  waitForConnections?: boolean;
  queueLimit?: number;
  // Enhanced pool settings (Phase 1)
  maxIdle?: number;
  idleTimeout?: number;
  acquireTimeout?: number;
}

/**
 * Get database configuration from environment variables
 * with secure defaults and validation
 *
 * @throws {Error} If required environment variables are missing in production
 * @returns {DatabaseConfig} Validated database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  // Required environment variables
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  // Validate required fields in production
  if (isProduction) {
    if (!host || !database || !user) {
      throw new Error(
        'Missing required database environment variables in production. ' +
        'Required: DB_HOST, DB_NAME, DB_USER'
      );
    }

    if (!password) {
    }
  }

  // Parse port with validation
  const portStr = process.env.DB_PORT || '3306';
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid DB_PORT: ${portStr}. Must be a number between 1-65535.`);
  }

  // Parse connection pool settings
  const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);
  const queueLimit = parseInt(process.env.DB_QUEUE_LIMIT || '0', 10);
  const maxIdle = parseInt(process.env.DB_MAX_IDLE || '20', 10);
  const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10);
  const acquireTimeout = parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10);

  return {
    host: host || 'localhost',
    port,
    database: database || 'biz_dev',
    user: user || 'mysql',
    password: password || '',
    connectionLimit: isNaN(connectionLimit) ? 10 : connectionLimit,
    waitForConnections: true,
    queueLimit: isNaN(queueLimit) ? 0 : queueLimit,
    maxIdle: isNaN(maxIdle) ? 20 : maxIdle,
    idleTimeout: isNaN(idleTimeout) ? 60000 : idleTimeout,
    acquireTimeout: isNaN(acquireTimeout) ? 30000 : acquireTimeout,
  };
}

/**
 * Get learning database configuration
 * Used by BuildChat and hybrid intelligence systems
 *
 * @returns {DatabaseConfig} Learning database configuration
 */
export function getLearningDatabaseConfig(): DatabaseConfig {
  const portStr = process.env.LEARNING_DB_PORT || '3306';
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid LEARNING_DB_PORT: ${portStr}. Must be a number between 1-65535.`);
  }

  return {
    host: process.env.LEARNING_DB_HOST || 'localhost',
    port,
    database: process.env.LEARNING_DB_NAME || 'buildchat',
    user: process.env.LEARNING_DB_USER || 'mysql',
    password: process.env.LEARNING_DB_PASSWORD || '',
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0,
  };
}

/**
 * Validate database configuration at startup
 * Call this during application initialization
 *
 * @throws {Error} If configuration is invalid
 */
export function validateDatabaseConfig(): void {
  try {
    const config = getDatabaseConfig();

    // Verify required fields
    if (!config.host || !config.database || !config.user) {
      throw new Error('Database configuration is incomplete');
    }

    // Validate port range
    if (config.port < 1 || config.port > 65535) {
      throw new Error(`Invalid database port: ${config.port}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Health monitoring threshold configuration
 * @phase Phase 4 - Database Health Monitoring
 */
export interface HealthThresholdsConfig {
  poolUtilization: { warning: number; critical: number };
  cacheHitRate: { warning: number; critical: number };
  queryLatency: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
}

/**
 * Get health monitoring thresholds from environment variables
 * @phase Phase 4 - Database Health Monitoring
 */
export function getHealthThresholdsConfig(): HealthThresholdsConfig {
  return {
    poolUtilization: {
      warning: parseInt(process.env.HEALTH_POOL_WARNING_THRESHOLD || '70'),
      critical: parseInt(process.env.HEALTH_POOL_CRITICAL_THRESHOLD || '90')
    },
    cacheHitRate: {
      warning: parseInt(process.env.HEALTH_CACHE_WARNING_THRESHOLD || '30'),
      critical: parseInt(process.env.HEALTH_CACHE_CRITICAL_THRESHOLD || '10')
    },
    queryLatency: {
      warning: parseInt(process.env.HEALTH_LATENCY_WARNING_MS || '200'),
      critical: parseInt(process.env.HEALTH_LATENCY_CRITICAL_MS || '500')
    },
    memoryUsage: {
      warning: parseInt(process.env.HEALTH_MEMORY_WARNING_PERCENT || '70'),
      critical: parseInt(process.env.HEALTH_MEMORY_CRITICAL_PERCENT || '90')
    }
  };
}
