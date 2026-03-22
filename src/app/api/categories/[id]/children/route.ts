/**
 * Category Children API Routes
 * GET /api/categories/[id]/children - Get child categories
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
import { getCategoryService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/categories/[id]/children
 * Get direct children of a category
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

    // Verify parent category exists
    
    const service = getCategoryService();
    const parent = await service.getById(categoryId);

    if (!parent) {
      throw new CategoryNotFoundError(categoryId);
    }

    // Get children
    const children = await service.getChildren(categoryId);

    return createSuccessResponse(
      {
        parent: {
          id: parent.id,
          name: parent.name,
          slug: parent.slug
        },
        children,
        count: children.length
      },
      context.requestId
    );
  }, {
    allowedMethods: ['GET']
  })(request);
}
