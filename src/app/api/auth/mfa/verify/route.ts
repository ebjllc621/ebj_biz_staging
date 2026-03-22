/**
 * MFA Verify Route
 *
 * @description Verifies MFA codes (TOTP or recovery)
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
import type { MfaVerifyRequest, MfaVerifyResponse as _MfaVerifyResponse } from '@/core/types/auth/mfa';

/**
 * MFA verify handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function verifyHandler(context: ApiContext): Promise<ApiResponse<{ verified: boolean; recovery_codes_remaining?: number }>> {
  const { request, userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  const body = await request.json();
  const { code, type } = body as { code?: string; type?: string };

  if (!code || !type) {
    throw BizError.validation('body', null, 'Code and type are required');
  }

  if (type !== 'totp' && type !== 'recovery') {
    throw BizError.validation('type', type, 'Type must be "totp" or "recovery"');
  }

  // Validate code format
  if (type === 'totp' && !/^\d{6}$/.test(code)) {
    throw BizError.validation('code', code, 'TOTP code must be 6 digits');
  }

  if (type === 'recovery' && !/^[A-Z0-9]{8}$/i.test(code)) {
    throw BizError.validation('code', code, 'Recovery code must be 8 alphanumeric characters');
  }

  // Get singleton service from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;

  // Verify the code
  const verifyRequest: MfaVerifyRequest = {
    code: code.trim(),
    type: type as 'totp' | 'recovery'
  };
  const verifyResponse = await mfaService.verifyTotp(numericUserId, verifyRequest);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, !verifyResponse.success);
  }

  return {
    success: true,
    data: {
      verified: verifyResponse.success,
      recovery_codes_remaining: verifyResponse.recovery_codes_remaining
    }
  };
}

/**
 * POST /api/auth/mfa/verify
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(verifyHandler, {
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