/**
 * GET /api/auth/me
 * Get current authenticated user information
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
 * - Removed: new AuthenticationService() instantiation
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing for logging
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { readSessionCookie } from '@/core/utils/cookies';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { BizError } from '@/core/errors/BizError';
import { logger } from '@/core/logging/Logger';

/**
 * Me handler implementation
 * Uses AuthServiceRegistry singleton to get current user
 */
async function meHandler(context: ApiContext) {
  const { request } = context;
  const req = request as NextRequest;

  // Step 1: Get session ID from cookies
  const sessionId = readSessionCookie();

  if (!sessionId) {
    // No session cookie = not logged in. Return null user (not an error).
    return {
      success: true,
      data: { user: null }
    };
  }

  // Step 2: Build PII-compliant context for logging
  const _ipContext = await buildIPContext(req);

  // Log with redacted IP
  logger.info('[me] User info request', {
    metadata: {
      sessionId: sessionId.substring(0, 8) + '...', // Redact full session ID
      redactedIP: redactIPForLogging(extractRawIP(req))
    }
  });

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Get current user from session
  const user = await authService.getCurrentUser(sessionId);

  if (!user) {
    logger.warn('[me] Failed to get user', {
      metadata: {
        sessionId: sessionId.substring(0, 8) + '...',
        reason: 'User not found'
      }
    });

    throw BizError.accessDenied('Invalid session or user not found');
  }

  // Step 5: Return user info
  // Map role to account_type for client-side consumption
  const accountType = user.role as 'visitor' | 'general' | 'listing_member' | 'admin';

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        account_type: accountType,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
        avatarBgColor: user.avatarBgColor,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  };
}

// Export GET handler
// NOTE: No CSRF protection needed for GET requests
export const GET = apiHandler<{ user: unknown }>(meHandler, {
  allowedMethods: ['GET'],
  requireAuth: false // Auth validation done inside handler
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