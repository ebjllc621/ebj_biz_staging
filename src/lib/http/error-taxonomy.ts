/**
 * P3.0b Error Taxonomy System
 * Comprehensive error classification for auth validation and runtime input validation
 * Following anti-synthetic-implementation-enforcement and governance constraints
 * 
 * Error Codes:
 * - NOT_IMPLEMENTED: Endpoint properly structured but not yet implemented (501)
 * - VALIDATION_ERROR: Input validation failed (422)
 * - NOT_AUTHENTICATED: Authentication required but not provided (401)
 * - UNAUTHORIZED: Authenticated but insufficient permissions (403)
 * - INVALID_REQUEST: Malformed request structure (400)
 * - INTERNAL_ERROR: Server-side error (500)
 * - SESSION_EXPIRED: Valid session but expired (401)
 * - INVALID_CREDENTIALS: Authentication failed (401)
 * - RATE_LIMITED: Too many requests (429)
 * - NOT_FOUND: Resource not found (404)
 */

// HTTP Status Code constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501
} as const;

// Comprehensive Error Code Taxonomy
export const ERROR_CODES = {
  // Implementation Status
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  
  // Input Validation  
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Authentication & Authorization
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  
  // Rate Limiting & Resources
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// Error code to HTTP status mapping
export const ERROR_STATUS_MAP: Record<string, number> = {
  [ERROR_CODES.NOT_IMPLEMENTED]: HTTP_STATUS.NOT_IMPLEMENTED,
  [ERROR_CODES.VALIDATION_ERROR]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.INVALID_REQUEST]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.INVALID_FORMAT]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.NOT_AUTHENTICATED]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.UNAUTHORIZED]: HTTP_STATUS.FORBIDDEN,
  [ERROR_CODES.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.SESSION_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.SESSION_NOT_FOUND]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.RATE_LIMITED]: HTTP_STATUS.TOO_MANY_REQUESTS,
  [ERROR_CODES.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.RESOURCE_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.INTERNAL_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ERROR_CODES.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ERROR_CODES.NETWORK_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR
};

// Validation error details interface
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

// Enhanced error response interface
export interface EnhancedApiError {
  error: {
    code: string;
    message: string;
    status: number;
    timestamp: string;
    details?: ValidationErrorDetail[];
    endpoint?: string;
  };
  success: false;
}

/**
 * Create enhanced error response with taxonomy support
 */
export function createTaxonomyError(
  code: string,
  message: string,
  details?: ValidationErrorDetail[],
  endpoint?: string
): EnhancedApiError {
  const status = ERROR_STATUS_MAP[code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  
  return {
    error: {
      code,
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(endpoint && { endpoint })
    },
    success: false
  };
}

/**
 * Create validation error with field details
 */
export function createValidationError(
  message: string,
  details: ValidationErrorDetail[],
  endpoint?: string
): EnhancedApiError {
  return createTaxonomyError(
    ERROR_CODES.VALIDATION_ERROR,
    message,
    details,
    endpoint
  );
}

/**
 * Create authentication required error
 */
export function createNotAuthenticatedError(
  message: string = 'Authentication required',
  endpoint?: string
): EnhancedApiError {
  return createTaxonomyError(
    ERROR_CODES.NOT_AUTHENTICATED,
    message,
    undefined,
    endpoint
  );
}

/**
 * Create not implemented error (anti-synthetic enforcement)
 */
export function createNotImplementedError(
  endpoint: string,
  message?: string
): EnhancedApiError {
  return createTaxonomyError(
    ERROR_CODES.NOT_IMPLEMENTED,
    message || `Endpoint ${endpoint} is not yet implemented`,
    undefined,
    endpoint
  );
}

/**
 * Create invalid credentials error
 */
export function createInvalidCredentialsError(
  message: string = 'Invalid credentials provided',
  endpoint?: string
): EnhancedApiError {
  return createTaxonomyError(
    ERROR_CODES.INVALID_CREDENTIALS,
    message,
    undefined,
    endpoint
  );
}

// Export legacy compatibility for backwards compatibility with existing auth contracts
export const AUTH_ERROR_CODES = ERROR_CODES;