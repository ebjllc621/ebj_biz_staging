/**
 * POST /api/auth/verify/resend
 * Resend email verification endpoint
 *
 * @governance httpOnly cookies for authentication
 * @governance PII protection - Hash all IP addresses
 * @governance Rate limiting - 3 requests/hour per user
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3C - API Route Standardization v2.0
 *
 * PURPOSE:
 * - Resend verification email to user
 * - Generate new verification token
 * - Invalidate previous tokens
 * - Rate limiting enforced (3 requests/hour)
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed: composeAuth() dependency injection
 * - Removed: DbAuthService controller pattern
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing
 * - Added: Rate limiting enforcement
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { readSessionCookie } from '@/core/utils/cookies';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@/core/errors/BizError';

export const runtime = 'nodejs';

interface ResendRequest {
  email: string;
}

/**
 * Resend verification handler implementation
 * Uses AuthServiceRegistry singleton for resend verification
 */
async function resendVerifyHandler(context: ApiContext) {
  const { request, logger } = context;

  // Step 1: Parse request body
  const body = await request.json();
  const { email } = body as ResendRequest;

  // Step 2: Validate required fields
  if (!email) {
    throw BizError.validation(
      'field',
      null,
      'Email address is required'
    );
  }

  if (typeof email !== 'string') {
    throw BizError.validation(
      'field',
      null,
      'Invalid email format'
    );
  }

  // Step 3: Get session (user must be authenticated to resend)
  const sessionId = readSessionCookie();
  if (!sessionId) {
    throw BizError.accessDenied('Not authenticated');
  }

  // Step 4: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 5: Get current user
  const userResult = await authService.getUserByEmail(email);

  if (!userResult) {
    throw BizError.validation(
      'field',
      null,
      'User not found'
    );
  }

  // Step 6: Build PII-compliant context
  const req = request as NextRequest;
  const ipContext = await buildIPContext(req);

  const authContext = {
    hashedIP: ipContext.hashedIP,
    location: ipContext.location,
    userAgent: req.headers.get('user-agent') || undefined,
    timestamp: new Date()
  };

  // Log with redacted IP
  logger?.info('[resend-verify] Resend verification attempt', {
    userId: userResult.id,
    email: userResult.email,
    redactedIP: redactIPForLogging(extractRawIP(req))
  });

  // Step 7: Resend verification email
  const result = await authService.resendVerificationEmail(userResult.id, userResult.email);

  if (!result.success) {
    logger?.warn('[resend-verify] Resend verification failed', {
      userId: userResult.id,
      email: userResult.email,
      error: result.error || 'Failed to resend verification email'
    });

    throw BizError.validation(
      'field',
      null,
      result.error || 'Failed to resend verification email'
    );
  }

  logger?.info('[resend-verify] Verification email resent successfully', {
    userId: userResult.id,
    email: userResult.email
  });

  // Step 8: Return success response
  return {
    success: true,
    data: {
      message: 'Verification email sent successfully'
    }
  };
}

// Export POST handler with CSRF protection
export const POST = withCsrf(apiHandler(resendVerifyHandler, {
  allowedMethods: ['POST'],
  requireAuth: false // Checked manually in handler
}));

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
