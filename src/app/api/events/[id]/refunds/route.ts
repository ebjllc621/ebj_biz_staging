/**
 * Event Refund API Route
 * POST /api/events/[id]/refunds - Process refund for a ticket purchase
 *
 * @authority CLAUDE.md - API Standards, Security
 * @phase Phase 5B - Native Ticketing (Refunds)
 * @tier ENTERPRISE (payment processing)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

const eventService = getEventService();

/**
 * POST /api/events/[id]/refunds
 * Process a full refund for a ticket purchase.
 *
 * @authenticated Required (purchase owner OR admin)
 * @csrf Required (state-changing operation)
 *
 * Body: { purchase_id: number }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const request = context.request;

  // 1. Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to process refund');
  }

  // 2. Parse request body
  let body: { purchase_id?: number };
  try {
    body = await request.json();
  } catch {
    throw BizError.badRequest('Invalid request body');
  }

  const purchaseId = body.purchase_id;
  if (!purchaseId || typeof purchaseId !== 'number') {
    throw BizError.badRequest('purchase_id is required and must be a number');
  }

  // 3. Verify purchase exists
  const purchase = await eventService.getTicketPurchase(purchaseId);
  if (!purchase) {
    throw BizError.notFound('Ticket purchase', String(purchaseId));
  }

  // 4. Verify authorization: user owns purchase OR user is admin
  const isAdmin = user.role === 'admin';
  const isOwner = purchase.user_id === user.id;

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You can only refund your own purchases');
  }

  // 5. Process refund
  const updatedPurchase = await eventService.refundTicketPurchase(
    purchaseId,
    isAdmin ? user.id : undefined
  );

  return createSuccessResponse({ purchase: updatedPurchase }, context.requestId);
}, {
  allowedMethods: ['POST']
}));
