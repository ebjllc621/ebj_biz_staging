/**
 * Contact Detail API Route
 * PUT /api/contacts/[contactId] - Update contact CRM fields
 * DELETE /api/contacts/[contactId] - Delete manual contact (Phase C)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_C_MANUAL_CONTACTS_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { UpdateContactInput } from '@features/contacts/types';

/**
 * PUT /api/contacts/[contactId]
 * Update contact CRM fields (notes, tags, category, reminders, etc.)
 *
 * @authenticated Required
 * @param contactId Contact user ID (for connected) OR contact row ID (for manual)
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);

  const userId = parseInt(context.userId!, 10);

  // Extract contactId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const contactIdStr = pathParts[pathParts.length - 1];

  if (!contactIdStr) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_CONTACT_ID', message: 'Missing contact ID' }),
      context.requestId
    );
  }

  const contactId = parseInt(contactIdStr, 10);

  if (isNaN(contactId)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_CONTACT_ID', message: 'Invalid contact ID' }),
      context.requestId
    );
  }

  // Parse request body
  const body = await context.request.json();
  const input: UpdateContactInput = {
    notes: body.notes !== undefined ? body.notes : undefined,
    tags: body.tags !== undefined ? body.tags : undefined,
    category: body.category !== undefined ? body.category : undefined,
    priority: body.priority !== undefined ? body.priority : undefined,
    follow_up_date: body.follow_up_date !== undefined ? body.follow_up_date : undefined,
    follow_up_note: body.follow_up_note !== undefined ? body.follow_up_note : undefined,
    last_contacted_at: body.last_contacted_at !== undefined ? body.last_contacted_at : undefined,
    is_starred: body.is_starred !== undefined ? body.is_starred : undefined,
    is_archived: body.is_archived !== undefined ? body.is_archived : undefined,
    // Contact info fields (manual contacts)
    contact_email: body.contact_email !== undefined ? body.contact_email : undefined,
    contact_phone: body.contact_phone !== undefined ? body.contact_phone : undefined,
    contact_company: body.contact_company !== undefined ? body.contact_company : undefined,
    contact_address: body.contact_address !== undefined ? body.contact_address : undefined,
    contact_social_links: body.contact_social_links !== undefined ? body.contact_social_links : undefined
  };

  // Check if this is a manual contact (contact_user_id IS NULL)
  // Manual contacts pass their row ID, connected contacts pass the other user's ID
  const manualContact = await service.getManualContactById(userId, contactId);

  let updatedContact;
  if (manualContact) {
    // Manual contact: use updateManualContact with row ID
    // Type assertion needed: UpdateContactInput is compatible at runtime
    updatedContact = await service.updateManualContact(userId, contactId, input as any);
  } else {
    // Connected contact: use updateContact with the other user's ID
    updatedContact = await service.updateContact(userId, contactId, input);
  }

  return createSuccessResponse({
    contact: updatedContact
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * DELETE /api/contacts/[contactId]
 * Delete a manual contact (Phase C)
 * Note: Connected contacts cannot be deleted - only manual contacts
 *
 * @authenticated Required
 * @param contactId Manual contact ID to delete
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);

  const userId = parseInt(context.userId!, 10);

  // Extract contactId from URL path (same as PUT)
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const contactIdStr = pathParts[pathParts.length - 1];

  if (!contactIdStr) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_CONTACT_ID', message: 'Missing contact ID' }),
      context.requestId
    );
  }

  const contactId = parseInt(contactIdStr, 10);

  if (isNaN(contactId)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_CONTACT_ID', message: 'Invalid contact ID' }),
      context.requestId
    );
  }

  try {
    await service.deleteManualContact(userId, contactId);
    return createSuccessResponse({ deleted: true }, context.requestId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse(
        new BizError({ code: 'CONTACT_NOT_FOUND', message: 'Manual contact not found or cannot be deleted' }),
        context.requestId
      );
    }
    throw error;
  }
}, {
  requireAuth: true
});
