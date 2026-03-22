/**
 * CSRF Middleware Wrapper
 *
 * Provides middleware wrapper for route handlers to enforce CSRF protection
 * and helper functions for CSRF cookie management.
 */

import { NextResponse } from 'next/server';
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
 * Uses NextResponse.cookies.set() for reliable cookie delivery in standalone mode
 * (raw Set-Cookie headers get lost during Response->NextResponse conversion in apiHandler).
 *
 * @returns NextResponse with CSRF cookie set and token in body
 */
export function csrfCookieResponse(): NextResponse {
  const { name, value } = createCsrfCookie();
  const isProduction = process.env.NODE_ENV === 'production';

  // Use NextResponse with cookies.set() so the cookie survives
  // standalone mode and proxy environments (same mechanism as bk_session)
  const response = NextResponse.json({
    ok: true,
    data: {
      csrfToken: value
    }
  });

  response.cookies.set(name, value, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1800
  });

  return response;
}
