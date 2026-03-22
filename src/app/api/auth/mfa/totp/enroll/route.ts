/**
 * MFA TOTP Enrollment Route
 *
 * @description Enrolls user in TOTP-based MFA
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
import type { MfaSetupResponse } from '@/core/types/auth/mfa';

/**
 * MFA TOTP enrollment handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function enrollTotpHandler(context: ApiContext): Promise<ApiResponse<MfaSetupResponse>> {
  const { userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required for MFA enrollment');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  // Get singleton services from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;
  const databaseService = AuthServiceRegistry.databaseService;

  // Get user email for TOTP label
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
      message: 'TOTP MFA is already enabled for this account',
      userMessage: 'MFA is already enabled for your account'
    });
  }

  // Enroll user in TOTP MFA
  const enrollmentResponse = await mfaService.setupTotp(numericUserId, userEmail);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, false);
  }

  return {
    success: true,
    data: enrollmentResponse
  };
}

/**
 * POST /api/auth/mfa/totp/enroll
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(enrollTotpHandler, {
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