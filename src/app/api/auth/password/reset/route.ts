/**
 * POST /api/auth/password/reset
 * Password reset execution endpoint
 *
 * Now includes auto-login: Creates session and sets cookie on success
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { buildIPContext, redactIPForLogging, extractRawIP } from '@/core/utils/pii';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@/core/errors/BizError';
import { setSessionCookie } from '@/core/utils/cookies';

export const runtime = 'nodejs';

interface ResetBody {
  token: string;
  password: string;
}

async function resetConsumeHandler(context: ApiContext) {
  const { request, logger } = context;
  const body = await request.json();
  const { token, password } = body as ResetBody;

  if (!token || typeof token !== 'string') {
    throw BizError.validation('field', null, 'Reset token is required');
  }

  if (!password || typeof password !== 'string') {
    throw BizError.validation('field', null, 'Password is required');
  }

  const authService = await AuthServiceRegistry.getAuthService();
  const req = request as NextRequest;
  const _ipContext = await buildIPContext(req);

  logger?.info('[reset] Password reset attempt', {
    token: token.substring(0, 8) + '...',
    redactedIP: redactIPForLogging(extractRawIP(req))
  });

  const result = await authService.resetPasswordWithToken(token, password);

  if (!result.success) {
    logger?.warn('[reset] Password reset failed', {
      error: result.error || 'Invalid or expired token'
    });
    throw BizError.validation('field', null, result.error || 'Invalid or expired reset token');
  }

  logger?.info('[reset] Password reset successful, creating session for auto-login');

  // Create session for auto-login (same pattern as login flow)
  // If session creation fails, we still return success since password was reset
  let autoLoginSuccess = false;
  if (result.userId) {
    try {
      const sessionService = AuthServiceRegistry.sessionService;
      const sessionToken = await sessionService.createSession(
        result.userId,
        {} // No additional context needed
      );

      // Set httpOnly session cookie (24 hours)
      const maxAge = 24 * 60 * 60; // 24 hours in seconds
      setSessionCookie(sessionToken, maxAge);
      autoLoginSuccess = true;

      logger?.info('[reset] Auto-login session created', {
        userId: result.userId
      });
    } catch (sessionError) {
      // Session creation failed, but password reset succeeded
      // User will need to log in manually
      logger?.warn('[reset] Auto-login session creation failed, user will need to log in manually', {
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
      });
    }
  }

  return {
    success: true,
    data: {
      message: 'Password has been reset successfully',
      autoLogin: autoLoginSuccess,
      user: autoLoginSuccess ? result.user : undefined
    }
  };
}

export const POST = withCsrf(apiHandler(resetConsumeHandler, {
  allowedMethods: ['POST'],
  requireAuth: false
}));

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
