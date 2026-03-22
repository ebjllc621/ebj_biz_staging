/**
 * MFA Setup Route
 *
 * @description Initial MFA setup entry point
 * @method POST
 * @auth Required
 * @csrf Required
 *
 * @architecture Service Architecture v2.0 compliant
 * @singleton Uses AuthServiceRegistry.mfaService
 * @governance Phase 2 MFA Route Migration - per-request instantiation eliminated
 */

import { NextResponse } from 'next/server';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { apiHandler, ApiContext, ApiResponse } from '@/core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@/core/errors/BizError';

/**
 * MFA setup response type
 */
interface SetupResponse {
  qr_code: string;
  backup_url: string;
  recovery_codes: string[];
}

/**
 * MFA setup handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function setupHandler(context: ApiContext): Promise<ApiResponse<SetupResponse>> {
  const { userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  // Get singleton services from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;
  const databaseService = AuthServiceRegistry.databaseService;

  // Get user email for TOTP setup
  const userResult = await databaseService.query<{ email: string }>(
    'SELECT email FROM users WHERE id = ?',
    [numericUserId]
  );

  if (userResult.rows.length === 0) {
    throw BizError.notFound('User not found');
  }

  const userEmail = userResult.rows[0]?.email;
  if (!userEmail) {
    throw BizError.notFound('User email not found');
  }

  // Check if MFA already enabled
  const mfaStatus = await mfaService.getMfaStatus(numericUserId);
  if (mfaStatus.enabled) {
    throw new BizError({
      code: 'CONFLICT',
      message: 'MFA is already enabled for this account',
      userMessage: 'MFA is already enabled for your account'
    });
  }

  // Setup TOTP for user
  const setupResponse = await mfaService.setupTotp(numericUserId, userEmail);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, false);
  }

  // Note: In production, the secret should never be returned to client after setup
  // This is only for initial setup flow
  return {
    success: true,
    data: {
      qr_code: setupResponse.qr_code,
      backup_url: setupResponse.backup_url,
      recovery_codes: setupResponse.recovery_codes
      // secret is intentionally omitted from response for security
    }
  };
}

/**
 * POST /api/auth/mfa/setup
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(setupHandler, {
    requireAuth: true,
    allowedMethods: ['POST']
  }) as unknown as (_req: Request) => Promise<Response>
);

/**
 * Method not allowed handlers
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'GET method not allowed for this endpoint'
      }
    },
    {
      status: 405,
      headers: { 'Allow': 'POST' }
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'PUT method not allowed for this endpoint'
      }
    },
    {
      status: 405,
      headers: { 'Allow': 'POST' }
    }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'PATCH method not allowed for this endpoint'
      }
    },
    {
      status: 405,
      headers: { 'Allow': 'POST' }
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'DELETE method not allowed for this endpoint'
      }
    },
    {
      status: 405,
      headers: { 'Allow': 'POST' }
    }
  );
}