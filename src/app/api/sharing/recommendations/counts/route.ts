/**
 * GET /api/sharing/recommendations/counts
 * Phase 3 - Get inbox tab counts
 *
 * @tier SIMPLE
 * @phase User Recommendations - Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 * @reference src/app/api/sharing/recommendations/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';

/**
 * GET handler for inbox counts
 * Returns counts for All/Received/Sent/Saved tabs
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  const counts = await sharingService.getInboxCounts(userId);
  return createSuccessResponse(counts, context.requestId);
}, { requireAuth: true });
