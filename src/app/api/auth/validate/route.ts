/**
 * GET /api/auth/validate
 * Quick session validation endpoint
 *
 * @governance httpOnly cookies for session management
 * @governance PII protection - Hash all IP addresses
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3B - API Route Standardization v2.0
 *
 * PURPOSE:
 * - Lightweight endpoint for checking if session is valid
 * - Returns boolean valid status without full user data
 * - Used by frontend for quick auth state checks
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed: new DatabaseService() instantiation
 * - Removed: new SessionService() instantiation
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing for logging
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { readSessionCookie } from '@/core/utils/cookies';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { logger } from '@/core/logging/Logger';

/**
 * Validate handler implementation
 * Uses AuthServiceRegistry singleton for lightweight session check
 */
async function validateHandler(context: ApiContext) {
  const { request } = context;
  const req = request as NextRequest;

  // Step 1: Get session ID from cookies
  const sessionId = readSessionCookie();

  if (!sessionId) {
    // No session cookie found - not authenticated
    return {
      success: true,
      data: {
        valid: false,
        authenticated: false
      }
    };
  }

  // Step 2: Build PII-compliant context for logging
  const _ipContext = await buildIPContext(req);

  // Log with redacted IP (debug level since this is frequently called)
  logger.debug('[validate] Session validation check', {
    metadata: {
      sessionId: sessionId.substring(0, 8) + '...',
      redactedIP: redactIPForLogging(extractRawIP(req))
    }
  });

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Validate session (lightweight check)
  const result = await authService.validateSession(sessionId);

  // Step 5: Return validation status
  return {
    success: true,
    data: {
      valid: result.valid,
      authenticated: result.valid
    }
  };
}

// Export GET handler
// NOTE: No CSRF protection needed for GET requests
export const GET = apiHandler(validateHandler, {
  allowedMethods: ['GET'],
  requireAuth: false // Validation is the purpose of this endpoint
});

// Method guards - only GET allowed
import { jsonMethodNotAllowed } from '@/lib/http/json';

const ALLOWED_METHODS = ['GET'];

export async function POST() {
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