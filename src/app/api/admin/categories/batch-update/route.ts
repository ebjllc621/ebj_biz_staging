/**
 * Batch Update Categories API Route
 *
 * PHASE 3: NEW - Batch operations for admin categories
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: fetchWithCsrf required (automatic in apiHandler POST)
 * - Authentication: Admin-only access
 * - Service Boundary: CategoryService for all DB operations
 * - Response Format: createSuccessResponse/createErrorResponse
 * - Cookie name: bk_session (canonical)
 *
 * @authority docs/pages/layouts/admin/pageTables/categories/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Phase 3 - Batch Operations
 */

import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getCategoryService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

interface BatchUpdateRequest {
  categoryIds: number[];
  updates: {
    parent_id?: number | null;
    is_active?: boolean;
    keywords_add?: string[];
    keywords_remove?: string[];
  };
}

/**
 * POST /api/admin/categories/batch-update
 * Bulk update multiple categories
 *
 * Request Body:
 * {
 *   categoryIds: number[];
 *   updates: {
 *     parent_id?: number | null;
 *     is_active?: boolean;
 *     keywords_add?: string[];
 *     keywords_remove?: string[];
 *   }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     updated: Category[],
 *     failed: Array<{ id: number, error: string }>
 *   }
 * }
 */
export const POST = apiHandler(async (context) => {
  // Parse request body
  const body = await context.request.json() as BatchUpdateRequest;
  const { categoryIds, updates } = body;

  // Validation
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw BizError.badRequest('categoryIds array is required and must not be empty');
  }

  if (categoryIds.length > 100) {
    throw BizError.badRequest('Maximum 100 categories can be updated per request');
  }

  if (!updates || typeof updates !== 'object') {
    throw BizError.badRequest('updates object is required');
  }

  // Execute bulk update via CategoryService
  const service = getCategoryService();
  const result = await service.bulkUpdate(categoryIds, updates);

  // AUDIT: Log to admin_activity (non-blocking)
  const currentUser = await getUserFromRequest(context.request);
  if (currentUser) {
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'category',
      targetEntityId: null,
      actionType: 'categories_batch_updated',
      actionCategory: 'update',
      actionDescription: `Batch updated ${categoryIds.length} categories`,
      afterData: { categoryIds, updates, result },
      severity: 'normal'
    });
  }

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
