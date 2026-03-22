/**
 * Smart Lists API Route
 * GET /api/contacts/smart-lists - Get all smart lists
 * POST /api/contacts/smart-lists - Create smart list
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/smart-lists
 * Get all smart lists (system + user-created)
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Get user's saved smart lists
  const userLists = await service.getSmartLists(userId);

  // Get system smart lists
  const systemLists = service.getSystemSmartLists();

  // Calculate contact counts for system lists
  const systemListsWithCounts = await Promise.all(
    systemLists.map(async (list) => {
      const contacts = await service.getContactsByCriteria(userId, list.criteria);
      return {
        ...list,
        id: 0, // System lists use ID 0
        user_id: userId,
        contact_count: contacts.length,
        created_at: new Date(),
        updated_at: new Date()
      };
    })
  );

  const allLists = [...systemListsWithCounts, ...userLists];

  return createSuccessResponse({
    smart_lists: allLists,
    total: allLists.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/contacts/smart-lists
 * Create a new smart list
 *
 * Body:
 * - name (required): List name
 * - description (optional): List description
 * - criteria (required): SmartListCriteria object
 * - icon (optional): Lucide icon name
 * - color (optional): Tailwind color
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate required fields
  if (!body.name?.trim()) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_NAME', message: 'Smart list name is required' }),
      context.requestId
    );
  }

  if (!body.criteria) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_CRITERIA', message: 'Smart list criteria is required' }),
      context.requestId
    );
  }

  const smartList = await service.createSmartList(userId, {
    name: body.name,
    description: body.description,
    criteria: body.criteria,
    icon: body.icon,
    color: body.color
  });

  return createSuccessResponse({ smart_list: smartList }, context.requestId);
}, {
  requireAuth: true
});
