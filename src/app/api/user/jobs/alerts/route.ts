/**
 * User Job Alerts API Route
 *
 * GET /api/user/jobs/alerts - Get user's alert subscriptions
 * POST /api/user/jobs/alerts - Create new alert subscription
 * PUT /api/user/jobs/alerts - Update alert subscription
 * DELETE /api/user/jobs/alerts - Delete alert subscription
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Session authentication required
 * - Full CRUD operations for job alerts
 * - Alert type validation
 * - Frequency management
 *
 * @see src/core/services/JobService.ts - Alert management methods
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { AlertType, AlertFrequency, CreateAlertInput, UpdateAlertInput } from '@features/jobs/types';

/**
 * GET /api/user/jobs/alerts
 * Get all alert subscriptions for authenticated user
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Get job service
  const jobService = getJobService();

  // Fetch user alerts
  const alerts = await jobService.getUserAlerts(user.id);

  return createSuccessResponse({
    alerts
  }, context.requestId);
});

/**
 * POST /api/user/jobs/alerts
 * Create new alert subscription
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
  if (!requestBody.alert_type || typeof requestBody.alert_type !== 'string') {
    throw BizError.validation('alert_type', requestBody.alert_type, 'Alert type is required');
  }

  const validAlertTypes: AlertType[] = ['business', 'category', 'employment_type', 'keyword', 'all_jobs'];
  if (!validAlertTypes.includes(requestBody.alert_type as AlertType)) {
    throw BizError.validation('alert_type', requestBody.alert_type, 'Invalid alert type');
  }

  // Validate target_id for business/category alerts
  if (['business', 'category'].includes(requestBody.alert_type as string) && !requestBody.target_id) {
    throw BizError.validation('target_id', requestBody.target_id, 'Target ID required for business/category alerts');
  }

  // Validate notification frequency if provided
  if (requestBody.notification_frequency) {
    const validFrequencies: AlertFrequency[] = ['realtime', 'daily', 'weekly'];
    if (!validFrequencies.includes(requestBody.notification_frequency as AlertFrequency)) {
      throw BizError.validation('notification_frequency', requestBody.notification_frequency, 'Invalid notification frequency');
    }
  }

  // Build input
  const input: CreateAlertInput = {
    alert_type: requestBody.alert_type as AlertType,
    target_id: requestBody.target_id as number | undefined,
    keyword_filter: requestBody.keyword_filter as string | undefined,
    employment_type_filter: requestBody.employment_type_filter as any[] | undefined,
    location_filter: requestBody.location_filter as any | undefined,
    compensation_min: requestBody.compensation_min as number | undefined,
    compensation_max: requestBody.compensation_max as number | undefined,
    notification_frequency: requestBody.notification_frequency as AlertFrequency | undefined
  };

  // Get job service
  const jobService = getJobService();

  // Create alert
  const alert = await jobService.createAlert(user.id, input);

  return createSuccessResponse({
    message: 'Alert subscription created successfully',
    alert
  }, context.requestId);
}));

/**
 * PUT /api/user/jobs/alerts
 * Update alert subscription
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
  if (!requestBody.alert_id || typeof requestBody.alert_id !== 'number') {
    throw BizError.validation('alert_id', requestBody.alert_id, 'Alert ID is required');
  }

  // Get job service
  const jobService = getJobService();

  // Verify alert ownership
  const existingAlert = await jobService.getAlertById(requestBody.alert_id as number);
  if (!existingAlert) {
    throw BizError.notFound('Alert not found');
  }

  if (existingAlert.user_id !== user.id) {
    throw BizError.forbidden('You do not have permission to update this alert');
  }

  // Build input
  const input: UpdateAlertInput = {
    keyword_filter: requestBody.keyword_filter as string | undefined,
    employment_type_filter: requestBody.employment_type_filter as any[] | undefined,
    location_filter: requestBody.location_filter as any | undefined,
    compensation_min: requestBody.compensation_min as number | undefined,
    compensation_max: requestBody.compensation_max as number | undefined,
    notification_frequency: requestBody.notification_frequency as AlertFrequency | undefined,
    is_active: requestBody.is_active as boolean | undefined
  };

  // Update alert
  const alert = await jobService.updateAlert(requestBody.alert_id as number, input);

  return createSuccessResponse({
    message: 'Alert subscription updated successfully',
    alert
  }, context.requestId);
}));

/**
 * DELETE /api/user/jobs/alerts
 * Delete alert subscription
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
  const alertId = parseInt(searchParams.get('alert_id') || '', 10);

  if (!alertId || isNaN(alertId)) {
    throw BizError.validation('alert_id', alertId, 'Valid alert ID is required');
  }

  // Get job service
  const jobService = getJobService();

  // Verify alert ownership
  const existingAlert = await jobService.getAlertById(alertId);
  if (!existingAlert) {
    throw BizError.notFound('Alert not found');
  }

  if (existingAlert.user_id !== user.id) {
    throw BizError.forbidden('You do not have permission to delete this alert');
  }

  // Delete alert
  await jobService.deleteAlert(alertId);

  return createSuccessResponse({
    message: 'Alert subscription deleted successfully'
  }, context.requestId);
}));
