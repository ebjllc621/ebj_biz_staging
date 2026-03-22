/**
 * Standard API Response Helpers
 * @module @core/api/responseHelpers
 * @governance Build Map v2.1 - API Standards
 *
 * Provides standardized response formatting for API routes.
 * Works in conjunction with apiHandler wrapper.
 */

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Create standardized success response
 * @param data - Response payload
 * @param status - HTTP status code (default: 200)
 * @returns Response object with proper headers and JSON body
 *
 * @example
 * ```typescript
 * export const GET = apiHandler(async (req) => {
 *   const users = await UserService.getAll();
 *   return createSuccessResponse(users);
 * });
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): Response {
  const body: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create standardized error response
 * @param error - Error object or message
 * @param status - HTTP status code (default: 400)
 * @returns Response object with proper headers and JSON error body
 *
 * @example
 * ```typescript
 * export const POST = apiHandler(async (req) => {
 *   try {
 *     // ... operation
 *   } catch (error) {
 *     return createErrorResponse(error as Error, 500);
 *   }
 * });
 * ```
 */
export function createErrorResponse(
  error: Error | string,
  status: number = 400
): Response {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorCode = error instanceof Error && 'code' in error
    ? (error as Error & { code?: string }).code
    : undefined;

  const body: ErrorResponse = {
    success: false,
    error: {
      message: errorMessage,
      code: errorCode,
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
