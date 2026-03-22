/**
 * Entity Preview API Route
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
  EntityPreviewQuerySchema,
  validateInput,
  formatValidationErrors
} from '@features/contacts/validation/sharingSchemas';

// =============================================================================
// GET /api/sharing/entity-preview - Get Entity Preview
// =============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);

  try {
    const url = new URL(context.request.url);
    const queryParams = {
      entity_type: url.searchParams.get('type'),
      entity_id: url.searchParams.get('id')
    };

    // Zod validation (TD-008)
    const validation = validateInput(EntityPreviewQuerySchema, queryParams);
    if (!validation.success) {
      return createErrorResponse(
        new BizError({
          code: 'VALIDATION_ERROR',
          message: formatValidationErrors(validation.error)
        }),
        context.requestId
      );
    }

    const { entity_type, entity_id } = validation.data;

    const preview = await sharingService.getEntityPreview(entity_type, entity_id);

    return createSuccessResponse({
      preview
    }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    console.error('[GET /api/sharing/entity-preview] Error:', error);
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch entity preview' }),
      context.requestId
    );
  }
}, { requireAuth: true });
