/**
 * MFA Status Route
 *
 * @description Returns MFA enrollment status for the authenticated user
 * @method GET
 * @auth Required
 *
 * @architecture Service Architecture v2.0 compliant
 * @singleton Uses AuthServiceRegistry.mfaService
 * @governance Phase 2 MFA Route Migration - per-request instantiation eliminated
 */

import { NextResponse } from 'next/server';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { apiHandler, ApiContext, ApiResponse } from '@/core/api/apiHandler';
import { BizError } from '@/core/errors/BizError';
import type { MfaStatus } from '@/core/types/auth/mfa';

/**
 * MFA status response with additional computed fields
 */
interface MfaStatusResponse extends MfaStatus {
  has_backup_codes: boolean;
}

/**
 * MFA status handler
 *
 * Uses AuthServiceRegistry singleton pattern - NO per-request instantiation
 */
async function statusHandler(context: ApiContext): Promise<ApiResponse<MfaStatusResponse>> {
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

  // Get MFA status for user
  const mfaStatus = await mfaService.getMfaStatus(numericUserId);

  // Record request metrics for health monitoring
  const startTime = context.metadata?.startTime as number | undefined;
  if (startTime) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, false);
  }

  return {
    success: true,
    data: {
      ...mfaStatus,
      has_backup_codes: mfaStatus.recovery_codes_remaining > 0
    }
  };
}

/**
 * GET /api/auth/mfa/status
 * No CSRF required for GET requests
 */
export const GET = apiHandler(statusHandler, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * Method not allowed handlers
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST method not allowed for this endpoint'
      }
    },
    {
      status: 405,
      headers: { 'Allow': 'GET' }
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
      headers: { 'Allow': 'GET' }
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
      headers: { 'Allow': 'GET' }
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
      headers: { 'Allow': 'GET' }
    }
  );
}