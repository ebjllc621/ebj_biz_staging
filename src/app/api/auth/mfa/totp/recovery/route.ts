/**
 * MFA Recovery Code Route
 *
 * @description Verifies recovery codes and handles regeneration
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Type imported for future use
import type { MfaVerifyResponse as _MfaVerifyResponse } from '@/core/types/auth/mfa';

/**
 * Recovery code request schema
 */
interface RecoveryCodeRequestBody {
  recoveryCode: string;
  action?: 'verify' | 'regenerate';
}

/**
 * Recovery code response
 */
interface RecoveryCodeResponse {
  verified?: boolean;
  recoveryCodes?: string[];
  recovery_codes_remaining?: number;
}

/**
 * Validate recovery code request
 */
function validateRecoveryCodeRequest(body: unknown): { code: string; action: 'verify' | 'regenerate' } {
  if (!body || typeof body !== 'object') {
    throw BizError.validation('body', null, 'Request body is required');
  }

  const { recoveryCode, action = 'verify' } = body as RecoveryCodeRequestBody;

  if (!recoveryCode || typeof recoveryCode !== 'string') {
    throw BizError.validation('recoveryCode', null, 'Recovery code is required');
  }

  if (!/^[A-Z0-9]{8}$/i.test(recoveryCode.trim())) {
    throw BizError.validation('recoveryCode', recoveryCode, 'Recovery code must be 8 alphanumeric characters');
  }

  if (action !== 'verify' && action !== 'regenerate') {
    throw BizError.validation('action', action, 'Action must be "verify" or "regenerate"');
  }

  return {
    code: recoveryCode.trim().toUpperCase(),
    action
  };
}

/**
 * Recovery code handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function recoveryHandler(context: ApiContext): Promise<ApiResponse<RecoveryCodeResponse>> {
  const { request, userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required for MFA recovery');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  // Parse and validate request body
  const body = await request.json();
  const { code, action } = validateRecoveryCodeRequest(body);

  // Get singleton service from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;

  if (action === 'regenerate') {
    // For regenerate, we first verify the recovery code then regenerate
    // This would require MfaService to have a regenerateRecoveryCodes method
    // For now, return an error indicating this needs to be implemented
    throw new BizError({
      code: 'NOT_IMPLEMENTED',
      message: 'Recovery code regeneration requires additional service implementation',
      userMessage: 'This feature is not yet available'
    });
  }

  // Verify recovery code
  const verifyResult = await mfaService.verifyTotp(numericUserId, {
    code,
    type: 'recovery'
  });

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, !verifyResult.success);
  }

  return {
    success: true,
    data: {
      verified: verifyResult.success,
      recovery_codes_remaining: verifyResult.recovery_codes_remaining
    }
  };
}

/**
 * POST /api/auth/mfa/totp/recovery
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(recoveryHandler, {
    requireAuth: true,
    allowedMethods: ['POST']
  }) as unknown as (req: Request) => Promise<Response>
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