/**
 * MFA TOTP Verification Route
 *
 * @description Verifies TOTP codes for authentication or enrollment completion
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
import type { MfaVerifyRequest, MfaVerifyResponse } from '@/core/types/auth/mfa';

/**
 * TOTP verification request schema
 */
interface VerifyTotpRequestBody {
  code: string;
  type?: 'totp' | 'recovery';
}

/**
 * Validate TOTP verification request
 */
function validateVerifyTotpRequest(body: unknown): MfaVerifyRequest {
  if (!body || typeof body !== 'object') {
    throw BizError.validation('body', null, 'Request body is required');
  }

  const { code, type = 'totp' } = body as VerifyTotpRequestBody;

  if (!code || typeof code !== 'string') {
    throw BizError.validation('code', null, 'TOTP code is required');
  }

  // Validate code format based on type
  if (type === 'totp' && !/^\d{6}$/.test(code)) {
    throw BizError.validation('code', code, 'TOTP code must be 6 digits');
  }

  if (type !== 'totp' && type !== 'recovery') {
    throw BizError.validation('type', type, 'Type must be totp or recovery');
  }

  return {
    code: code.trim(),
    type
  };
}

/**
 * TOTP verification handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function verifyTotpHandler(context: ApiContext): Promise<ApiResponse<MfaVerifyResponse>> {
  const { request, userId } = context;

  if (!userId) {
    throw BizError.accessDenied('Authentication required for MFA verification');
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw BizError.validation('userId', userId, 'Invalid user ID format');
  }

  // Parse and validate request body
  const body = await request.json();
  const verificationRequest = validateVerifyTotpRequest(body);

  // Get singleton service from registry - NO per-request instantiation
  const mfaService = AuthServiceRegistry.mfaService;

  // Verify TOTP code
  const verificationResult = await mfaService.verifyTotp(numericUserId, verificationRequest);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, !verificationResult.success);
  }

  return {
    success: true,
    data: verificationResult
  };
}

/**
 * POST /api/auth/mfa/totp/verify
 * GOVERNANCE: CSRF protection required for state-changing operations
 */
export const POST = withCsrf(
  apiHandler(verifyTotpHandler, {
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