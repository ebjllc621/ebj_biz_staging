/**
 * Contact Tags API Route
 * GET /api/contacts/tags - Get all unique tags used by current user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_B_CRM_FEATURES_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/tags
 * Get all unique tags used by the authenticated user
 * Used for tag autocomplete in ContactTagInput component
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);

  const userId = parseInt(context.userId!, 10);

  // Get user's unique tags
  const tags = await service.getUserTags(userId);

  return createSuccessResponse({
    tags
  }, context.requestId);
}, {
  requireAuth: true
});
