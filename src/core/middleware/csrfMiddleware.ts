/**
 * CSRF Protection Middleware - Cross-Site Request Forgery Prevention
 *
 * GOVERNANCE COMPLIANCE:
 * - OSI Layer 7 (Application Layer) security
 * - Double submit cookie pattern
 * - Build Map v2.1 ENHANCED patterns
 * - Tier: STANDARD
 *
 * Features:
 * - CSRF token generation and validation
 * - Double submit cookie pattern
 * - Exemption for GET/HEAD/OPTIONS
 * - Token rotation on authentication
 *
 * @authority PHASE_6.4_BRAIN_PLAN.md - Section 3.2.2
 * @phase Phase 6.4 - Production Deployment
 * @complexity STANDARD tier
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'bizconekt_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

/**
 * Generate CSRF token
 * @returns CSRF token string
 *
 * @example
 * ```typescript
 * const token = generateCSRFToken();
 * ```
 */
export function generateCSRFToken(): string {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(crypto.randomBytes(32).toString('hex'))
    .digest('hex');
}

/**
 * Validate CSRF token
 * @param token - Token from header
 * @param cookieToken - Token from cookie
 * @returns Boolean indicating valid token
 *
 * @example
 * ```typescript
 * const isValid = validateCSRFToken(headerToken, cookieToken);
 * ```
 */
export function validateCSRFToken(token: string, cookieToken: string): boolean {
  if (!token || !cookieToken) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(cookieToken)
    );
  } catch (error) {
    // Length mismatch or other crypto error
    return false;
  }
}

/**
 * CSRF middleware
 * @param req - Next request
 * @returns NextResponse or null
 *
 * @example
 * ```typescript
 * const result = await csrfMiddleware(request);
 * if (result) return result; // CSRF validation failed
 * ```
 */
export async function csrfMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return null; // Continue without validation
  }

  // Skip CSRF in development (optional - remove for strict testing)
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // Get CSRF token from cookie and header
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  // Validate token
  if (!cookieToken || !headerToken || !validateCSRFToken(headerToken, cookieToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token. Please refresh the page.' },
      { status: 403 }
    );
  }

  // Token valid, continue
  return null;
}

/**
 * Add CSRF token to response
 * @param response - NextResponse
 * @returns NextResponse with CSRF token
 *
 * @example
 * ```typescript
 * const response = NextResponse.json({ data });
 * return addCSRFTokenToResponse(response);
 * ```
 */
export function addCSRFTokenToResponse(response: NextResponse): NextResponse {
  const token = generateCSRFToken();

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  // Also set in response header for client-side access
  response.headers.set('X-CSRF-Token', token);

  return response;
}
