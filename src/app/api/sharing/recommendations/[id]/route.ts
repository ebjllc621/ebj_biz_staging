/**
 * PATCH /api/sharing/recommendations/:id
 * Phase 3 - Mark as viewed, toggle saved
 *
 * @tier SIMPLE
 * @phase User Recommendations - Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 * @reference src/app/api/dashboard/notifications/[id]/route.ts - Dynamic route pattern
 */

import { NextResponse } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';
import {
  UpdateRecommendationSchema,
  RecommendationIdSchema,
  validateInput,
  formatValidationErrors
} from '@features/contacts/validation/sharingSchemas';

/**
 * PATCH handler for updating recommendation status
 * Actions: 'view' | 'toggle_saved'
 */
export const PATCH = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  // Extract recommendation ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const idParam = pathParts[pathParts.length - 1];

  // Zod validation for ID (TD-008)
  const idValidation = validateInput(RecommendationIdSchema, { id: idParam });
  if (!idValidation.success) {
    throw BizError.badRequest(formatValidationErrors(idValidation.error));
  }

  const recommendationId = idValidation.data.id;

  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId, 10);

  const body = await context.request.json();

  // Zod validation for body (TD-008)
  const bodyValidation = validateInput(UpdateRecommendationSchema, body);
  if (!bodyValidation.success) {
    throw BizError.badRequest(formatValidationErrors(bodyValidation.error));
  }

  const { action } = bodyValidation.data;

  if (action === 'view') {
    await sharingService.markAsViewed(userId, recommendationId);
    return NextResponse.json({
      success: true,
      data: { viewed: true },
      meta: { requestId: context.requestId }
    });
  }

  if (action === 'toggle_saved') {
    const result = await sharingService.toggleSaved(userId, recommendationId);
    return NextResponse.json({
      success: true,
      data: result,
      meta: { requestId: context.requestId }
    });
  }

  // Should never reach here due to Zod enum validation
  throw BizError.badRequest('Invalid action');
}, { requireAuth: true });
