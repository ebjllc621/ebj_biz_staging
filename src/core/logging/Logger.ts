/**
 * Logger Interface - Structured Logging Contract
 *
 * Defines standardized logging interface for services.
 * Build Map v2.1 ENHANCED compliance: Structured logging
 *
 * Target: Production-ready with multiple log levels and context
 *
 * Log Level Configuration:
 * Set LOG_LEVEL in .env.local to control output verbosity:
 * - error: Only errors
 * - warn: Errors and warnings
 * - info: Errors, warnings, and info (default for development)
 * - debug: All logs including debug (very verbose)
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Log level priority (lower = more severe, always shown)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Get the configured log level from environment
 * Defaults to 'info' for development, 'warn' for production
 */
function getConfiguredLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;

  if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }

  // Default based on NODE_ENV
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
}

/**
 * Check if a message at the given level should be logged
 */
function shouldLog(messageLevel: LogLevel): boolean {
  const configuredLevel = getConfiguredLogLevel();
  return LOG_LEVEL_PRIORITY[messageLevel] <= LOG_LEVEL_PRIORITY[configuredLevel];
}

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  // Phase 3: Extended for type safety - custom properties used across auth routes
  email?: string;           // Used in auth routes for email logging
  token?: string;           // Used in token-based operations (password reset, verification)
  error?: string | Error;   // Used in error contexts
  [key: string]: unknown;   // Index signature for flexibility and future extensions
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: LogContext;
  error?: Error;
}

/**
 * Core logging interface for all services
 */
export interface Logger {
  /**
   * Log an error with optional context
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * Log a warning with optional context
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log informational message with optional context
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log debug information with optional context
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Create a child logger with inherited context
   */
  child(context: LogContext): Logger;
}

/**
 * Simple console logger implementation with log level filtering
 *
 * Respects LOG_LEVEL environment variable:
 * - error: Only errors shown
 * - warn: Errors and warnings
 * - info: Errors, warnings, and info (default)
 * - debug: All logs including debug
 */
export class ConsoleLogger implements Logger {
  constructor(private baseContext?: LogContext) {}

  error(message: string, error?: Error, context?: LogContext): void {
    // Errors are always logged
    if (!shouldLog('error')) return;

    const combinedContext = { ...this.baseContext, ...context };
    // eslint-disable-next-line no-console -- Logger implementation uses console
    console.error(`[ERROR] ${message}`, {
      context: combinedContext,
      error: error?.stack || error?.message,
      timestamp: new Date().toISOString()
    });
  }

  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;

    const combinedContext = { ...this.baseContext, ...context };
    // eslint-disable-next-line no-console -- Logger implementation uses console
    console.warn(`[WARN] ${message}`, {
      context: combinedContext,
      timestamp: new Date().toISOString()
    });
  }

  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;

    const combinedContext = { ...this.baseContext, ...context };
    // eslint-disable-next-line no-console -- Logger implementation uses console
    console.info(`[INFO] ${message}`, {
      context: combinedContext,
      timestamp: new Date().toISOString()
    });
  }

  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;

    const combinedContext = { ...this.baseContext, ...context };
    // eslint-disable-next-line no-console -- Logger implementation uses console
    console.debug(`[DEBUG] ${message}`, {
      context: combinedContext,
      timestamp: new Date().toISOString()
    });
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.baseContext, ...context });
  }
}

/**
 * Default logger instance for immediate use
 */
export const logger = new ConsoleLogger();
