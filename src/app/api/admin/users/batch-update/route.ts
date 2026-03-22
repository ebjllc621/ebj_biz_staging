/**
 * Admin Users Batch Update API
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: fetchWithCsrf on client
 * - Authentication: Admin-only access
 * - Service boundary: DatabaseService for operations
 *
 * DATABASE SCHEMA (verified 2026-01-31):
 * - role: enum('general','listing_member','admin')
 * - status: enum('active','suspended','banned','deleted','pending')
 * - NO membership_tier column exists
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @phase Phase 3 - Batch Selection & BatchHandlingBar
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { NextRequest } from 'next/server';

interface BatchUpdateRequest {
  userIds: number[];
  updates: {
    status?: 'active' | 'suspended' | 'banned';
    role?: 'general' | 'listing_member' | 'admin';
  };
}

export const POST = withCsrf(apiHandler(
  async (context) => {
    const body: BatchUpdateRequest = await context.request.json();
    const { userIds, updates } = body;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw BizError.validation('userIds', userIds, 'No users specified');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw BizError.validation('updates', updates, 'No updates specified');
    }

    // Admin authentication
    const currentUser = await getUserFromRequest(context.request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    const db = getDatabaseService();

    // Fetch before data for activity logging
    // NO membership_tier column - verified 2026-01-31
    const beforePlaceholders = userIds.map(() => '?').join(',');
    const beforeQuery = `SELECT id, email, role, status FROM users WHERE id IN (${beforePlaceholders})`;
    const beforeDataRows = await db.query(beforeQuery, userIds);

    // Build update fields
    const updateFields: string[] = [];
    const updateValues: (string | number)[] = [];

    if (updates.status) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.role) {
      updateFields.push('role = ?');
      updateValues.push(updates.role);
    }

    if (updateFields.length === 0) {
      throw BizError.validation('updates', updates, 'No valid update fields');
    }

    // Add updated_at
    updateFields.push('updated_at = NOW()');

    // Execute batch update
    const placeholders = userIds.map(() => '?').join(',');
    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id IN (${placeholders})
    `;

    const result = await db.query(query, [...updateValues, ...userIds]);

    // Log admin activity
    const adminActivityService = getAdminActivityService();
    const hasRoleChange = updates.role !== undefined;
    const isLargeBatch = userIds.length > 10;
    const severity = hasRoleChange || isLargeBatch ? 'high' : 'normal';

    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'user',
      targetEntityId: null, // Batch operation
      actionType: 'user_batch_updated',
      actionCategory: 'update',
      actionDescription: `Batch updated ${userIds.length} users. Changes: ${Object.keys(updates).join(', ')}`,
      beforeData: { affectedUsers: beforeDataRows, count: userIds.length },
      afterData: { updates, userIds, count: result.rowCount || userIds.length },
      severity
    });

    return createSuccessResponse({
      updated: result.rowCount || userIds.length,
      failed: 0,
      errors: []
    }, 200);
  }
));
