/**
 * Connection Request Templates API Route
 * GET /api/users/connections/templates - List user's templates
 * POST /api/users/connections/templates - Create new template
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
 * GET /api/users/connections/templates
 * List all templates for the authenticated user
 * Ordered by: default first, then usage count
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getTemplateService();
  const userId = parseInt(context.userId!, 10);

  const templates = await service.getTemplates(userId);

  return createSuccessResponse({
    templates,
    total: templates.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/templates
 * Create a new connection request template
 *
 * Body:
 * - name (required): Template name
 * - message (required): Template message
 * - connection_type (required): 'business' | 'professional' | 'personal'
 * - intent_type (required): Connection intent type
 * - is_default (optional): Set as default template
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const service = getTemplateService();
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate required fields
  if (!body.name?.trim()) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_NAME', message: 'Template name is required' }),
      context.requestId
    );
  }

  if (!body.message?.trim()) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_MESSAGE', message: 'Template message is required' }),
      context.requestId
    );
  }

  if (!body.connection_type) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_CONNECTION_TYPE', message: 'Connection type is required' }),
      context.requestId
    );
  }

  if (!body.intent_type) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_INTENT_TYPE', message: 'Intent type is required' }),
      context.requestId
    );
  }

  try {
    const template = await service.createTemplate(userId, {
      name: body.name,
      message: body.message,
      connection_type: body.connection_type,
      intent_type: body.intent_type,
      is_default: body.is_default || false
    });

    return createSuccessResponse({ template }, context.requestId);
  } catch (error) {
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
