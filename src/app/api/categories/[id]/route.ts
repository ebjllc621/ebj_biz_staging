/**
 * Category by ID API Routes
 * GET /api/categories/[id] - Get category by ID
 * PATCH /api/categories/[id] - Update category (admin only)
 * DELETE /api/categories/[id] - Delete category (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Response format: createSuccessResponse/createErrorResponse
 *
 * @authority CLAUDE.md - API Standards section
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { CategoryService, CategoryNotFoundError } from '@core/services/CategoryService';
import { getCategoryService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/categories/[id]
 * Get category by ID
 *
 * @public No authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      throw BizError.badRequest('Invalid category ID', { id: params.id });
    }

    
    const service = getCategoryService();
    const category = await service.getById(categoryId);

    if (!category) {
      throw new CategoryNotFoundError(categoryId);
    }

    return createSuccessResponse(
      { category },
      context.requestId
    );
  }, {
    allowedMethods: ['GET', 'PATCH', 'DELETE']
  })(request);
}

/**
 * PATCH /api/categories/[id]
 * Update category
 * Body: Partial category data (name, slug, keywords, description, parent_id, etc.)
 *
 * @admin Admin authentication required
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      throw BizError.badRequest('Invalid category ID', { id: params.id });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      throw BizError.badRequest('Invalid JSON in request body');
    }

    // Validate body is an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw BizError.badRequest('Request body must be an object');
    }

    const requestBody = body as Record<string, unknown>;

    // Validate and prepare update data
    const updateData: Record<string, unknown> = {};

    if (requestBody.name !== undefined) {
      if (typeof requestBody.name !== 'string' || requestBody.name.trim() === '') {
        throw BizError.validation('name', requestBody.name, 'Name must be a non-empty string');
      }
      updateData.name = requestBody.name.trim();
    }

    if (requestBody.slug !== undefined) {
      if (typeof requestBody.slug !== 'string') {
        throw BizError.validation('slug', requestBody.slug, 'Slug must be a string');
      }
      updateData.slug = requestBody.slug.trim();
    }

    if (requestBody.keywords !== undefined) {
      if (!Array.isArray(requestBody.keywords)) {
        throw BizError.validation('keywords', requestBody.keywords, 'Keywords must be an array');
      }
      updateData.keywords = requestBody.keywords;
    }

    if (requestBody.description !== undefined) {
      if (typeof requestBody.description !== 'string') {
        throw BizError.validation('description', requestBody.description, 'Description must be a string');
      }
      updateData.description = requestBody.description;
    }

    if (requestBody.cat_description !== undefined) {
      if (typeof requestBody.cat_description !== 'string') {
        throw BizError.validation('cat_description', requestBody.cat_description, 'Cat_description must be a string');
      }
      updateData.cat_description = requestBody.cat_description;
    }

    if (requestBody.parent_id !== undefined) {
      if (requestBody.parent_id === null) {
        updateData.parent_id = null;
      } else {
        const parentId = parseInt(requestBody.parent_id as string);
        if (isNaN(parentId)) {
          throw BizError.validation('parent_id', requestBody.parent_id, 'Parent_id must be a number or null');
        }
        updateData.parent_id = parentId;
      }
    }

    if (requestBody.sort_order !== undefined) {
      const sortOrder = parseInt(requestBody.sort_order as string);
      if (isNaN(sortOrder)) {
        throw BizError.validation('sort_order', requestBody.sort_order, 'Sort_order must be a number');
      }
      updateData.sort_order = sortOrder;
    }

    if (requestBody.is_active !== undefined) {
      if (typeof requestBody.is_active !== 'boolean') {
        throw BizError.validation('is_active', requestBody.is_active, 'Is_active must be a boolean');
      }
      updateData.is_active = requestBody.is_active;
    }

    // Update category
    
    const service = getCategoryService();
    const category = await service.update(categoryId, updateData);

    return createSuccessResponse(
      { category },
      context.requestId
    );
  }, {
    requireAuth: true, // TODO: Change to requireAdmin when RBAC is implemented
    allowedMethods: ['GET', 'PATCH', 'DELETE']
  })(request);
}

/**
 * DELETE /api/categories/[id]
 * Delete category with audit logging
 * Query params:
 *   - orphanHandling: 'reassign' (default) or 'delete'
 *
 * @admin Admin authentication required
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      throw BizError.badRequest('Invalid category ID', { id: params.id });
    }

    // Get orphan handling preference from query params
    const url = new URL(request.url);
    const orphanHandlingParam = url.searchParams.get('orphanHandling');
    const orphanHandling: 'reassign' | 'delete' =
      orphanHandlingParam === 'delete' ? 'delete' : 'reassign';

    const service = getCategoryService();

    // AUDIT: Capture category data BEFORE deletion
    const category = await service.getById(categoryId);
    if (!category) {
      throw new CategoryNotFoundError(categoryId);
    }

    const children = await service.getChildren(categoryId);
    const beforeData = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
      keywords: category.keywords,
      description: category.description,
      is_active: category.is_active,
      children_count: children.length
    };

    // Execute deletion
    const result = await service.delete(categoryId, orphanHandling);

    // AUDIT: Log to admin_activity (non-blocking)
    const currentUser = await getUserFromRequest(request);
    if (currentUser) {
      const adminActivityService = getAdminActivityService();
      await adminActivityService.logDeletion({
        adminUserId: currentUser.id,
        targetEntityType: 'category',
        targetEntityId: categoryId,
        actionDescription: `Deleted category: ${category.name}`,
        beforeData,
        afterData: {
          orphan_handling: orphanHandling,
          affected_children: result.affected_children
        },
        ipAddress: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        sessionId: request.cookies.get('bk_session')?.value
      });
    }

    return createSuccessResponse(
      {
        message: 'Category deleted successfully',
        categoryId,
        affected_children: result.affected_children
      },
      context.requestId
    );
  }, {
    requireAuth: true, // TODO: Change to requireAdmin when RBAC is implemented
    allowedMethods: ['GET', 'PATCH', 'DELETE']
  })(request);
}
