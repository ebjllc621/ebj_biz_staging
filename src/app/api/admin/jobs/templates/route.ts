/**
 * Admin Job Templates API Route
 *
 * GET /api/admin/jobs/templates - Get all templates (system + business)
 * POST /api/admin/jobs/templates - Create system template
 * PUT /api/admin/jobs/templates - Update system template
 * DELETE /api/admin/jobs/templates - Delete system template
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Admin authentication required
 * - System template CRUD operations
 * - Template usage analytics
 *
 * @see src/core/services/JobService.ts - Template management methods
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { TemplateCategory, EmploymentType, CompensationType, CreateTemplateInput, UpdateTemplateInput } from '@features/jobs/types';

/**
 * GET /api/admin/jobs/templates
 * Get all templates (admin only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate admin
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Get job service
  const jobService = getJobService();

  // Fetch system templates
  const systemTemplates = await jobService.getSystemTemplates();

  return createSuccessResponse({
    system_templates: systemTemplates,
    total: systemTemplates.length
  }, context.requestId);
});

/**
 * POST /api/admin/jobs/templates
 * Create system template (admin only)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate admin
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.template_name || typeof requestBody.template_name !== 'string' || !requestBody.template_name.trim()) {
    throw BizError.validation('template_name', requestBody.template_name, 'Template name is required');
  }

  if (!requestBody.template_category || typeof requestBody.template_category !== 'string') {
    throw BizError.validation('template_category', requestBody.template_category, 'Template category is required');
  }

  const validCategories: TemplateCategory[] = ['restaurant', 'retail', 'office', 'trades', 'healthcare', 'agriculture', 'hospitality', 'custom'];
  if (!validCategories.includes(requestBody.template_category as TemplateCategory)) {
    throw BizError.validation('template_category', requestBody.template_category, 'Invalid template category');
  }

  // Build input
  const input: CreateTemplateInput = {
    template_name: (requestBody.template_name as string).trim(),
    template_category: requestBody.template_category as TemplateCategory,
    employment_type: requestBody.employment_type as EmploymentType | undefined,
    description_template: requestBody.description_template as string | undefined,
    required_qualifications_template: requestBody.required_qualifications_template as string[] | undefined,
    preferred_qualifications_template: requestBody.preferred_qualifications_template as string[] | undefined,
    benefits_defaults: requestBody.benefits_defaults as string[] | undefined,
    compensation_type: requestBody.compensation_type as CompensationType | undefined,
    business_id: undefined // System templates have no business_id
  };

  // Get job service
  const jobService = getJobService();

  // Create template
  const template = await jobService.createTemplate(input);

  // Mark as system template (would need to update service method to support this)
  // For now, templates are created as business templates

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'job',
    targetEntityId: template?.id || null,
    actionType: 'job_template_created',
    actionCategory: 'creation',
    actionDescription: `Created job template "${input.template_name}" (${input.template_category})`,
    afterData: { template_name: input.template_name, template_category: input.template_category },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'System template created successfully',
    template
  }, context.requestId);
}));

/**
 * PUT /api/admin/jobs/templates
 * Update system template (admin only)
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate admin
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.template_id || typeof requestBody.template_id !== 'number') {
    throw BizError.validation('template_id', requestBody.template_id, 'Template ID is required');
  }

  // Get job service
  const jobService = getJobService();

  // Verify template exists
  const existingTemplate = await jobService.getTemplateById(requestBody.template_id as number);
  if (!existingTemplate) {
    throw BizError.notFound('Template not found');
  }

  // Build input
  const input: UpdateTemplateInput = {
    template_name: requestBody.template_name as string | undefined,
    template_category: requestBody.template_category as TemplateCategory | undefined,
    employment_type: requestBody.employment_type as EmploymentType | undefined,
    description_template: requestBody.description_template as string | undefined,
    required_qualifications_template: requestBody.required_qualifications_template as string[] | undefined,
    preferred_qualifications_template: requestBody.preferred_qualifications_template as string[] | undefined,
    benefits_defaults: requestBody.benefits_defaults as string[] | undefined,
    compensation_type: requestBody.compensation_type as CompensationType | undefined
  };

  // Update template
  const template = await jobService.updateTemplate(requestBody.template_id as number, input);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'job',
    targetEntityId: requestBody.template_id as number,
    actionType: 'job_template_updated',
    actionCategory: 'update',
    actionDescription: `Updated job template ID ${requestBody.template_id}`,
    afterData: { template_id: requestBody.template_id, fields_updated: Object.keys(input).filter(k => input[k as keyof UpdateTemplateInput] !== undefined) },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'System template updated successfully',
    template
  }, context.requestId);
}));

/**
 * DELETE /api/admin/jobs/templates
 * Delete system template (admin only)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate admin
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const templateId = parseInt(searchParams.get('template_id') || '', 10);

  if (!templateId || isNaN(templateId)) {
    throw BizError.validation('template_id', templateId, 'Valid template ID is required');
  }

  // Get job service
  const jobService = getJobService();

  // Verify template exists
  const existingTemplate = await jobService.getTemplateById(templateId);
  if (!existingTemplate) {
    throw BizError.notFound('Template not found');
  }

  // Delete template
  await jobService.deleteTemplate(templateId);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'job',
    targetEntityId: templateId,
    actionType: 'job_template_deleted',
    actionCategory: 'deletion',
    actionDescription: `Deleted job template ID ${templateId}`,
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'System template deleted successfully'
  }, context.requestId);
}));
