/**
 * MFA Disable Route
 *
 * @description Disables MFA for authenticated users
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
 * MFA disable handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function disableHandler(context: ApiContext): Promise<ApiResponse<null>> {
  const { userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  // Get singleton service from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;

  // Disable MFA
  await mfaService.disableMfa(numericUserId);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, false);
  }

  return {
    success: true,
    data: null
  };
}

/**
 * POST /api/auth/mfa/disable
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(disableHandler, {
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