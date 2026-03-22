/**
 * CSRF Token Endpoint
 *
 * Provides CSRF tokens to clients via secure httpOnly cookies.
 * Clients should call this endpoint before submitting state-changing requests.
 */

import { NextResponse } from 'next/server';
import { csrfCookieResponse } from '@/lib/security/withCsrf';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';

export const runtime = 'nodejs';

/**
 * GET /api/auth/csrf
 *
 * Issues a new CSRF token as a secure httpOnly cookie.
 * Uses NextResponse.cookies.set() for reliable cookie delivery in standalone mode.
 *
 * Security attributes:
 * - HttpOnly: Prevents JavaScript access
 * - SameSite=Lax: CSRF protection
 * - Secure: HTTPS only (production)
 * - Max-Age=1800: 30-minute expiration
 */
async function csrfHandler(context: ApiContext): Promise<NextResponse> {
  return csrfCookieResponse();
}

export const GET = apiHandler(csrfHandler, {
  allowedMethods: ['GET'],
  requireAuth: false
});