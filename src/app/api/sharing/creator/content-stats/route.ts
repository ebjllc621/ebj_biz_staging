/**
 * GET /api/sharing/creator/content-stats
 * Get content creator recommendation statistics
 *
 * @tier SIMPLE
 * @phase Phase 8 - Content Types
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, type ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/sharing/creator/content-stats
 * Returns content creator recommendation statistics
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  try {
    const stats = await sharingService.getCreatorContentStats(userId);

    return createSuccessResponse({
      stats
    }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch content stats' }),
      context.requestId
    );
  }
}, { requireAuth: true });
