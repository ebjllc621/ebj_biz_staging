/**
 * Categories API Routes
 * GET /api/categories - Get all categories (with optional filters)
 * POST /api/categories - Create new category (admin only)
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
import { getCategoryService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/categories
 * Get all categories with optional filters
 * Query parameters:
 *   - parentId: Filter by parent category ID (or 'null' for root categories)
 *   - isActive: Filter by active status (true/false)
 *   - search: Search categories by name (case-insensitive LIKE match)
 *   - limit: Maximum number of results (default 50 for search, unlimited otherwise)
 *
 * When search is provided, returns categories with fullPath (breadcrumb trail)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Get CategoryService singleton
  const service = getCategoryService();

  // Handle search parameter (name-based search with fullPath)
  const searchParam = searchParams.get('search');
  if (searchParam && searchParam.trim().length >= 2) {
    const searchTerm = searchParam.trim();
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    // Get all active categories and filter by name
    const allCategories = await service.getAll({ isActive: true });

    // Filter by name (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    const matchingCategories = allCategories.filter(cat =>
      cat.name.toLowerCase().includes(searchLower)
    ).slice(0, limit);

    // Build a map for quick parent lookups
    const categoryMap = new Map(allCategories.map(cat => [cat.id, cat]));

    // Compute fullPath and ancestors for each matching category
    const categoriesWithPath = matchingCategories.map(cat => {
      const pathParts: string[] = [];
      const ancestors: Array<{ id: number; name: string; slug: string; parentId: number | null; fullPath: string; keywords: string[] }> = [];
      let currentId: number | null | undefined = cat.parent_id;
      const visited = new Set<number>();

      // Walk up the parent chain
      while (currentId !== null && currentId !== undefined) {
        if (visited.has(currentId)) break; // Prevent infinite loop
        visited.add(currentId);

        const parent = categoryMap.get(currentId);
        if (parent) {
          pathParts.unshift(parent.name);
          // Add ancestor to list (will compute fullPath after)
          ancestors.unshift({
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            parentId: parent.parent_id ?? null,
            fullPath: '', // Will be computed below
            keywords: parent.keywords || []
          });
          currentId = parent.parent_id;
        } else {
          break;
        }
      }

      // Compute fullPath for each ancestor
      let ancestorPath = '';
      for (const ancestor of ancestors) {
        if (ancestorPath) {
          ancestorPath += ' > ' + ancestor.name;
        } else {
          ancestorPath = ancestor.name;
        }
        ancestor.fullPath = ancestorPath;
      }

      // Add current category to path
      pathParts.push(cat.name);

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parent_id ?? null,
        fullPath: pathParts.join(' > '),
        keywords: cat.keywords || [], // Include keywords from category
        ancestors // Array of parent categories from root to immediate parent
      };
    });

    return createSuccessResponse(
      { categories: categoriesWithPath },
      context.requestId
    );
  }

  // Standard filter-based retrieval (no search)
  const filters: Record<string, unknown> = {};

  const parentIdParam = searchParams.get('parentId');
  if (parentIdParam !== null) {
    if (parentIdParam === 'null') {
      filters.parentId = null;
    } else {
      const parentId = parseInt(parentIdParam);
      if (isNaN(parentId)) {
        throw BizError.badRequest('Invalid parentId parameter', { parentId: parentIdParam });
      }
      filters.parentId = parentId;
    }
  }

  const isActiveParam = searchParams.get('isActive');
  if (isActiveParam !== null) {
    if (isActiveParam === 'true') {
      filters.isActive = true;
    } else if (isActiveParam === 'false') {
      filters.isActive = false;
    } else {
      throw BizError.badRequest('Invalid isActive parameter (must be true or false)', { isActive: isActiveParam });
    }
  }

  const categories = await service.getAll(filters);

  // Transform to consistent response format (without ancestors for non-search)
  const transformedCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    parentId: cat.parent_id ?? null,
    fullPath: cat.name, // Just the name for non-search results
    keywords: cat.keywords || [], // Include keywords from category
    ancestors: [] as Array<{ id: number; name: string; slug: string; parentId: number | null; fullPath: string; keywords: string[] }>
  }));

  return createSuccessResponse(
    { categories: transformedCategories },
    context.requestId
  );
}, {
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/categories
 * Create a new category
 * Body:
 *   - name: Category name (required)
 *   - slug: URL slug (optional, auto-generated if not provided)
 *   - keywords: Array of keywords (optional)
 *   - description: Category description (optional)
 *   - cat_description: Alternative description field (optional)
 *   - parent_id: Parent category ID (optional, null for root)
 *   - sort_order: Sort order (optional, default 0)
 *   - is_active: Active status (optional, default true)
 *
 * @admin Admin authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

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

  // Validate required fields
  if (!requestBody.name || typeof requestBody.name !== 'string' || requestBody.name.trim() === '') {
    throw BizError.validation('name', requestBody.name, 'Name is required and must be a non-empty string');
  }

  // Prepare create data (typed per CreateCategoryInput)
  const createData: {
    name: string;
    slug?: string;
    keywords?: string[];
    description?: string;
    cat_description?: string;
    parent_id?: number | null;
    sort_order?: number;
    is_active?: boolean;
  } = {
    name: requestBody.name.trim()
  };

  if (requestBody.slug !== undefined) {
    if (typeof requestBody.slug !== 'string') {
      throw BizError.validation('slug', requestBody.slug, 'Slug must be a string');
    }
    createData.slug = requestBody.slug.trim();
  }

  if (requestBody.keywords !== undefined) {
    if (!Array.isArray(requestBody.keywords)) {
      throw BizError.validation('keywords', requestBody.keywords, 'Keywords must be an array');
    }
    createData.keywords = requestBody.keywords;
  }

  if (requestBody.description !== undefined) {
    if (typeof requestBody.description !== 'string') {
      throw BizError.validation('description', requestBody.description, 'Description must be a string');
    }
    createData.description = requestBody.description;
  }

  if (requestBody.cat_description !== undefined) {
    if (typeof requestBody.cat_description !== 'string') {
      throw BizError.validation('cat_description', requestBody.cat_description, 'Cat_description must be a string');
    }
    createData.cat_description = requestBody.cat_description;
  }

  if (requestBody.parent_id !== undefined && requestBody.parent_id !== null) {
    const parentId = parseInt(requestBody.parent_id as string);
    if (isNaN(parentId)) {
      throw BizError.validation('parent_id', requestBody.parent_id, 'Parent_id must be a number or null');
    }
    createData.parent_id = parentId;
  } else if (requestBody.parent_id === null) {
    createData.parent_id = null;
  }

  if (requestBody.sort_order !== undefined) {
    const sortOrder = parseInt(requestBody.sort_order as string);
    if (isNaN(sortOrder)) {
      throw BizError.validation('sort_order', requestBody.sort_order, 'Sort_order must be a number');
    }
    createData.sort_order = sortOrder;
  }

  if (requestBody.is_active !== undefined) {
    if (typeof requestBody.is_active !== 'boolean') {
      throw BizError.validation('is_active', requestBody.is_active, 'Is_active must be a boolean');
    }
    createData.is_active = requestBody.is_active;
  }

  // Get CategoryService singleton
  const service = getCategoryService();
  const category = await service.create(createData);

  return createSuccessResponse(
    { category },
    context.requestId
  );
}, {
  requireAuth: true, // TODO: Change to requireAdmin when RBAC is implemented
  allowedMethods: ['GET', 'POST']
}));
