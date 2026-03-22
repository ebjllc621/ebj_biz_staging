/**
 * Bulk Actions API Route
 * POST /api/contacts/bulk - Execute bulk action on multiple contacts
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
 * POST /api/contacts/bulk
 * Execute bulk action on multiple contacts
 *
 * Body:
 * - action (required): 'add_tag' | 'remove_tag' | 'set_category' | 'set_priority' | 'star' | 'unstar' | 'archive' | 'unarchive' | 'delete' | 'export'
 * - contactIds (required): Array of contact IDs
 * - payload (optional): Action-specific data
 *   - tag (for add_tag/remove_tag): Tag name
 *   - category (for set_category): Category name
 *   - priority (for set_priority): Priority level
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate required fields
  if (!body.action) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_ACTION', message: 'Bulk action is required' }),
      context.requestId
    );
  }

  if (!body.contactIds || !Array.isArray(body.contactIds) || body.contactIds.length === 0) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_CONTACT_IDS', message: 'Contact IDs array is required' }),
      context.requestId
    );
  }

  // Validate action-specific payload
  if (['add_tag', 'remove_tag'].includes(body.action) && !body.payload?.tag) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_TAG', message: 'Tag is required for tag actions' }),
      context.requestId
    );
  }

  if (body.action === 'set_category' && !body.payload?.category) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_CATEGORY', message: 'Category is required for set_category action' }),
      context.requestId
    );
  }

  if (body.action === 'set_priority' && !body.payload?.priority) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_PRIORITY', message: 'Priority is required for set_priority action' }),
      context.requestId
    );
  }

  // Execute bulk action
  const result = await service.executeBulkAction(userId, {
    action: body.action,
    contactIds: body.contactIds,
    payload: body.payload
  });

  return createSuccessResponse({
    result,
    action: result.action,
    total: result.total,
    success: result.success,
    failed: result.failed,
    errors: result.errors
  }, context.requestId);
}, {
  requireAuth: true
});
