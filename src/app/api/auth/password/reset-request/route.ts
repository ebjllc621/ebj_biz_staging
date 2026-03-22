/**
 * POST /api/auth/password/reset-request
 * Password reset request endpoint
 *
 * @governance httpOnly cookies for authentication
 * @governance PII protection - Hash all IP addresses
 * @governance Email enumeration protection - Always return success
 * @governance Rate limiting - 3 requests/hour per email
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3C - API Route Standardization v2.0
 *
 * PURPOSE:
 * - Request password reset link
 * - Generate secure reset token
 * - Send reset email
 * - Prevent email enumeration attacks (always return success)
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed: composeAuth() dependency injection
 * - Removed: DbAuthService controller pattern
 * - Added: AuthServiceRegistry singleton usage
 * - Added: PII-compliant IP hashing
 * - Added: Email enumeration protection
 * - Added: Rate limiting enforcement
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@/core/errors/BizError';

export const runtime = 'nodejs';

interface ResetRequestBody {
  email: string;
}

/**
 * Password reset request handler implementation
 * Uses AuthServiceRegistry singleton for reset request
 */
async function resetRequestHandler(context: ApiContext) {
  const { request, logger } = context;

  // Step 1: Parse request body
  const body = await request.json();
  const { email } = body as ResetRequestBody;

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

  // Step 3: Get service from registry
  // ✅ CORRECT - Uses singleton with async initialization
  const authService = await AuthServiceRegistry.getAuthService();

  // Step 4: Build PII-compliant context
  const req = request as NextRequest;
  const ipContext = await buildIPContext(req);

  const _authContext = {
    hashedIP: ipContext.hashedIP,
    location: ipContext.location,
    userAgent: req.headers.get('user-agent') || undefined,
    timestamp: new Date()
  };

  // Log with redacted IP
  logger?.info('[reset-request] Password reset request', {
    email,
    redactedIP: redactIPForLogging(extractRawIP(req))
  });

  // Step 5: Request password reset
  // NOTE: This method ALWAYS returns success to prevent email enumeration
  await authService.requestPasswordReset(email);

  logger?.info('[reset-request] Password reset request processed', {
    email
  });

  // Step 6: Return success response
  // ALWAYS return success, regardless of whether email exists
  return {
    success: true,
    data: {
      message: 'If that email exists, a password reset link has been sent.'
    }
  };
}

// Export POST handler with CSRF protection
export const POST = withCsrf(apiHandler(resetRequestHandler, {
  allowedMethods: ['POST'],
  requireAuth: false
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