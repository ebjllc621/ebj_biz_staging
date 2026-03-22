/**
 * Admin User Email Check API
 * GET /api/admin/users/check-email?email=x - Check email availability
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only access
 * - Read-only operation (no CSRF required)
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @phase Phase 5 - User Editor Modal
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { NextRequest } from 'next/server';

export const GET = apiHandler(
  async (context: ApiContext) => {
    const { request, requestId } = context;

    // Get current admin user
    const currentUser = await getUserFromRequest(request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email?.trim()) {
      throw BizError.validation('email', email, 'Email is required');
    }

    const db = getDatabaseService();

    // Check if email exists
    const existing = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    return createSuccessResponse({
      email,
      available: existing.rows.length === 0
    });
  },
  {
    allowedMethods: ['GET'],
    requireAuth: true
  }
);
