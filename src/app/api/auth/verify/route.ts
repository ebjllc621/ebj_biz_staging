/**
 * POST /api/auth/verify
 * Email verification endpoint
 *
 * @governance httpOnly cookies for authentication
 * @governance PII protection - Hash all IP addresses
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3C - API Route Standardization v2.0
 *
 * PURPOSE:
 * - Verify user email address with token from email
 * - Activate user account after successful verification
 * - Update email_verified status in database
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed: new DatabaseService() instantiation
 * - Removed: new AuthenticationService() instantiation
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { BizError } from '@/core/errors/BizError';

interface VerifyRequest {
  token: string;
}

/**
 * Verify handler implementation
 * Uses AuthServiceRegistry singleton for email verification
 */
async function verifyHandler(context: ApiContext) {
  const { request, logger } = context;

  // Step 1: Parse request body
  const body = await request.json();
  const { token } = body as VerifyRequest;

  // Step 2: Validate required fields
  if (!token) {
    throw BizError.validation(
      'field',
      null,
      'Verification token is required'
    );
  }

  if (typeof token !== 'string') {
    throw BizError.validation(
      'field',
      null,
      'Invalid token format'
    );
  }

  if (token.length === 0) {
    throw BizError.validation(
      'field',
      null,
      'Token cannot be empty'
    );
  }

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Build PII-compliant context
  const req = request as NextRequest;
  const ipContext = await buildIPContext(req);

  const authContext = {
    hashedIP: ipContext.hashedIP,
    location: ipContext.location,
    userAgent: req.headers.get('user-agent') || undefined,
    timestamp: new Date()
  };

  // Log with redacted IP
  logger?.info('[verify] Email verification attempt', {
    token: token.substring(0, 8) + '...', // Redact full token
    redactedIP: redactIPForLogging(extractRawIP(req))
  });

  // Step 5: Verify email with token
  const result = await authService.verifyEmailWithToken(token);

  if (!result.success) {
    logger?.warn('[verify] Email verification failed', {
      token: token.substring(0, 8) + '...',
      reason: result.error || 'Invalid or expired token'
    });

    throw BizError.validation(
      'field',
      null,
      result.error || 'Invalid or expired verification token'
    );
  }

  logger?.info('[verify] Email verified successfully', {
    userId: result.userId,
    email: result.email
  });

  // Step 6: Return success response
  return {
    success: true,
    data: {
      message: 'Email verified successfully',
      userId: result.userId,
      email: result.email
    }
  };
}

// Export POST handler WITHOUT CSRF protection
// SECURITY NOTE: CSRF protection is intentionally disabled for email verification because:
// 1. User clicks link from email (external context, no CSRF token available)
// 2. The verification token itself provides security (secret known only to email recipient)
// 3. This is a one-time token that expires and can only be used once
export const POST = apiHandler(verifyHandler, {
  allowedMethods: ['POST'],
  requireAuth: false // Token-based verification, not session-based
});

// Method guards - only POST allowed
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