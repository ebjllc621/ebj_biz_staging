/**
 * Smart List Contacts API Route
 * GET /api/contacts/smart-lists/[listId]/contacts - Get contacts in smart list
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
 * @reference src/app/api/contacts/smart-lists/[listId]/route.ts - Dynamic route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/smart-lists/[listId]/contacts
 * Get all contacts that match the smart list criteria
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Extract listId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listId = pathParts[pathParts.length - 2] || ''; // Second to last because of /contacts at end
  const listIdNum = parseInt(listId, 10);

  if (isNaN(listIdNum)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_LIST_ID', message: 'Invalid smart list ID' }),
      context.requestId
    );
  }

  // Get smart list
  const smartLists = await service.getSmartLists(userId);
  const smartList = smartLists.find(sl => sl.id === listIdNum);

  if (!smartList) {
    // Check if it's a system list (ID = 0)
    const systemLists = service.getSystemSmartLists();
    const systemList = systemLists.find(sl => sl.name === decodeURIComponent(listId || ''));

    if (!systemList) {
      return createErrorResponse(
        new BizError({ code: 'LIST_NOT_FOUND', message: 'Smart list not found' }),
        context.requestId
      );
    }

    // Use system list criteria
    const contacts = await service.getContactsByCriteria(userId, systemList.criteria);

    return createSuccessResponse({
      contacts,
      total: contacts.length,
      list_name: systemList.name
    }, context.requestId);
  }

  // Get contacts for user's smart list
  const contacts = await service.getContactsByCriteria(userId, smartList.criteria);

  return createSuccessResponse({
    contacts,
    total: contacts.length,
    list_name: smartList.name
  }, context.requestId);
}, {
  requireAuth: true
});
