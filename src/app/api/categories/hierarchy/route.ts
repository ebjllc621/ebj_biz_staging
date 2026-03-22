/**
 * Categories Hierarchy API Route
 * GET /api/categories/hierarchy - Get complete hierarchical category tree
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: CategoryService handles all DB operations
 * - Response format: createSuccessResponse with { hierarchy } key
 * - Service layer: All business logic in CategoryService.getHierarchy()
 *
 * @authority CLAUDE.md - API Standards section
 * @authority admin-build-map-v2.1.mdc - Service Architecture v2.0
 * @phase Phase 1.5 - Critical missing endpoint (blocks all admin functionality)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getCategoryService } from '@core/services/ServiceRegistry';

/**
 * GET /api/categories/hierarchy
 * Returns complete category tree with nested children
 *
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     hierarchy: Category[] // Nested tree structure with children arrays
 *   },
 *   requestId: string
 * }
 *
 * Algorithm: O(n) tree-building with Map-based lookups
 * - Single database query for all categories
 * - Map creation for O(1) parent lookups
 * - Orphaned categories promoted to root level
 * - Recursive sorting by sort_order, then name
 *
 * Expected performance (2,328 categories):
 * - Database query: ~50-100ms
 * - Tree building: ~5-10ms
 * - Total: <200ms
 *
 * @public No authentication required (categories are public data)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Get CategoryService singleton from registry
  const service = getCategoryService();

  // Get hierarchical tree (uses CategoryService.getHierarchy method)
  // Returns nested tree with children arrays at all levels
  const hierarchy = await service.getHierarchy();

  // Return with canonical response format
  // UI expects: data.data?.hierarchy ?? data.hierarchy
  return createSuccessResponse(
    { hierarchy },
    context.requestId
  );
}, {
  allowedMethods: ['GET']
});
