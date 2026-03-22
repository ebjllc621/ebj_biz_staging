/**
 * Admin Listing Name Check API
 * GET /api/admin/listings/check-name?name=x&excludeId=y - Check name availability
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only access
 * - Read-only operation (no CSRF required)
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @phase Phase 5 - Listing Editor Modal
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { NextRequest } from 'next/server';

export const GET = apiHandler(
  async (context: ApiContext) => {
    const { request } = context;

    // Get current admin user
    const currentUser = await getUserFromRequest(request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const excludeId = url.searchParams.get('excludeId');

    if (!name?.trim()) {
      throw BizError.validation('name', name, 'Name is required');
    }

    const db = getDatabaseService();

    // Check if name exists (excluding current listing if editing)
    let query = 'SELECT id FROM listings WHERE name = ?';
    const params: (string | number)[] = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(parseInt(excludeId));
    }

    const existing = await db.query<{ id: number }>(query, params);

    return createSuccessResponse({
      name,
      available: existing.rows.length === 0
    });
  },
  {
    allowedMethods: ['GET'],
    requireAuth: true
  }
);
