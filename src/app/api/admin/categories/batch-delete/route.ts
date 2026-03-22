/**
 * Batch Delete Categories API Route
 *
 * PHASE 3: NEW - Batch delete operations for admin categories
 * ENHANCED: Admin audit logging to admin_activity table
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: fetchWithCsrf required (automatic in apiHandler POST)
 * - Authentication: Admin-only access
 * - Service Boundary: CategoryService for all DB operations
 * - Response Format: createSuccessResponse/createErrorResponse
 * - Cookie name: bk_session (canonical)
 * - Orphan handling: reassign or cascade delete
 * - Audit logging: admin_activity table with before/after data
 *
 * @authority docs/pages/layouts/admin/pageTables/categories/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Phase 3 - Batch Operations
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getCategoryService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

interface BatchDeleteRequest {
  categoryIds: number[];
  orphanHandling: 'delete' | 'reassign';
}

/**
 * POST /api/admin/categories/batch-delete
 * Bulk delete multiple categories with audit logging
 *
 * Request Body:
 * {
 *   categoryIds: number[];
 *   orphanHandling: 'delete' | 'reassign';
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     deleted: number,
 *     affected_children: number,
 *     failed: number[]
 *   }
 * }
 */
export const POST = apiHandler(async (context) => {
  const request = context.request as NextRequest;

  // Parse request body
  const body = await request.json() as BatchDeleteRequest;
  const { categoryIds, orphanHandling } = body;

  // Validation
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw BizError.badRequest('categoryIds array is required and must not be empty');
  }

  if (categoryIds.length > 100) {
    throw BizError.badRequest('Maximum 100 categories can be deleted per request');
  }

  if (!['delete', 'reassign'].includes(orphanHandling)) {
    throw BizError.badRequest('orphanHandling must be either "delete" or "reassign"');
  }

  const service = getCategoryService();

  // AUDIT: Capture category data BEFORE deletion
  const categoriesBeforeData = await Promise.all(
    categoryIds.map(async (id) => {
      try {
        const cat = await service.getById(id);
        if (!cat) return null;
        const children = await service.getChildren(id);
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parent_id: cat.parent_id,
          keywords: cat.keywords,
          is_active: cat.is_active,
          children_count: children.length
        };
      } catch {
        return null;
      }
    })
  );

  // Execute bulk delete via CategoryService
  const result = await service.bulkDelete(categoryIds, orphanHandling);

  // AUDIT: Log to admin_activity (non-blocking)
  const currentUser = await getUserFromRequest(request);
  if (currentUser) {
    const adminActivityService = getAdminActivityService();
    // Filter out nulls and cast to proper type (filter(Boolean) removes nulls)
    const validCategories = categoriesBeforeData.filter(
      (cat): cat is NonNullable<typeof cat> => cat !== null
    );

    await adminActivityService.logBatchDeletion({
      adminUserId: currentUser.id,
      targetEntityType: 'category',
      actionDescription: `Batch deleted ${result.deleted} categories`,
      beforeData: {
        items: validCategories as Record<string, unknown>[],
        total_requested: categoryIds.length
      },
      afterData: {
        deleted: result.deleted,
        affected_children: result.affected_children,
        failed: result.failed,
        orphan_handling: orphanHandling
      },
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
      severity: result.deleted > 10 ? 'high' : 'normal'
    });
  }

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
