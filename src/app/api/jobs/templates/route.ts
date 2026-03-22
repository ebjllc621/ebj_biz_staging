/**
 * Job Templates API Route
 *
 * GET /api/jobs/templates - Get system and business templates
 * POST /api/jobs/templates - Create custom template
 * PUT /api/jobs/templates - Update template
 * DELETE /api/jobs/templates - Delete template
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Session authentication required
 * - System templates (read-only)
 * - Business custom templates (CRUD)
 * - Template usage tracking
 *
 * @see src/core/services/JobService.ts - Template management methods
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { EmploymentType, CompensationType } from '@features/jobs/types';
import type { TemplateCategory, CreateTemplateInput, UpdateTemplateInput } from '@features/jobs/types';

/**
 * GET /api/jobs/templates
 * Get system and business templates
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('business_id') ? parseInt(searchParams.get('business_id')!, 10) : null;

  // Get job service
  const jobService = getJobService();

  // Fetch system templates
  const systemTemplates = await jobService.getSystemTemplates();

  // Fetch business templates if business ID provided
  let businessTemplates: any[] = [];
  if (businessId) {
    businessTemplates = await jobService.getBusinessTemplates(businessId);
  }

  return createSuccessResponse({
    system_templates: systemTemplates,
    business_templates: businessTemplates
  }, context.requestId);
});

/**
 * POST /api/jobs/templates
 * Create custom template
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
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

  // Validate employment type if provided
  if (requestBody.employment_type) {
    const validTypes = [EmploymentType.FULL_TIME, EmploymentType.PART_TIME, EmploymentType.SEASONAL, EmploymentType.TEMPORARY, EmploymentType.CONTRACT, EmploymentType.INTERNSHIP, EmploymentType.GIG];
    if (!validTypes.includes(requestBody.employment_type as EmploymentType)) {
      throw BizError.validation('employment_type', requestBody.employment_type, 'Invalid employment type');
    }
  }

  // Validate compensation type if provided
  if (requestBody.compensation_type) {
    const validCompTypes = [CompensationType.HOURLY, CompensationType.SALARY, CompensationType.COMMISSION, CompensationType.TIPS_HOURLY, CompensationType.STIPEND, CompensationType.UNPAID, CompensationType.COMPETITIVE];
    if (!validCompTypes.includes(requestBody.compensation_type as CompensationType)) {
      throw BizError.validation('compensation_type', requestBody.compensation_type, 'Invalid compensation type');
    }
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
    business_id: requestBody.business_id as number | undefined
  };

  // Get job service
  const jobService = getJobService();

  // Create template
  const template = await jobService.createTemplate(input);

  return createSuccessResponse({
    message: 'Template created successfully',
    template
  }, context.requestId);
}));

/**
 * PUT /api/jobs/templates
 * Update template
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
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

  // Verify template exists and user has permission
  const existingTemplate = await jobService.getTemplateById(requestBody.template_id as number);
  if (!existingTemplate) {
    throw BizError.notFound('Template not found');
  }

  // Only allow updating custom business templates (not system templates)
  if (existingTemplate.is_system_template) {
    throw BizError.forbidden('Cannot modify system templates');
  }

  // Verify user owns the business this template belongs to
  if (existingTemplate.business_id && user.account_type !== 'admin') {
    // TODO: Add business ownership check when listing ownership service is available
    // For now, only allow admin to update
    throw BizError.forbidden('You do not have permission to update this template');
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

  return createSuccessResponse({
    message: 'Template updated successfully',
    template
  }, context.requestId);
}));

/**
 * DELETE /api/jobs/templates
 * Delete template
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const templateId = parseInt(searchParams.get('template_id') || '', 10);

  if (!templateId || isNaN(templateId)) {
    throw BizError.validation('template_id', templateId, 'Valid template ID is required');
  }

  // Get job service
  const jobService = getJobService();

  // Verify template exists and user has permission
  const existingTemplate = await jobService.getTemplateById(templateId);
  if (!existingTemplate) {
    throw BizError.notFound('Template not found');
  }

  // Only allow deleting custom business templates (not system templates)
  if (existingTemplate.is_system_template) {
    throw BizError.forbidden('Cannot delete system templates');
  }

  // Verify user owns the business this template belongs to
  if (existingTemplate.business_id && user.account_type !== 'admin') {
    // TODO: Add business ownership check when listing ownership service is available
    // For now, only allow admin to delete
    throw BizError.forbidden('You do not have permission to delete this template');
  }

  // Delete template
  await jobService.deleteTemplate(templateId);

  return createSuccessResponse({
    message: 'Template deleted successfully'
  }, context.requestId);
}));
