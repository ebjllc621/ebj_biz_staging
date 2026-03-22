/**
 * CSRF Token Endpoint
 *
 * Provides CSRF tokens to clients via secure httpOnly cookies.
 * Clients should call this endpoint before submitting state-changing requests.
 */

import { csrfCookieResponse } from '@/lib/security/withCsrf';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';

export const runtime = 'nodejs';

/**
 * GET /api/auth/csrf
 *
 * Issues a new CSRF token as a secure httpOnly cookie.
 * Returns 204 No Content with Set-Cookie header.
 *
 * Security attributes:
 * - HttpOnly: Prevents JavaScript access
 * - SameSite=Lax: CSRF protection
 * - Secure: HTTPS only
 * - Max-Age=1800: 30-minute expiration
 */
async function csrfHandler(context: ApiContext): Promise<Response> {
  return csrfCookieResponse();
}

export const GET = apiHandler(csrfHandler, {
  allowedMethods: ['GET'],
  requireAuth: false
});