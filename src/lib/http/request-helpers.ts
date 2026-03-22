/**
 * P3.0b HTTP Request Helpers
 * Runtime input validation and authentication helpers
 * Following anti-synthetic-implementation-enforcement - provides real validation, not fake systems
 * 
 * Functions:
 * - readJson: Safe JSON parsing with validation
 * - requireAuth: Authentication presence validation
 * - validateRequiredFields: Field presence validation
 */

import { NextRequest } from 'next/server';
import type { EnhancedApiError, ValidationErrorDetail } from './error-taxonomy';
import { 
  createValidationError, 
  createNotAuthenticatedError
} from './error-taxonomy';

/**
 * Safely parse JSON from request with validation
 * Returns parsed data or validation error details
 */
export async function readJson<T = unknown>(
  request: NextRequest
): Promise<{ data: T } | { error: EnhancedApiError }> {
  try {
    // Check Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        error: createValidationError(
          'Invalid Content-Type. Expected application/json',
          [{
            field: 'Content-Type',
            message: 'Must be application/json',
            value: contentType
          }],
          request.url
        )
      };
    }

    // Attempt to parse JSON
    const data = await request.json();
    
    // Basic validation - ensure we have an object
    if (typeof data !== 'object' || data === null) {
      return {
        error: createValidationError(
          'Request body must be a valid JSON object',
          [{
            field: 'body',
            message: 'Must be a valid JSON object',
            value: typeof data
          }],
          request.url
        )
      };
    }

    return { data: data as T };
    
  } catch (error) {
    // JSON parsing failed
    return {
      error: createValidationError(
        'Invalid JSON in request body',
        [{
          field: 'body',
          message: 'Failed to parse JSON',
          value: error instanceof Error ? error.message : 'Parse error'
        }],
        request.url
      )
    };
  }
}

/**
 * Check for authentication presence (headers, cookies, etc.)
 * Returns authentication status - does NOT implement actual auth logic
 * This is validation only, not synthetic authentication
 */
export function requireAuth(
  request: NextRequest
): { authenticated: true } | { error: EnhancedApiError } {
  
  // Check for Authorization header
  const authHeader = request.headers.get('authorization');
  
  // Check for session cookie (common pattern)
  const sessionCookie = request.cookies.get('session');
  
  // Check for any authentication presence
  const hasAuth = !!(authHeader || sessionCookie);
  
  if (!hasAuth) {
    return {
      error: createNotAuthenticatedError(
        'Authentication required. Provide Authorization header or session cookie.',
        request.url
      )
    };
  }

  // Authentication presence validated - return success
  // NOTE: This does NOT validate the actual credentials (anti-synthetic enforcement)
  // Real credential validation would be implemented in actual auth service
  return { authenticated: true };
}

/**
 * Validate required fields in parsed data
 * Lightweight TypeScript/JavaScript guards for runtime validation
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[],
  endpoint?: string
): { valid: true; data: T } | { error: EnhancedApiError } {
  
  const errors: ValidationErrorDetail[] = [];
  
  for (const field of requiredFields) {
    const value = data[field];
    
    // Check for missing or empty values
    if (value === undefined || value === null || value === '') {
      errors.push({
        field: String(field),
        message: 'This field is required',
        value
      });
    }
  }
  
  if (errors.length > 0) {
    return {
      error: createValidationError(
        `Missing required fields: ${errors.map(e => e.field).join(', ')}`,
        errors,
        endpoint
      )
    };
  }
  
  return { valid: true, data };
}

/**
 * Validate email format using lightweight regex
 * Basic email validation for runtime checks
 */
export function validateEmail(
  email: string,
  fieldName: string = 'email'
): ValidationErrorDetail | null {
  
  if (!email) {
    return {
      field: fieldName,
      message: 'Email is required',
      value: email
    };
  }
  
  // Basic email regex - not comprehensive but sufficient for runtime validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      field: fieldName,
      message: 'Invalid email format',
      value: email
    };
  }
  
  return null;
}

/**
 * Validate password requirements
 * Basic password validation for runtime checks
 */
export function validatePassword(
  password: string,
  fieldName: string = 'password'
): ValidationErrorDetail | null {
  
  if (!password) {
    return {
      field: fieldName,
      message: 'Password is required',
      value: '[REDACTED]'
    };
  }
  
  if (typeof password !== 'string') {
    return {
      field: fieldName,
      message: 'Password must be a string',
      value: '[REDACTED]'
    };
  }
  
  if (password.length < 1) {
    return {
      field: fieldName,
      message: 'Password cannot be empty',
      value: '[REDACTED]'
    };
  }
  
  return null;
}

/**
 * Create comprehensive field validation
 * Combines multiple field validators for complex validation
 */
export function validateLoginFields(
  data: unknown,
  endpoint?: string
): { valid: true; data: { email: string; password: string; rememberMe?: boolean } } | { error: EnhancedApiError } {
  
  const errors: ValidationErrorDetail[] = [];
  
  // Type guard for basic object structure
  if (!data || typeof data !== 'object') {
    return {
      error: createValidationError(
        'Request body must be an object',
        [{
          field: 'body',
          message: 'Must be an object',
          value: typeof data
        }],
        endpoint
      )
    };
  }
  
  // Cast to record for property access
  const dataRecord = data as Record<string, unknown>;
  
  // Validate email
  const emailError = validateEmail(dataRecord.email as string);
  if (emailError) {
    errors.push(emailError);
  }
  
  // Validate password
  const passwordError = validatePassword(dataRecord.password as string);
  if (passwordError) {
    errors.push(passwordError);
  }
  
  // Validate rememberMe if present
  if (dataRecord.rememberMe !== undefined && typeof dataRecord.rememberMe !== 'boolean') {
    errors.push({
      field: 'rememberMe',
      message: 'Must be a boolean',
      value: dataRecord.rememberMe
    });
  }
  
  if (errors.length > 0) {
    return {
      error: createValidationError(
        'Login validation failed',
        errors,
        endpoint
      )
    };
  }
  
  return {
    valid: true,
    data: {
      email: dataRecord.email as string,
      password: dataRecord.password as string,
      ...(dataRecord.rememberMe !== undefined && { rememberMe: dataRecord.rememberMe as boolean })
    }
  };
}