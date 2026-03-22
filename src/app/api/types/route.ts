/**
 * Public Types API Route
 * GET /api/types - Get all listing types (public, no auth required)
 *
 * Used by NewListingModal Section 2 (Basic Information) for type dropdown
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - No authentication required (public endpoint)
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @authority SYSREP-2026-02-08 - Missing route fix
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';

interface TypeRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

/**
 * GET /api/types
 * Get all listing types for dropdown selection
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();

  // Get all types ordered by name
  const typesResult = await db.query<TypeRow>(
    `SELECT id, name, slug, description
     FROM types
     ORDER BY name ASC`
  );

  const types = (typesResult.rows || []).map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || ''
  }));

  return createSuccessResponse({
    types,
    total: types.length
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
