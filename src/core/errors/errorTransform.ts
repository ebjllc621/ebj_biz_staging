/**
 * Error Transformation Utilities
 *
 * Standardized error transformation for catch blocks
 * Build Map v2.1 ENHANCED compliance: Type-safe error handling
 *
 * @module errorTransform
 */

import { BizError } from './BizError';

/**
 * Transform unknown error to BizError with proper typing
 *
 * Handles all error types from catch blocks:
 * - BizError instances (passed through unchanged)
 * - Error instances (wrapped with stack trace preservation)
 * - Unknown types (converted to Error then wrapped)
 *
 * @param error - Unknown error from catch block
 * @param operation - Operation that failed (e.g., 'create', 'update', 'delete')
 * @param context - Additional context for debugging
 * @returns Typed BizError instance
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error: unknown) {
 *   throw transformToBizError(error, 'create', { resource: 'user', userId: 123 });
 * }
 * ```
 */
export function transformToBizError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
): BizError {
  // If already BizError, return unchanged
  if (error instanceof BizError) {
    return error;
  }

  // If Error instance, preserve stack trace
  if (error instanceof Error) {
    return BizError.databaseError(operation, error);
  }

  // Unknown error type, create generic error
  const genericError = new Error(String(error));
  return BizError.internalError(
    `Unknown error during ${operation}`,
    genericError
  );
}

/**
 * Type guard for BizError
 *
 * @param error - Unknown error to check
 * @returns True if error is BizError instance
 *
 * @example
 * ```typescript
 * if (isBizError(error)) {
 *   console.log(error.code, error.context);
 * }
 * ```
 */
export function isBizError(error: unknown): error is BizError {
  return error instanceof BizError;
}

/**
 * Extract error message safely from unknown error
 *
 * @param error - Unknown error
 * @returns Error message string
 *
 * @example
 * ```typescript
 * const message = getErrorMessage(error);
 * console.error('Operation failed:', message);
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Extract stack trace safely from unknown error
 *
 * @param error - Unknown error
 * @returns Stack trace string or undefined
 *
 * @example
 * ```typescript
 * const stack = getErrorStack(error);
 * if (stack) {
 *   console.error('Stack trace:', stack);
 * }
 * ```
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}
