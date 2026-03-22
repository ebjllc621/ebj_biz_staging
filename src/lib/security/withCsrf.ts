/**
 * CSRF Middleware Wrapper
 *
 * Provides middleware wrapper for route handlers to enforce CSRF protection
 * and helper functions for CSRF cookie management.
 */

import { validateCsrf, cookieName, createCsrfCookie, headerName } from './csrf';
import { toResponse } from '../api/errorEnvelope';

/**
 * CSRF middleware wrapper for route handlers
 *
 * Wraps a route handler to enforce CSRF protection using double-submit pattern.
 * Returns 403 with error envelope if CSRF validation fails.
 *
 * Phase 3: Updated to accept generic types for NextRequest/NextResponse compatibility
 * @param handler - The route handler to protect
 * @returns Protected route handler function
 */
export function withCsrf<
  TRequest extends Request = Request,
  TResponse extends Response = Response
>(handler: (req: TRequest) => Promise<TResponse>) {
  return async function(req: TRequest): Promise<TResponse | Response> {
    // Validate CSRF using double-submit pattern
    // NextRequest extends Request, so this works for both types
    if (!validateCsrf(req as Request)) {
      return toResponse(403, {
        code: 'CSRF_FORBIDDEN',
        message: `Missing or invalid ${headerName()}.`
      }) as TResponse | Response;
    }

    // CSRF validation passed, execute the original handler
    return handler(req);
  };
}

/**
 * Helper function to build a Response that sets the CSRF cookie
 *
 * Creates a 200 OK response with secure CSRF cookie set AND token in body.
 * Used by the CSRF endpoint to provide tokens to clients.
 *
 * Note: Returns token in response body for client-side double-submit pattern.
 * The cookie is HttpOnly (not readable by JS), so client uses body token for header.
 * Server validates header matches cookie (double-submit pattern).
 *
 * @returns Response with CSRF cookie set and token in body
 */
export function csrfCookieResponse(): Response {
  const { name, value, attributes } = createCsrfCookie();

  // Return both cookie AND token in body
  // Client reads token from body to send in X-CSRF-Token header
  // Server compares header with HttpOnly cookie
  const body = JSON.stringify({
    ok: true,
    data: {
      csrfToken: value
    }
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'set-cookie': `${name}=${value}; ${attributes}`
    }
  });
}
