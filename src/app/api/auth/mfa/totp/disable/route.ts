/**
 * MFA TOTP Disable Route
 *
 * @description Disables TOTP-based MFA for the authenticated user
 * @method POST (disable), GET (status)
 * @auth Required
 * @csrf Required (POST only)
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
import type { MfaStatus } from '@/core/types/auth/mfa';

/**
 * MFA disable request schema
 */
interface DisableMfaRequestBody {
  confirm: boolean;
  reason?: string;
}

/**
 * MFA disable response
 */
interface DisableMfaResponse {
  success: boolean;
  message: string;
}

/**
 * Validate disable MFA request
 */
function validateDisableMfaRequest(body: unknown): { confirm: boolean; reason?: string } {
  if (!body || typeof body !== 'object') {
    throw BizError.validation('body', null, 'Request body is required');
  }

  const { confirm, reason } = body as DisableMfaRequestBody;

  if (confirm !== true) {
    throw BizError.validation('confirm', confirm, 'Confirmation required to disable MFA');
  }

  return {
    confirm: Boolean(confirm),
    reason: typeof reason === 'string' ? reason.trim() : undefined
  };
}

/**
 * MFA disable handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function disableMfaHandler(context: ApiContext): Promise<ApiResponse<DisableMfaResponse>> {
  const { request, userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required for MFA management');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  // Parse and validate request body
  const body = await request.json();
  validateDisableMfaRequest(body);

  // Get singleton service from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;

  // Check if MFA is currently enabled
  const mfaStatus = await mfaService.getMfaStatus(numericUserId);

  if (!mfaStatus.enabled) {
    throw BizError.validation('mfa', null, 'MFA is not currently enabled');
  }

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
    data: {
      success: true,
      message: 'MFA has been successfully disabled. All recovery codes have been invalidated.'
    }
  };
}

/**
 * GET /api/auth/mfa/totp/disable - Get MFA status
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function getMfaStatusHandler(context: ApiContext): Promise<ApiResponse<MfaStatus>> {
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

  const mfaStatus = await mfaService.getMfaStatus(numericUserId);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, false);
  }

  return {
    success: true,
    data: mfaStatus
  };
}

/**
 * POST /api/auth/mfa/totp/disable
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(disableMfaHandler, {
    requireAuth: true,
    allowedMethods: ['POST']
  }) as unknown as (_req: Request) => Promise<Response>
);

/**
 * GET /api/auth/mfa/totp/disable - Also serves as MFA status endpoint
 */
export const GET = apiHandler(getMfaStatusHandler, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * Method not allowed handlers
 */
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
      headers: { 'Allow': 'GET, POST' }
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
      headers: { 'Allow': 'GET, POST' }
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
      headers: { 'Allow': 'GET, POST' }
    }
  );
}