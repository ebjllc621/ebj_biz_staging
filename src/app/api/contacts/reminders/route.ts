/**
 * Contact Reminders API Route
 * GET /api/contacts/reminders - Get contacts with upcoming follow-up reminders
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_B_CRM_FEATURES_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/reminders
 * Get contacts with upcoming follow-up reminders
 *
 * Query Parameters:
 * - days (optional): Number of days ahead to look (default: 7)
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);

  const userId = parseInt(context.userId!, 10);

  // Get days parameter from query string
  const url = new URL(context.request.url);
  const daysParam = url.searchParams.get('days');
  const daysAhead = daysParam ? parseInt(daysParam, 10) : 7;

  // Get contacts with upcoming reminders
  const reminders = await service.getUpcomingReminders(userId, daysAhead);

  return createSuccessResponse({
    reminders,
    total: reminders.length,
    days_ahead: daysAhead
  }, context.requestId);
}, {
  requireAuth: true
});
