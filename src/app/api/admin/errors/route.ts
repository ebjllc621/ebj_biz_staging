/**
 * Admin Error Logs API Routes
 * GET /api/admin/errors - Get error logs with optional filters
 * POST /api/admin/errors - Log a client-side error (ErrorBoundary reports)
 * DELETE /api/admin/errors - Delete all error logs
 *
 * @authority PHASE_6.2_BRAIN_PLAN.md - Section 3.6.3
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ErrorTrackingService, ErrorSeverity, ErrorStatus } from '@core/services/ErrorTrackingService';

async function handleGet(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const severity = searchParams.get('severity') as ErrorSeverity | undefined;
  const status = searchParams.get('status') as ErrorStatus | undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

  const db = getDatabaseService();
  const service = new ErrorTrackingService(db);

  const errors = await service.getAllErrors({
    severity,
    status,
    limit
  });

  const stats = await service.getErrorStats();

  return createSuccessResponse({ errors, stats });
}

async function handleDelete(context: ApiContext) {
  const db = getDatabaseService();
  const service = new ErrorTrackingService(db);

  const deletedCount = await service.deleteAllErrors();

  return createSuccessResponse({ deleted: deletedCount });
}

async function handlePost(context: ApiContext) {
  let body: Record<string, unknown>;
  try {
    body = await context.request.json() as Record<string, unknown>;
  } catch {
    return createErrorResponse('Invalid JSON body', 400);
  }

  const db = getDatabaseService();
  const service = new ErrorTrackingService(db);

  const logged = await service.logError({
    errorType: (body.errorType as string) || 'ClientError',
    errorMessage: (body.errorMessage as string) || 'Unknown error',
    stackTrace: (body.stackTrace as string) || undefined,
    requestUrl: typeof window !== 'undefined' ? '' : undefined,
    severity: (body.severity as ErrorSeverity) || ErrorSeverity.MEDIUM,
    metadata: body.metadata as Record<string, unknown> | undefined,
  });

  return createSuccessResponse({ logged: !!logged });
}

export const POST = apiHandler(handlePost, {
  allowedMethods: ['POST'],
  requireAuth: false,
  trackPerformance: false,
  rateLimit: {
    requests: 30,
    windowMs: 60000
  }
});

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'read',
    resource: 'errors'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});

export const DELETE = apiHandler(handleDelete, {
  allowedMethods: ['DELETE'],
  requireAuth: true,
  trackPerformance: true,
  rbac: {
    action: 'delete',
    resource: 'errors'
  },
  rateLimit: {
    requests: 10,
    windowMs: 60000
  }
});
