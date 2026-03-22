/**
 * External Reviews Connect API Route
 *
 * POST /api/external-reviews/connect
 * Auth required, CSRF protected — connect a provider to a listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY (state-changing POST)
 * - Response format: createSuccessResponse/createErrorResponse
 * - Ownership validation: user must own the listing
 * - Tier gate: listing must be 'preferred' or 'premium'
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

interface ConnectRequestBody {
  listing_id: number;
  provider: string;
  provider_entity_id: string;
  canonical_url?: string;
}

interface ListingRow {
  id: number;
  user_id: number;
  tier: string;
}

const ALLOWED_PROVIDERS = ['google', 'yelp', 'facebook'];
const ELIGIBLE_TIERS = ['preferred', 'premium'];

/**
 * POST /api/external-reviews/connect
 * Connects an external review provider to a listing.
 * Requires listing ownership + preferred/premium tier.
 */
export const POST = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // Require authentication
  const user = await getUserFromRequest(request as NextRequest);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Parse body
  let body: Partial<ConnectRequestBody>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  // Validate required fields
  const { listing_id, provider, provider_entity_id, canonical_url } = body;

  if (!listing_id || typeof listing_id !== 'number' || listing_id <= 0) {
    return createErrorResponse('listing_id is required and must be a positive number', 400);
  }

  if (!provider || typeof provider !== 'string') {
    return createErrorResponse('provider is required', 400);
  }

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return createErrorResponse(`provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`, 400);
  }

  if (!provider_entity_id || typeof provider_entity_id !== 'string' || !provider_entity_id.trim()) {
    return createErrorResponse('provider_entity_id is required', 400);
  }

  const db = getDatabaseService();

  // Verify listing ownership and tier
  const listingResult = await db.query<ListingRow>(
    'SELECT id, user_id, tier FROM listings WHERE id = ? LIMIT 1',
    [listing_id]
  );

  const listing = listingResult.rows[0];

  if (!listing) {
    return createErrorResponse('Listing not found', 404);
  }

  if (Number(listing.user_id) !== Number(user.id)) {
    return createErrorResponse('You do not own this listing', 403);
  }

  if (!ELIGIBLE_TIERS.includes(listing.tier)) {
    return createErrorResponse(
      'External review integration requires a Preferred or Premium listing tier',
      403
    );
  }

  const service = new ExternalReviewAdapterService(db);
  const source = await service.connectProvider(
    listing_id,
    provider,
    provider_entity_id.trim(),
    canonical_url && typeof canonical_url === 'string' ? canonical_url.trim() : null
  );

  return createSuccessResponse({ source }, 201);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
