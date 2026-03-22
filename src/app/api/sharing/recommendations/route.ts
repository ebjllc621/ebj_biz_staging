/**
 * Sharing Recommendations API Routes
 * Phase 1 - Core Recommendation Flow
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all routes
 * - DatabaseService boundary: ALL database operations via SharingService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase User Recommendations - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_1_BRAIN_PLAN.md
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';
import type { EntityType } from '@features/contacts/types/sharing';
import {
  CreateRecommendationSchema,
  GetRecommendationsQuerySchema,
  validateInput,
  formatValidationErrors
} from '@features/contacts/validation/sharingSchemas';

// =============================================================================
// POST /api/sharing/recommendations - Create Recommendation
// =============================================================================

export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  try {
    const body = await context.request.json();

    // Zod validation (TD-008)
    const validation = validateInput(CreateRecommendationSchema, body);
    if (!validation.success) {
      return createErrorResponse(
        new BizError({
          code: 'VALIDATION_ERROR',
          message: formatValidationErrors(validation.error)
        }),
        context.requestId
      );
    }

    const input = validation.data;

    const recommendation = await sharingService.createRecommendation(userId, {
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      recipient_user_id: input.recipient_user_id,
      message: input.message,
      contact_id: input.contact_id
    });

    // Determine points earned from entity registry
    const { getEntityConfig } = await import('@features/contacts/config/entity-registry');
    const entityConfig = getEntityConfig(input.entity_type);
    const pointsEarned = entityConfig?.points || 0;

    return createSuccessResponse({
      recommendation,
      points_earned: pointsEarned
    }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    console.error('[POST /api/sharing/recommendations] Error:', error);
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to create recommendation' }),
      context.requestId
    );
  }
}, { requireAuth: true });

// =============================================================================
// GET /api/sharing/recommendations - Get Recommendations
// =============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  try {
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Zod validation (TD-008)
    const validation = validateInput(GetRecommendationsQuerySchema, queryParams);
    if (!validation.success) {
      return createErrorResponse(
        new BizError({
          code: 'VALIDATION_ERROR',
          message: formatValidationErrors(validation.error)
        }),
        context.requestId
      );
    }

    const query = validation.data;

    let recommendations;
    if (query.type === 'received') {
      recommendations = await sharingService.getReceivedRecommendations(userId, {
        entity_type: query.entity_type,
        status: query.status
      });
    } else {
      // sent - use getSentRecommendations which returns SharingWithPreview format
      recommendations = await sharingService.getSentRecommendations(userId, {
        entity_type: query.entity_type
      });
    }

    // Simple pagination (client-side for Phase 1)
    const total = recommendations.length;
    const startIndex = (query.page - 1) * query.per_page;
    const endIndex = startIndex + query.per_page;
    const paginatedRecommendations = recommendations.slice(startIndex, endIndex);

    return createSuccessResponse({
      recommendations: paginatedRecommendations,
      total,
      page: query.page,
      per_page: query.per_page,
      total_pages: Math.ceil(total / query.per_page)
    }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    console.error('[GET /api/sharing/recommendations] Error:', error);
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch recommendations' }),
      context.requestId
    );
  }
}, { requireAuth: true });
