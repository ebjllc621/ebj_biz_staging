/**
 * Admin Health Alerts Test Endpoint
 *
 * POST /api/admin/health-alerts/test
 * Sends a test health alert email to verify configuration and delivery.
 *
 * @phase Phase 6.1 - Health Alert Admin UI Enhancement
 * @authority HEALTH_ALERT_ADMIN_UI_MASTER_BRAIN_PLAN.md
 * @tier SIMPLE
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getHealthAlertService } from '@core/services/ServiceRegistry';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { AlertType, AlertLevel } from '@core/services/HealthAlertService';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface TestAlertRequestBody {
  /** Alert type to simulate: unhealthy, degraded, or recovered */
  alertType: AlertType;
  /** Optional custom service name (default: 'test-service') */
  serviceName?: string;
  /** Optional custom error message */
  errorMessage?: string;
}

// ============================================================================
// Request Validation
// ============================================================================

const VALID_ALERT_TYPES: AlertType[] = ['unhealthy', 'degraded', 'recovered'];

function validateRequestBody(body: unknown): TestAlertRequestBody {
  if (!body || typeof body !== 'object') {
    throw new BizError({
      code: 'INVALID_BODY',
      message: 'Request body required',
      userMessage: 'Please provide alert type'
    });
  }

  const { alertType, serviceName, errorMessage } = body as Record<string, unknown>;

  if (!alertType || !VALID_ALERT_TYPES.includes(alertType as AlertType)) {
    throw new BizError({
      code: 'INVALID_ALERT_TYPE',
      message: `alertType must be one of: ${VALID_ALERT_TYPES.join(', ')}`,
      userMessage: 'Please select a valid alert type'
    });
  }

  return {
    alertType: alertType as AlertType,
    serviceName: typeof serviceName === 'string' ? serviceName : undefined,
    errorMessage: typeof errorMessage === 'string' ? errorMessage : undefined
  };
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/admin/health-alerts/test
 * Sends a test health alert email
 */
async function sendTestAlertHandler(context: ApiContext) {
  let body: TestAlertRequestBody;

  try {
    const rawBody = await context.request.json();
    body = validateRequestBody(rawBody);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    return createErrorResponse(
      new BizError({
        code: 'INVALID_BODY',
        message: 'Failed to parse request body',
        userMessage: 'Invalid request format'
      }),
      context.requestId
    );
  }

  const healthAlertService = getHealthAlertService();

  // Determine alert level based on type
  const alertLevel: AlertLevel = body.alertType === 'unhealthy' ? 'critical' : 'warning';

  // Build the test alert input
  const testInput = {
    serviceName: body.serviceName || 'test-service',
    alertType: body.alertType,
    alertLevel,
    errorMessage: body.errorMessage || `Test ${body.alertType} alert triggered by administrator`,
    errorComponent: 'Admin Test'
  };

  // Send the test alert
  const result = await healthAlertService.sendTestAlert(testInput);

  if (!result.success) {
    return createErrorResponse(
      new BizError({
        code: 'TEST_ALERT_FAILED',
        message: result.error || 'Failed to send test alert',
        userMessage: result.error || 'Failed to send test email'
      }),
      context.requestId
    );
  }

  return createSuccessResponse({
    message: 'Test alert email sent successfully',
    logId: result.logId,
    recipientEmail: result.recipientEmail,
    alertType: body.alertType,
    serviceName: testInput.serviceName
  }, context.requestId);
}

// ============================================================================
// Route Exports
// ============================================================================

// @governance MANDATORY - CSRF protection for POST requests
// Source: osi-production-compliance.mdc, Layer 7 Security
export const POST = withCsrf(apiHandler(sendTestAlertHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'health_alerts'
  },
  rateLimit: {
    requests: 5,  // Limit test emails to prevent spam
    windowMs: 60000
  }
}));

// Method guards
const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
