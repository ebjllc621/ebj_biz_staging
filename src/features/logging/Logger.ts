/**
 * AUTH-P1-1F-001: Logger port with adapter implementations
 *
 * @fileoverview Provides Logger port interface with ConsoleLogger and NoopLogger
 * implementations, plus factory for environment-based selection.
 *
 * @governance OSI Production L7: Application-layer structured logging
 * @authority .cursor/rules/service-architecture-standards.mdc
 */

import { EventCode } from './EventCodes';
import { createSafeAuditContext } from './redact';

/**
 * Audit log entry structure for consistent JSON output.
 *
 * All fields except 'ts' and 'event' are optional to support
 * different audit scenarios across auth flows.
 */
export interface AuditLogEntry {
  /** ISO timestamp when event occurred */
  ts: string;
  /** Stable event code from EventCodes */
  event: EventCode;
  /** User ID if user context available */
  userId?: string;
  /** Redacted email address */
  email?: string;
  /** Masked IP address */
  ip?: string;
  /** Truncated User-Agent string */
  ua?: string;
  /** Additional sanitized metadata */
  meta?: Record<string, unknown>;
}

/**
 * Logger port interface for audit logging operations.
 *
 * Provides abstraction for different logging implementations
 * while ensuring consistent audit log structure.
 */
export interface LoggerPort {
  /**
   * Emits an audit log entry with automatic redaction.
   *
   * @param _event - Stable event code
   * @param _context - Raw context data (will be redacted)
   */
  emit(_event: EventCode, _context?: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    meta?: Record<string, unknown>;
  }): void;
}

/**
 * No-op logger implementation for environments where audit logging is disabled.
 *
 * Provides a safe default that doesn't produce any output but satisfies
 * the LoggerPort interface for dependency injection.
 */
export class NoopLogger implements LoggerPort {
  /**
   * No-op implementation that discards all log entries.
   *
   * @param _event - Event code (ignored)
   * @param _context - Context data (ignored)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emit(_event: EventCode, _context?: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    meta?: Record<string, unknown>;
  }): void {
    // Intentionally empty - no logging performed
  }
}

/**
 * Console-based logger implementation for development and production.
 *
 * Outputs single-line JSON with automatic PII redaction following
 * OSI L6 session-layer privacy requirements.
 */
export class ConsoleLogger implements LoggerPort {
  /**
   * Emits audit log entry as single-line JSON to console.
   *
   * Applies automatic redaction to all PII fields and ensures
   * stable JSON structure for parsing by log aggregators.
   *
   * @param event - Stable event code
   * @param context - Raw context data (will be redacted)
   */
  emit(event: EventCode, context?: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    meta?: Record<string, unknown>;
  }): void {
    // Create base audit entry with required fields
    const auditEntry: AuditLogEntry = {
      ts: new Date().toISOString(),
      event
    };

    // Add optional user ID if provided
    if (context?.userId) {
      auditEntry.userId = context.userId;
    }

    // Apply redaction to PII fields if context provided
    if (context) {
      const safeContext = createSafeAuditContext({
        email: context.email,
        ip: context.ip,
        userAgent: context.userAgent,
        meta: context.meta
      });

      // Add redacted fields to audit entry
      if (safeContext.email) {
        auditEntry.email = safeContext.email;
      }

      if (safeContext.ip) {
        auditEntry.ip = safeContext.ip;
      }

      if (safeContext.userAgent) {
        auditEntry.ua = safeContext.userAgent;
      }

      if (safeContext.meta && Object.keys(safeContext.meta).length > 0) {
        auditEntry.meta = safeContext.meta;
      }
    }

    // Output as single-line JSON for log parsing
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(auditEntry));
  }
}

/**
 * Logger factory that selects appropriate implementation based on environment.
 *
 * Production and development use ConsoleLogger for actual audit trails.
 * Test environment uses NoopLogger to avoid polluting test output.
 *
 * @param environment - Environment string (defaults to NODE_ENV)
 * @returns Appropriate logger implementation
 */
export function createLogger(environment?: string): LoggerPort {
  const env = environment || process.env.NODE_ENV || 'development';

  // Use NoopLogger in test environment to avoid test output pollution
  if (env === 'test') {
    return new NoopLogger();
  }

  // Use ConsoleLogger for development and production
  return new ConsoleLogger();
}

/**
 * Default logger instance for immediate use.
 *
 * Uses factory to create environment-appropriate logger.
 * Can be imported directly for simple use cases.
 */
export const defaultLogger = createLogger();

/**
 * Type guard to check if a logger is the noop implementation.
 *
 * Useful for testing and conditional logging behavior.
 *
 * @param logger - Logger instance to check
 * @returns True if logger is NoopLogger instance
 */
export function isNoopLogger(logger: LoggerPort): logger is NoopLogger {
  return logger instanceof NoopLogger;
}

/**
 * Type guard to check if a logger is the console implementation.
 *
 * Useful for testing and conditional logging behavior.
 *
 * @param logger - Logger instance to check
 * @returns True if logger is ConsoleLogger instance
 */
export function isConsoleLogger(logger: LoggerPort): logger is ConsoleLogger {
  return logger instanceof ConsoleLogger;
}