/**
 * Smart List Detail API Route
 * GET /api/contacts/smart-lists/[listId] - Get smart list details
 * PUT /api/contacts/smart-lists/[listId] - Update smart list
 * DELETE /api/contacts/smart-lists/[listId] - Delete smart list
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
 * @reference src/app/api/contacts/[contactId]/route.ts - Dynamic route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/smart-lists/[listId]
 * Get smart list details with contacts
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
  const listId = pathParts[pathParts.length - 1] || '';
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
    return createErrorResponse(
      new BizError({ code: 'LIST_NOT_FOUND', message: 'Smart list not found' }),
      context.requestId
    );
  }

  // Get matching contacts
  const contacts = await service.getContactsByCriteria(userId, smartList.criteria);

  return createSuccessResponse({
    smart_list: smartList,
    contacts,
    total: contacts.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * PUT /api/contacts/smart-lists/[listId]
 * Update smart list
 *
 * Body:
 * - name (optional): Updated name
 * - description (optional): Updated description
 * - criteria (optional): Updated criteria
 * - icon (optional): Updated icon
 * - color (optional): Updated color
 *
 * @authenticated Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Extract listId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listId = pathParts[pathParts.length - 1] || '';
  const listIdNum = parseInt(listId, 10);

  if (isNaN(listIdNum)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_LIST_ID', message: 'Invalid smart list ID' }),
      context.requestId
    );
  }

  const body = await context.request.json();

  try {
    const smartList = await service.updateSmartList(userId, listIdNum, {
      name: body.name,
      description: body.description,
      criteria: body.criteria,
      icon: body.icon,
      color: body.color
    });

    return createSuccessResponse({ smart_list: smartList }, context.requestId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse(
        new BizError({ code: 'LIST_NOT_FOUND', message: 'Smart list not found or is a system list' }),
        context.requestId
      );
    }
    throw error;
  }
}, {
  requireAuth: true
});

/**
 * DELETE /api/contacts/smart-lists/[listId]
 * Delete smart list (user-created only)
 *
 * @authenticated Required
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Extract listId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listId = pathParts[pathParts.length - 1] || '';
  const listIdNum = parseInt(listId, 10);

  if (isNaN(listIdNum)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_LIST_ID', message: 'Invalid smart list ID' }),
      context.requestId
    );
  }

  await service.deleteSmartList(userId, listIdNum);

  return createSuccessResponse({
    deleted: true,
    list_id: listIdNum
  }, context.requestId);
}, {
  requireAuth: true
});
