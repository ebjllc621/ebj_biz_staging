/**
 * External Reviews Disconnect API Route
 *
 * POST /api/external-reviews/disconnect
 * Auth required, CSRF protected — disconnect a provider from a listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY (state-changing POST)
 * - Response format: createSuccessResponse/createErrorResponse
 * - Ownership validation: user must own the listing
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6A - Task 6.3: External Reviews API Routes
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ExternalReviewAdapterService } from '@core/services/ExternalReviewAdapterService';
import { withCsrf } from '@/lib/security/withCsrf';
import type { NextRequest } from 'next/server';

interface DisconnectRequestBody {
  listing_id: number;
  provider: string;
}

interface ListingRow {
  id: number;
  user_id: number;
}

/**
 * POST /api/external-reviews/disconnect
 * Disconnects an external review provider from a listing.
 * Sets status to 'disconnected' — preserves history row.
 */
export const POST = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // Require authentication
  const user = await getUserFromRequest(request as NextRequest);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Parse body
  let body: Partial<DisconnectRequestBody>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const { listing_id, provider } = body;

  if (!listing_id || typeof listing_id !== 'number' || listing_id <= 0) {
    return createErrorResponse('listing_id is required and must be a positive number', 400);
  }

  if (!provider || typeof provider !== 'string' || !provider.trim()) {
    return createErrorResponse('provider is required', 400);
  }

  const db = getDatabaseService();

  // Verify listing ownership
  const listingResult = await db.query<ListingRow>(
    'SELECT id, user_id FROM listings WHERE id = ? LIMIT 1',
    [listing_id]
  );

  const listing = listingResult.rows[0];

  if (!listing) {
    return createErrorResponse('Listing not found', 404);
  }

  if (Number(listing.user_id) !== Number(user.id)) {
    return createErrorResponse('You do not own this listing', 403);
  }

  const service = new ExternalReviewAdapterService(db);
  await service.disconnectProvider(listing_id, provider.trim());

  return createSuccessResponse({ message: 'Provider disconnected' });
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
