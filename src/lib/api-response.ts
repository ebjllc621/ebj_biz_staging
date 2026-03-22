/**
 * API Response Utilities - Standardized API response formats
 *
 * @authority admin-manager-api-standard.mdc
 * @governance Build Map v2.1 ENHANCED - Consistent API responses
 * @see .cursor/rules/admin-manager-api-standard.mdc for complete specifications
 *
 * PURPOSE:
 * - Provide standardized success/error response formats
 * - Ensure consistency across all API routes
 * - Support both data payload and message responses
 * - Include error codes for client-side handling
 *
 * USAGE:
 * ```typescript
 * // Success with data
 * return NextResponse.json(
 *   createSuccessResponse({ user }, 'User created successfully')
 * );
 *
 * // Error with code
 * return NextResponse.json(
 *   createErrorResponse('Email already exists', 'EMAIL_EXISTS'),
 *   { status: 400 }
 * );
 * ```
 */

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  ok: true;
  success: true; // Legacy support
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  ok: false;
  success: false; // Legacy support
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Create standardized success response
 *
 * @param data - Optional data payload to include in response
 * @param message - Optional success message
 * @returns Standardized success response object
 *
 * @example
 * ```typescript
 * // With data and message
 * createSuccessResponse({ userId: 123 }, 'User created successfully')
 *
 * // With data only
 * createSuccessResponse({ users: [...] })
 *
 * // With message only
 * createSuccessResponse(undefined, 'Operation completed')
 * ```
 */
export function createSuccessResponse<T = unknown>(
  data?: T,
  message?: string
): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    ok: true,
    success: true,
    timestamp: new Date().toISOString()
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Create standardized error response
 *
 * @param message - Error message (user-friendly)
 * @param code - Optional error code for client-side handling
 * @param details - Optional additional error details
 * @returns Standardized error response object
 *
 * @example
 * ```typescript
 * // With code
 * createErrorResponse('Email already exists', 'EMAIL_EXISTS')
 *
 * // With details
 * createErrorResponse('Validation failed', 'VALIDATION_ERROR', {
 *   fields: ['email', 'password']
 * })
 *
 * // Simple error
 * createErrorResponse('Something went wrong')
 * ```
 */
export function createErrorResponse(
  message: string,
  code?: string,
  details?: unknown
): ErrorResponse {
  return {
    ok: false,
    success: false,
    error: {
      message,
      code,
      details
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Type guard to check if response is a success response
 *
 * @param response - API response to check
 * @returns True if response indicates success
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.ok === true;
}

/**
 * Type guard to check if response is an error response
 *
 * @param response - API response to check
 * @returns True if response indicates error
 */
export function isErrorResponse(
  response: ApiResponse
): response is ErrorResponse {
  return response.ok === false;
}

/**
 * Extract error message from API response
 *
 * @param response - API response to extract error from
 * @param defaultMessage - Default message if extraction fails
 * @returns Error message string
 */
export function extractErrorMessage(
  response: ApiResponse,
  defaultMessage: string = 'An error occurred'
): string {
  if (isErrorResponse(response)) {
    return response.error.message || defaultMessage;
  }
  return defaultMessage;
}

/**
 * Extract data from success response with type safety
 *
 * @param response - API response to extract data from
 * @returns Data if successful, undefined otherwise
 */
export function extractData<T>(response: ApiResponse<T>): T | undefined {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  return undefined;
}
