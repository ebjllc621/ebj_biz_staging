/**
 * POST /api/auth/login
 * User authentication endpoint with httpOnly session cookies
 *
 * @governance httpOnly cookies ONLY for authentication
 * @governance PII protection - Hash all IP addresses (Build Map v2.1)
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3A - API Route Standardization v2.0 GOVERNANCE COMPLIANT
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed: new DatabaseService() instantiation
 * - Removed: new SessionService() instantiation
 * - Removed: new AuthenticationService() instantiation
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing (governance requirement)
 * - Added: Coarse location tracking (city/region only)
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { setSessionCookie } from '@/core/utils/cookies';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@/core/errors/BizError';
import type { LoginRequest } from '@/core/types/auth/contracts';

/**
 * Login handler implementation
 * Uses AuthServiceRegistry singleton for authentication
 */
async function loginHandler(context: ApiContext) {
  const { request } = context;

  // Step 1: Parse request body
  const body = await request.json();
  const { email, password } = body as LoginRequest;

  // Step 2: Validate required fields
  if (!email || !password) {
    throw BizError.validation(
      'field',
      null,
      'Email and password are required'
    );
  }

  // Additional validation
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw BizError.validation(
      'field',
      null,
      'Invalid field types'
    );
  }

  if (email.length === 0 || password.length === 0) {
    throw BizError.validation(
      'field',
      null,
      'Email and password cannot be empty'
    );
  }

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Build PII-compliant authentication context
  const req = request as NextRequest;

  // ✅ GOVERNANCE COMPLIANT - Hash IP address
  const ipContext = await buildIPContext(req);

  const authContext = {
    hashedIP: ipContext.hashedIP, // ✅ Hashed for privacy
    location: ipContext.location, // ✅ Coarse location only (city/region)
    userAgent: req.headers.get('user-agent') || undefined,
    timestamp: new Date()
  };

  // Log with redacted IP for debugging
  // eslint-disable-next-line no-console -- Intentional audit logging for login attempts
  

  // Step 5: Attempt authentication
  const result = await authService.login(
    { email, password },
    authContext
  );

  // Step 6: Check for rate limiting
  if (result.rateLimit && !result.rateLimit.decision.allow) {
    // eslint-disable-next-line no-console -- Intentional audit logging for rate limit events
    

    throw new BizError({
      code: 'RATE_LIMIT_EXCEEDED',
      message: result.error?.message || 'Too many login attempts',
      context: {
        retryAfter: result.rateLimit.headers['Retry-After']
      }
    });
  }

  // Step 7: Check authentication success
  if (!result.success || !result.session) {
    // eslint-disable-next-line no-console -- Intentional audit logging for failed login attempts
    throw BizError.accessDenied(
      result.error?.message || 'Invalid credentials'
    );
  }

  // Step 8: Set httpOnly session cookie
  // GOVERNANCE: httpOnly, secure, sameSite:lax required
  const maxAge = 24 * 60 * 60; // 24 hours in seconds
  setSessionCookie(result.session.sessionId, maxAge);

  // eslint-disable-next-line no-console -- Intentional audit logging for successful logins
  // Step 9: Return success response (without exposing session token)
  // apiHandler will wrap this in createSuccessResponse
  return {
    success: true,
    data: {
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role
      }
    }
  };
}

// Export POST handler with CSRF protection
// GOVERNANCE: CSRF protection required for state-changing operations
export const POST = withCsrf(apiHandler(loginHandler, {
  allowedMethods: ['POST'],
  requireAuth: false
}));

// Method guards - only POST allowed for login
import { jsonMethodNotAllowed } from '@/lib/http/json';

const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}