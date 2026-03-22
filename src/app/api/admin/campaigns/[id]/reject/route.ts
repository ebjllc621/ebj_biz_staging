/**
 * Admin Campaign Rejection API Route
 *
 * PATCH /api/admin/campaigns/[id]/reject
 * Reject a pending campaign (admin action)
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getAdminActivityService } from '@core/services/AdminActivityService';

// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // TODO Phase B: Implement campaign rejection

  // Extract campaign ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = parseInt(pathParts[pathParts.length - 2] || '0');

  // Admin activity logging
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'campaign',
    targetEntityId: id,
    actionType: 'campaign_rejected',
    actionCategory: 'moderation',
    actionDescription: `Rejected campaign #${id}`,
    severity: 'normal'
  });

  return createSuccessResponse({ message: 'Campaign rejected successfully' }, context.requestId);
}));
