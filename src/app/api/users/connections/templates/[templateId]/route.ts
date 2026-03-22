/**
 * Individual Template API Route
 * GET /api/users/connections/templates/[templateId] - Get single template
 * PUT /api/users/connections/templates/[templateId] - Update template
 * DELETE /api/users/connections/templates/[templateId] - Delete template
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getTemplateService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections/templates/[templateId]
 * Get a single template by ID
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getTemplateService();
  const userId = parseInt(context.userId!, 10);

  // Extract templateId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const templateId = parseInt(lastPart, 10);

  if (isNaN(templateId)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_TEMPLATE_ID', message: 'Invalid template ID' }),
      context.requestId
    );
  }

  const template = await service.getTemplateById(templateId, userId);

  if (!template) {
    return createErrorResponse(
      new BizError({ code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }),
      context.requestId
    );
  }

  return createSuccessResponse({ template }, context.requestId);
}, {
  requireAuth: true
});

/**
 * PUT /api/users/connections/templates/[templateId]
 * Update a template
 *
 * Body (all optional):
 * - name: Template name
 * - message: Template message
 * - connection_type: Connection type
 * - intent_type: Intent type
 * - is_default: Set as default
 *
 * @authenticated Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const service = getTemplateService();
  const userId = parseInt(context.userId!, 10);

  // Extract templateId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const templateId = parseInt(lastPart, 10);

  if (isNaN(templateId)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_TEMPLATE_ID', message: 'Invalid template ID' }),
      context.requestId
    );
  }

  const body = await context.request.json();

  try {
    const template = await service.updateTemplate(templateId, userId, {
      name: body.name,
      message: body.message,
      connection_type: body.connection_type,
      intent_type: body.intent_type,
      is_default: body.is_default
    });

    return createSuccessResponse({ template }, context.requestId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse(
        new BizError({ code: 'TEMPLATE_NOT_FOUND', message: error.message }),
        context.requestId
      );
    }
    if (error instanceof Error && error.message.includes('already exists')) {
      return createErrorResponse(
        new BizError({ code: 'TEMPLATE_EXISTS', message: error.message }),
        context.requestId
      );
    }
    throw error;
  }
}, {
  requireAuth: true
});

/**
 * DELETE /api/users/connections/templates/[templateId]
 * Delete a template
 *
 * @authenticated Required
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const service = getTemplateService();
  const userId = parseInt(context.userId!, 10);

  // Extract templateId from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const templateId = parseInt(lastPart, 10);

  if (isNaN(templateId)) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_TEMPLATE_ID', message: 'Invalid template ID' }),
      context.requestId
    );
  }

  try {
    await service.deleteTemplate(templateId, userId);
    return createSuccessResponse({ deleted: true }, context.requestId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse(
        new BizError({ code: 'TEMPLATE_NOT_FOUND', message: error.message }),
        context.requestId
      );
    }
    throw error;
  }
}, {
  requireAuth: true
});
