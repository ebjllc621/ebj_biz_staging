/**
 * GET /api/auth/session
 * Validate current session and return session info
 *
 * @governance httpOnly cookies for session management
 * @governance PII protection - Hash all IP addresses
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3B - API Route Standardization v2.0
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed: new DatabaseService() instantiation
 * - Removed: new SessionService() instantiation
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { readSessionCookie } from '@/core/utils/cookies';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { BizError } from '@/core/errors/BizError';
import { logger } from '@/core/logging/Logger';

/**
 * Session handler implementation
 * Uses AuthServiceRegistry singleton for session validation
 */
async function sessionHandler(context: ApiContext) {
  const { request } = context;
  const req = request as NextRequest;

  // Step 1: Get session ID from cookies
  const sessionId = readSessionCookie();

  if (!sessionId) {
    // No session cookie found
    throw BizError.accessDenied('No active session');
  }

  // Step 2: Build PII-compliant context for logging
  const _ipContext = await buildIPContext(req);

  // Log with redacted IP
  logger.info('[session] Session validation request', {
    metadata: {
      sessionId: sessionId.substring(0, 8) + '...', // Redact full session ID
      redactedIP: redactIPForLogging(extractRawIP(req))
    }
  });

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Validate session
  const result = await authService.validateSession(sessionId);

  if (!result.valid || !result.session) {
    logger.warn('[session] Invalid session', {
      metadata: {
        sessionId: sessionId.substring(0, 8) + '...',
        reason: 'Session not found or expired'
      }
    });

    throw BizError.accessDenied('Invalid or expired session');
  }

  // Step 5: Return session info
  return {
    success: true,
    data: {
      session: {
        sessionId: result.session.sessionId,
        userId: result.session.userId,
        expiresAt: result.session.expiresAt,
        issuedAt: result.session.issuedAt
      },
      user: result.user ? {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt
      } : undefined
    }
  };
}

// Export GET handler
// NOTE: No CSRF protection needed for GET requests
export const GET = apiHandler(sessionHandler, {
  allowedMethods: ['GET'],
  requireAuth: false // Session validation is done inside handler
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