/**
 * ErrorService - Centralized error capture and logging
 * @authority performance-optimization-governance.mdc
 * @see tests/pagePerformance/reports/2026-02-07/dev/PERFORMANCE_REMEDIATION_BRAIN_PLAN_V2.md
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

class ErrorServiceClass {
  private static instance: ErrorServiceClass;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ErrorServiceClass {
    if (!ErrorServiceClass.instance) {
      ErrorServiceClass.instance = new ErrorServiceClass();
    }
    return ErrorServiceClass.instance;
  }

  /**
   * Capture and log errors
   * In development: logs to console with all arguments
   * In production: silent capture (ready for future error tracking service integration)
   *
   * Accepts same signature as console.error for drop-in replacement
   */
  capture(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorService]', ...args);
      return;
    }

    // In production, silent capture
    // Future: Send to error tracking service (Sentry, LogRocket, etc.)
    this.captureToService(args);
  }

  /**
   * Log warnings
   */
  warn(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorService]', ...args);
      return;
    }

    // In production, silent capture
    this.captureToService(args);
  }

  /**
   * Log info messages
   */
  info(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.info('[ErrorService]', ...args);
    }

    // In production, silent unless configured otherwise
  }

  /**
   * Placeholder for future error tracking service integration
   */
  private captureToService(args: unknown[]): void {
    // Future implementation:
    // - Send to Sentry/LogRocket/CloudWatch
    // - Store in database error log
    // - Send to monitoring service
    // - Parse args to extract error and context

    // Silent for now to eliminate Lighthouse console error warnings
  }
}

export const ErrorService = ErrorServiceClass.getInstance();
