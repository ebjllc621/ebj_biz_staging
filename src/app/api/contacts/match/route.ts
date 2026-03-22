/**
 * Contact Match API Route
 * POST /api/contacts/match - Batch match contacts to users
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
 * POST /api/contacts/match
 * Batch match contacts to Bizconekt users
 *
 * @authenticated Required
 * @body { contactIds: number[] }
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const contactService = new ContactService(db);
  const matchService = new ContactMatchService(db);
  const userId = parseInt(context.userId!, 10);

  // Parse body
  const body = await context.request.json();
  const { contactIds } = body;

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    const error = new BizError({ code: 'VALIDATION_ERROR', message: 'contactIds array required' });
    return NextResponse.json(
      createErrorResponse(error, context.requestId),
      { status: 400 }
    );
  }

  // Get contacts for the user
  const allContacts = await contactService.getContacts(userId);

  // Filter to requested contact IDs
  const contactsToMatch = allContacts.filter(c => contactIds.includes(c.id));

  // Batch match
  const batchResult = await matchService.batchMatchContacts(userId, contactsToMatch);

  // Convert Map to object for JSON response
  const resultsObject: Record<number, any> = {};
  batchResult.results.forEach((result, contactId) => {
    resultsObject[contactId] = result;
  });

  return createSuccessResponse({
    total: batchResult.total,
    matched: batchResult.matched,
    results: resultsObject
  }, context.requestId);
}, {
  requireAuth: true
});
