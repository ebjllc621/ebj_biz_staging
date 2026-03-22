/**
 * Admin Health Alerts Config Endpoint
 *
 * GET /api/admin/health-alerts/config
 * Returns current health alert configuration
 *
 * PUT /api/admin/health-alerts/config
 * Updates health alert configuration
 *
 * @phase Phase 3 - Service Health Monitoring Enhancement
 * @authority SERVICE_HEALTH_MONITORING_MASTER_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getHealthAlertService } from '@core/services/ServiceRegistry';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { BizError } from '@core/errors/BizError';
import type { HealthAlertConfigUpdate } from '@core/services/HealthAlertService';

/**
 * GET /api/admin/health-alerts/config
 * Returns current health alert configuration
 */
async function getConfigHandler(context: ApiContext) {
  const healthAlertService = getHealthAlertService();
  const config = await healthAlertService.getConfig();

  if (!config) {
    return createErrorResponse(
      new BizError({
        code: 'CONFIG_NOT_FOUND',
        message: 'Health alert configuration not initialized',
        userMessage: 'Health alert configuration not found. Please run migrations.'
      }),
      context.requestId
    );
  }

  return createSuccessResponse({ ...config }, context.requestId);
}

/**
 * PUT /api/admin/health-alerts/config
 * Updates health alert configuration
 */
async function updateConfigHandler(context: ApiContext) {
  const healthAlertService = getHealthAlertService();
  const userId = context.userId ? parseInt(context.userId) : undefined;

  let body: HealthAlertConfigUpdate = {};

  try {
    body = await context.request.json();
  } catch {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_BODY',
        message: 'Request body required',
        userMessage: 'Request body required'
      }),
      context.requestId
    );
  }

  // Validate at least one field is provided
  const hasUpdates = Object.keys(body).some(key =>
    ['enabled', 'adminEmail', 'throttleMinutes', 'alertOnUnhealthy', 'alertOnRecovered', 'alertOnDegraded'].includes(key)
  );

  if (!hasUpdates) {
    return createErrorResponse(
      new BizError({
        code: 'NO_UPDATES',
        message: 'No valid fields to update',
        userMessage: 'Please provide at least one field to update'
      }),
      context.requestId
    );
  }

  try {
    const updated = await healthAlertService.updateConfig(body, userId);

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: userId || parseInt(context.userId!),
      targetEntityType: 'health_alert_config',
      targetEntityId: null,
      actionType: 'health_alert_config_updated',
      actionCategory: 'configuration',
      actionDescription: `Updated health alert config: ${Object.keys(body).join(', ')}`,
      afterData: { ...body },
      severity: 'normal'
    });

    return createSuccessResponse({ ...updated }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}

export const GET = apiHandler(getConfigHandler, {
  allowedMethods: ['GET', 'PUT'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'health_alerts'
  },
  rateLimit: {
    requests: 30,
    windowMs: 60000
  }
});

export const PUT = apiHandler(updateConfigHandler, {
  allowedMethods: ['GET', 'PUT'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'health_alerts'
  },
  rateLimit: {
    requests: 10,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET', 'PUT'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
