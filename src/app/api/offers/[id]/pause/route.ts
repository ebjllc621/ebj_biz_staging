/**
 * Offer Pause API Route
 * PATCH /api/offers/[id]/pause - Pause/unpause offer
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * PATCH /api/offers/[id]/pause
 * Pause or unpause offer (toggles status between 'active' and 'paused')
 * Body:
 *   - paused: Boolean to pause (true) or unpause (false) (required)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract offer ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'pause')
  if (!id) {
    throw BizError.badRequest('Offer ID is required');
  }
  const offerId = parseInt(id);
  if (isNaN(offerId)) {
    throw BizError.badRequest('Invalid offer ID', { id });
  }

  // Pause offer (service only supports pausing, not toggling)
  const service = getOfferService();
  const offer = await service.pause(offerId);

  return createSuccessResponse({ offer }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH']
}));
