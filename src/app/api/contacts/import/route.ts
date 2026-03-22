/**
 * Contact Import API Route
 * POST /api/contacts/import - Execute contact import
 *
 * @tier SIMPLE
 * @authority Phase D Brain Plan
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { ImportRowData } from '@features/contacts/types';

/**
 * POST /api/contacts/import
 * Execute import with validated data
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate required fields
  if (!body.rows || !Array.isArray(body.rows)) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_ROWS', message: 'Import rows are required' }),
      context.requestId
    );
  }

  if (body.rows.length > 500) {
    return createErrorResponse(
      new BizError({ code: 'TOO_MANY_ROWS', message: 'Maximum 500 contacts per import' }),
      context.requestId
    );
  }

  const rows: ImportRowData[] = body.rows;
  const options = {
    skipDuplicates: body.skipDuplicates !== false,
    sourceDetails: body.sourceDetails || 'CSV Import'
  };

  const result = await service.importContacts(userId, rows, options);

  return createSuccessResponse({ result }, context.requestId);
}, {
  requireAuth: true
});
