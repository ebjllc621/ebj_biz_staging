/**
 * Single Contact Match API Route
 * GET /api/contacts/[contactId]/match - Match single contact to user
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { NextResponse } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { ContactMatchService } from '@features/contacts/services/ContactMatchService';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/contacts/[contactId]/match
 * Match a single contact to Bizconekt users
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const contactService = new ContactService(db);
  const matchService = new ContactMatchService(db);
  const userId = parseInt(context.userId!, 10);

  // Get contactId from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const contactIdIndex = pathParts.indexOf('contacts') + 1;
  const contactIdStr = pathParts[contactIdIndex];

  if (!contactIdStr) {
    const error = new BizError({ code: 'VALIDATION_ERROR', message: 'Contact ID missing from URL' });
    return NextResponse.json(
      createErrorResponse(error, context.requestId),
      { status: 400 }
    );
  }

  const contactId = parseInt(contactIdStr, 10);

  if (isNaN(contactId)) {
    const error = new BizError({ code: 'VALIDATION_ERROR', message: 'Invalid contact ID' });
    return NextResponse.json(
      createErrorResponse(error, context.requestId),
      { status: 400 }
    );
  }

  // Get the contact
  const allContacts = await contactService.getContacts(userId);
  const contact = allContacts.find(c => c.id === contactId);

  if (!contact) {
    const error = new BizError({ code: 'NOT_FOUND', message: 'Contact not found' });
    return NextResponse.json(
      createErrorResponse(error, context.requestId),
      { status: 404 }
    );
  }

  // Match the contact
  const result = await matchService.matchContact(userId, contact);

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true
});
