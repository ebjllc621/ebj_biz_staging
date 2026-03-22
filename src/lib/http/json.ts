/**
 * Shared HTTP JSON response helpers
 * Provides canonical error and success response shapes
 * Following unified-bizconekt-rules.mdc and osi-production-compliance.mdc
 * Enhanced with P3.0b error taxonomy integration
 */

import type { EnhancedApiError } from './error-taxonomy';

export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
    timestamp: string;
  };
  success: false;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  success: true;
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError | EnhancedApiError;

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 500
): ApiError {
  return {
    error: {
      code,
      message,
      status,
      timestamp: new Date().toISOString()
    },
    success: false
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return {
    data,
    success: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create 501 Not Implemented error response
 * Used for endpoints that are properly structured but not yet implemented
 * Prevents synthetic/fake implementations per anti-synthetic enforcement
 */
export function createNotImplementedResponse(endpoint: string): ApiError {
  return createErrorResponse(
    `Endpoint ${endpoint} is not yet implemented`,
    'NOT_IMPLEMENTED',
    501
  );
}

/**
 * Create 405 Method Not Allowed error response with Allow header
 * Returns canonical JSON error for unsupported HTTP methods
 * Following P3.0c method guard requirements
 */
export function createMethodNotAllowedResponse(endpoint: string, allowedMethods: string[]): ApiError {
  return createErrorResponse(
    `Method not allowed for ${endpoint}. Allowed methods: ${allowedMethods.join(', ')}`,
    'METHOD_NOT_ALLOWED',
    405
  );
}

/**
 * Create method not allowed JSON response with proper Allow header
 * Returns Response object with 405 status and Allow header
 */
export function jsonMethodNotAllowed(allowed: string[]): Response {
  const errorResponse = createMethodNotAllowedResponse('endpoint', allowed);
  
  return new Response(JSON.stringify(errorResponse), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Allow': allowed.join(', '),
      'Cache-Control': 'no-cache'
    }
  });
}

/**
 * Convert error response to Next.js Response object
 * Enhanced to handle P3.0b error taxonomy
 */
export function toJsonResponse(apiResponse: ApiResponse, status?: number): Response {
  const responseStatus = status || ('error' in apiResponse ? apiResponse.error.status : 200);
  
  return new Response(JSON.stringify(apiResponse), {
    status: responseStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

/**
 * Enhanced response helper for EnhancedApiError types
 */
export function toEnhancedJsonResponse(apiResponse: EnhancedApiError | ApiSuccess<unknown>, status?: number): Response {
  return toJsonResponse(apiResponse, status);
}