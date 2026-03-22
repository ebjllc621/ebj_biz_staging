/**
 * GET /api/offers/qr-code/[claimId]
 *
 * Get QR code data for a specific claim
 *
 * @tier ADVANCED
 * @phase Phase 3 - QR Code Infrastructure
 * @authority Phase 3 Brain Plan
 */

import { getOfferService, getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Retrieve QR code data for claim
 *
 * Auth: Claim owner only
 * Returns: QRCodeData
 *
 * @example
 * GET /api/offers/qr-code/123
 * Response: { data: { claimId, promoCode, verificationUrl, expiresAt, offerTitle, businessName } }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to view QR codes');
  }

  // Extract claimId from URL path: /api/offers/qr-code/[claimId]
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const claimIdStr = pathParts[pathParts.length - 1] || '';
  const claimId = parseInt(claimIdStr, 10);

  if (isNaN(claimId)) {
    throw BizError.badRequest('Invalid claim ID', { claimId: claimIdStr });
  }

  // Verify claim ownership
  const db = getDatabaseService();
  const claimResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM offer_claims WHERE id = ?',
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw BizError.notFound('Claim', claimId);
  }

  if (claimResult.rows[0]?.user_id !== user.id) {
    throw BizError.forbidden('You do not own this claim');
  }

  // Get QR code data
  const offerService = getOfferService();
  const qrData = await offerService.generateQRCodeData(claimId);

  return createSuccessResponse(qrData);
});
