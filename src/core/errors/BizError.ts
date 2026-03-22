/**
 * BizError - Business Logic Error Class
 *
 * Standardized error handling for business logic violations,
 * service failures, and operational errors.
 *
 * Build Map v2.1 ENHANCED compliance: Structured error handling
 */

export interface BizErrorDetails {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  cause?: Error;
  userMessage?: string;
}

export class BizError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly userMessage?: string;
  public readonly timestamp: Date;

  constructor(details: BizErrorDetails) {
    super(details.message);
    this.name = 'BizError';
    this.code = details.code;
    this.context = details.context;
    this.cause = details.cause;
    this.userMessage = details.userMessage;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BizError);
    }
  }

  /**
   * Create a validation error
   */
  static validation(field: string, value: unknown, reason?: string): BizError {
    return new BizError({
      code: 'VALIDATION_ERROR',
      message: `Validation failed for field "${field}"${reason ? `: ${reason}` : ''}`,
      context: { field, value, reason },
      userMessage: `Invalid ${field}${reason ? `: ${reason}` : ''}`
    });
  }

  /**
   * Create a not found error
   */
  static notFound(resource: string, id?: string | number): BizError {
    return new BizError({
      code: 'NOT_FOUND',
      message: `${resource} not found${id ? ` with id: ${id}` : ''}`,
      context: { resource, id },
      userMessage: `${resource} not found`
    });
  }

  /**
   * Create an access denied error
   */
  static accessDenied(action: string, resource?: string): BizError {
    return new BizError({
      code: 'ACCESS_DENIED',
      message: `Access denied for action: ${action}${resource ? ` on ${resource}` : ''}`,
      context: { action, resource },
      userMessage: 'You do not have permission to perform this action'
    });
  }

  /**
   * Create a service unavailable error
   */
  static serviceUnavailable(service: string, cause?: Error): BizError {
    return new BizError({
      code: 'SERVICE_UNAVAILABLE',
      message: `Service ${service} is currently unavailable`,
      context: { service },
      cause,
      userMessage: 'This service is temporarily unavailable. Please try again later.'
    });
  }

  /**
   * Create an internal server error
   * Used for unexpected failures in services
   */
  static internalServerError(service: string, cause?: Error): BizError {
    return new BizError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Internal server error in ${service}`,
      context: { service },
      cause,
      userMessage: 'An unexpected error occurred. Please try again later.'
    });
  }

  /**
   * Create a generic internal error (alias for consistency)
   * Used by DatabaseService and SessionService
   */
  static internalError(service: string, cause: Error): BizError {
    return new BizError({
      code: 'INTERNAL_ERROR',
      message: `Internal error in ${service}: ${cause.message}`,
      context: { service, originalError: cause.message },
      cause,
      userMessage: 'An internal error occurred. Please contact support if this persists.'
    });
  }

  /**
   * Create a bad request error
   * Used for invalid client input
   */
  static badRequest(message: string, context?: Record<string, unknown>): BizError {
    return new BizError({
      code: 'BAD_REQUEST',
      message,
      context,
      userMessage: message // Client error, safe to expose
    });
  }

  /**
   * Create an unauthorized error
   * Used when authentication is required but missing/invalid
   */
  static unauthorized(reason?: string): BizError {
    return new BizError({
      code: 'UNAUTHORIZED',
      message: reason || 'Authentication required',
      context: { reason },
      userMessage: reason || 'You must be logged in to access this resource'
    });
  }

  /**
   * Create a forbidden error
   * Used when authentication exists but authorization fails
   */
  static forbidden(action: string, resource?: string): BizError {
    return new BizError({
      code: 'FORBIDDEN',
      message: `Forbidden: cannot ${action}${resource ? ` on ${resource}` : ''}`,
      context: { action, resource },
      userMessage: 'You do not have permission to perform this action'
    });
  }

  /**
   * Create a database error
   * Used for database operation failures
   */
  static databaseError(operation: string, cause: Error): BizError {
    return new BizError({
      code: 'DATABASE_ERROR',
      message: `Database operation failed: ${operation}`,
      context: {
        operation,
        sqlError: cause.message
      },
      cause,
      userMessage: 'A database error occurred. Please try again later.'
    });
  }

  /**
   * Create an account suspended error
   * Used when attempting to access a suspended account
   */
  static accountSuspended(username: string, reason: string | null): BizError {
    return new BizError({
      code: 'ACCOUNT_SUSPENDED',
      message: 'This account is currently suspended',
      context: {
        username,
        displayUsername: `@${username}`,
        reason,
        type: 'suspended'
      },
      userMessage: 'This account is currently suspended'
    });
  }

  /**
   * Create an account deleted error
   * Used when attempting to access a deleted account
   */
  static accountDeleted(username: string): BizError {
    return new BizError({
      code: 'ACCOUNT_DELETED',
      message: 'This account has been permanently removed',
      context: {
        username,
        displayUsername: `@${username}`,
        type: 'deleted'
      },
      userMessage: 'This account has been permanently removed'
    });
  }
}