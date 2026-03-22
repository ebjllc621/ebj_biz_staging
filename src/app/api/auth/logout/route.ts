/**
 * POST /api/auth/logout
 * User logout endpoint - invalidates session
 *
 * @governance httpOnly cookies cleared on logout
 * @governance PII protection - Hash all IP addresses
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3A - API Route Standardization v2.0
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { clearSessionCookie, readSessionCookie } from '@/core/utils/cookies';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * Logout handler implementation
 * Uses AuthServiceRegistry singleton
 */
async function logoutHandler(context: ApiContext) {
  const { request } = context;
  const req = request as NextRequest;

  // Step 1: Get session ID from cookies
  const sessionId = readSessionCookie();

  if (!sessionId) {
    // No session to logout - this is ok, just clear cookie
    clearSessionCookie();

    return {
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    };
  }

  // Step 2: Build PII-compliant context for logging
  const ipContext = await buildIPContext(req);

  // Log logout attempt with redacted IP
  // eslint-disable-next-line no-console -- Intentional audit logging for logout attempts
  

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Invalidate session
  try {
    await authService.logout(sessionId);

    // eslint-disable-next-line no-console -- Intentional audit logging for session invalidation
    
  } catch (error) {
    // Even if invalidation fails, clear the cookie
    // eslint-disable-next-line no-console -- Intentional audit logging for logout errors
  }

  // Step 5: Clear session cookie
  clearSessionCookie();

  // Step 6: Return success response
  return {
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  };
}

// Export POST handler with CSRF protection
export const POST = withCsrf(apiHandler(logoutHandler, {
  allowedMethods: ['POST'],
  requireAuth: false // Don't require auth to logout
}));

// Method guards - only POST allowed for logout
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