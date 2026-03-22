/**
 * POST /api/sharing/recommendations/:id/helpful
 * Phase 4 - Mark recommendation as helpful or not helpful
 *
 * @tier SIMPLE
 * @phase User Recommendations - Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';
import {
  MarkHelpfulSchema,
  RecommendationIdSchema,
  validateInput,
  formatValidationErrors
} from '@features/contacts/validation/sharingSchemas';

export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  // Extract ID from URL pathname
  const pathParts = context.request.url.split('/');
  const id = pathParts[pathParts.length - 2] || ''; // Get ID from path

  // Zod validation for ID (TD-008)
  const idValidation = validateInput(RecommendationIdSchema, { id });
  if (!idValidation.success) {
    return createErrorResponse(
      new BizError({
        code: 'VALIDATION_ERROR',
        message: formatValidationErrors(idValidation.error)
      }),
      context.requestId
    );
  }

  const recommendationId = idValidation.data.id;

  try {
    const body = await context.request.json();

    // Zod validation for body (TD-008)
    const bodyValidation = validateInput(MarkHelpfulSchema, body);
    if (!bodyValidation.success) {
      return createErrorResponse(
        new BizError({
          code: 'VALIDATION_ERROR',
          message: formatValidationErrors(bodyValidation.error)
        }),
        context.requestId
      );
    }

    const { is_helpful } = bodyValidation.data;

    const result = await sharingService.markHelpful(userId, recommendationId, is_helpful);
    return createSuccessResponse(result, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to mark recommendation' }),
      context.requestId
    );
  }
}, { requireAuth: true });
