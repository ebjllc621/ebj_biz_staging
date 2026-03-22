/**
 * apiHandler - Next.js API Route Wrapper
 *
 * Standardized wrapper for Next.js API routes providing:
 * - Error handling and transformation
 * - Request/response logging
 * - Authentication integration
 * - CORS handling
 * - Rate limiting hooks
 * - Response formatting
 *
 * Build Map v2.1 ENHANCED compliance: API standardization
 */

import { NextRequest, NextResponse } from 'next/server';
import { BizError } from '@core/errors/BizError';
import { logger, LogContext, Logger } from '@core/logging/Logger';
import { RbacService, type RbacAction, type RbacResource, type RbacPrincipal } from '@core/services/rbac';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PerformanceMonitoringService } from '@core/services/PerformanceMonitoringService';
import { AlertingService, AlertType, AlertSeverity } from '@core/services/AlertingService';

const rbacService = new RbacService();

export interface ApiHandlerConfig {
  requireAuth?: boolean;
  allowedMethods?: string[];
  corsOrigins?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  timeout?: number;
  // RBAC authorization (optional, backward compatible)
  rbac?: {
    action: RbacAction;
    resource: RbacResource;
  };
  // Performance tracking - records API response times to performance_metrics table
  trackPerformance?: boolean;
}

export interface ApiContext {
  request: NextRequest;
  requestId: string;
  userId?: string;
  metadata: Record<string, unknown>;
  // RBAC principal (optional, backward compatible)
  principal?: RbacPrincipal;
  // Request-specific logger
  logger: Logger;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

export type ApiHandler<T = unknown> = (
  context: ApiContext
) => Promise<ApiResponse<T> | Response | NextResponse>;

/**
 * Create standardized API handler wrapper
 */
export function apiHandler<T = unknown>(
  handler: ApiHandler<T>,
  config: ApiHandlerConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Create logging context
    const logContext: LogContext = {
      service: 'ApiHandler',
      operation: 'handleRequest',
      requestId,
      metadata: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent')
      }
    };

    const requestLogger = logger.child(logContext);

    try {
      requestLogger.info('API request started');

      // Method validation
      if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
        throw new BizError({
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${request.method} not allowed`,
          context: { allowedMethods: config.allowedMethods }
        });
      }

      // CORS handling
      const corsHeaders = handleCors(request, config.corsOrigins);

      // Authentication - ALWAYS attempt, only require if config says so
      let userId: string | undefined;
      let principal: RbacPrincipal | undefined;

      // Always try to authenticate (enables optional-auth routes to detect logged-in users)
      const authResult = await authenticateRequest(request);
      userId = authResult ?? undefined;

      // Only throw if auth is required and failed
      if (config.requireAuth && !userId) {
        throw BizError.accessDenied('Access token required');
      }

      // Create RBAC principal if we have a user (regardless of requireAuth)
      if (userId) {
        const sessionData = await getSessionData(request);
        if (sessionData?.role && (sessionData.role === 'general' || sessionData.role === 'listing_member' || sessionData.role === 'admin')) {
          principal = {
            role: sessionData.role,
            userId: userId,
            isVerified: sessionData.isVerified
          };
        }
      }

      // RBAC authorization check (optional, backward compatible)
      if (config.rbac && principal) {
        const { action } = config.rbac;
        const allowed = rbacService.can(principal.role, action);

        if (!allowed) {
          requestLogger.warn('RBAC authorization denied', {
            metadata: {
              userId: principal.userId,
              role: principal.role,
              action
            }
          });

          throw BizError.accessDenied(`Access denied: insufficient permissions`);
        }

        requestLogger.debug('RBAC authorization granted', {
          metadata: {
            userId: principal.userId,
            role: principal.role,
            action
          }
        });
      }

      // Rate limiting (stub)
      if (config.rateLimit) {
        await checkRateLimit(request, config.rateLimit, requestId);
      }

      // Create API context
      const context: ApiContext = {
        request,
        requestId,
        userId,
        principal,
        metadata: {
          startTime,
          method: request.method,
          url: request.url
        },
        logger: requestLogger
      };

      // Execute handler with timeout
      const timeoutMs = config.timeout || 30000;
      const result = await executeWithTimeout(
        () => handler(context),
        timeoutMs
      );

      const duration = Date.now() - startTime;

      // Extract endpoint for tracking
      const url = new URL(request.url);
      const endpoint = `${request.method} ${url.pathname}`;

      // If handler returned NextResponse directly, return it
      if (result instanceof NextResponse) {
        requestLogger.info('API request completed (NextResponse)', {
          metadata: {
            durationMs: duration,
            status: result.status
          }
        });
        // Track performance if enabled (fire-and-forget)
        if (config.trackPerformance) {
          trackApiPerformance(endpoint, duration, result.status, userId);
        }
        return result;
      }

      // If handler returned Response, convert to NextResponse
      if (result instanceof Response) {
        requestLogger.info('API request completed (Response)', {
          metadata: {
            durationMs: duration,
            status: result.status
          }
        });
        // Track performance if enabled (fire-and-forget)
        if (config.trackPerformance) {
          trackApiPerformance(endpoint, duration, result.status, userId);
        }
        const body = await result.text();
        return new NextResponse(body, {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers
        });
      }

      // Handler returned ApiResponse
      requestLogger.info('API request completed', {
        metadata: {
          success: result.success,
          durationMs: duration,
          hasData: !!result.data
        }
      });

      // Track performance if enabled (fire-and-forget)
      if (config.trackPerformance) {
        trackApiPerformance(endpoint, duration, 200, userId);
      }

      // Create successful response
      const response = createSuccessResponse(result, requestId);
      return NextResponse.json(response, {
        status: 200,
        headers: corsHeaders
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle and log error
      const bizError = error instanceof BizError
        ? error
        : new BizError({
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            cause: error instanceof Error ? error : undefined
          });

      // Create error response
      const response = createErrorResponse(bizError, requestId);
      const status = getErrorStatus(bizError);

      // Log auth failures (401/403) at warn level — these are expected for
      // unauthenticated visitors hitting protected routes (e.g. open tabs after restart).
      if (status === 401 || status === 403) {
        requestLogger.warn('API request denied (not authenticated)', {
          metadata: { durationMs: duration, status }
        });
      } else {
        requestLogger.error('API request failed', bizError, {
          metadata: { durationMs: duration }
        });
      }

      // Track performance if enabled (fire-and-forget) - including errors
      if (config.trackPerformance) {
        const url = new URL(request.url);
        const endpoint = `${request.method} ${url.pathname}`;
        trackApiPerformance(endpoint, duration, status, undefined);
      }

      return NextResponse.json(response, {
        status,
        headers: handleCors(request, config.corsOrigins)
      });
    }
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  result: ApiResponse<T> | T,
  requestId: string
): ApiResponse<T> {
  // If already formatted as ApiResponse, enhance with meta
  if (typeof result === 'object' && result !== null && 'success' in result) {
    return {
      ...result as ApiResponse<T>,
      meta: {
        requestId,
        timestamp: new Date(),
        version: '5.0.0'
      }
    };
  }

  // Format raw data as ApiResponse
  return {
    success: true,
    data: result as T,
    meta: {
      requestId,
      timestamp: new Date(),
      version: '5.0.0'
    }
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: BizError,
  requestId: string
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.userMessage || error.message,
      details: error.context
    },
    meta: {
      requestId,
      timestamp: new Date(),
      version: '5.0.0'
    }
  };
}

/**
 * Handle CORS headers
 */
function handleCors(
  request: NextRequest,
  allowedOrigins?: string[]
): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  if (allowedOrigins && origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (!allowedOrigins) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

/**
 * Authenticate request using real session validation
 */
async function authenticateRequest(request: NextRequest): Promise<string | null> {
  const user = await getUserFromRequest(request);

  if (!user) {
    logger.debug('Authentication check: No valid session', {
      metadata: {
        hasCookie: !!request.cookies.get('bk_session')
      }
    });
    return null;
  }

  logger.debug('Authentication check: Valid session', {
    metadata: {
      userId: user.id,
      role: user.role
    }
  });

  return String(user.id);
}

/**
 * Get session data for RBAC using real session validation
 */
async function getSessionData(request: NextRequest): Promise<{ role: string; isVerified: boolean } | null> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return null;
  }

  return {
    role: user.role,
    isVerified: user.isVerified
  };
}

/**
 * Check rate limit (stub implementation)
 */
async function checkRateLimit(
  request: NextRequest,
  rateLimit: { requests: number; windowMs: number },
  requestId: string
): Promise<void> {
  // STUB: Real implementation would check Redis/memory store
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

  logger.debug('Rate limit check (STUB)', {
    metadata: {
      clientIp,
      limit: rateLimit.requests,
      windowMs: rateLimit.windowMs,
      requestId
    }
  });

  // STUB: Always allow for now
}

/**
 * Execute operation with timeout
 */
async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new BizError({
        code: 'REQUEST_TIMEOUT',
        message: `Request timed out after ${timeoutMs}ms`
      })), timeoutMs)
    )
  ]);
}

/**
 * Map BizError to HTTP status code
 */
function getErrorStatus(error: BizError): number {
  const statusMap: Record<string, number> = {
    'VALIDATION_ERROR': 400,
    'BAD_REQUEST': 400,
    'UNAUTHORIZED': 401,
    'ACCESS_DENIED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'CONNECTION_NOT_FOUND': 404,
    'CONNECTION_REQUEST_NOT_FOUND': 404,
    'METHOD_NOT_ALLOWED': 405,
    'CONFLICT': 409,
    'DUPLICATE_CONNECTION': 409,
    'REQUEST_TIMEOUT': 408,
    'RATE_LIMIT_EXCEEDED': 429,
    'CONNECTION_ERROR': 400,
    'UNAUTHORIZED_CONNECTION': 403,
    'ACCOUNT_SUSPENDED': 403,
    'ACCOUNT_DELETED': 410,
    'INTERNAL_ERROR': 500,
    'DATABASE_ERROR': 500,
    'SERVICE_UNAVAILABLE': 503
  };

  return statusMap[error.code] || 500;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to create RBAC-enabled API handler
 *
 * @param handler - API handler function
 * @param action - RBAC action required
 * @param resource - RBAC resource being accessed
 * @param config - Additional API handler configuration
 * @returns Configured API handler with RBAC
 */
export function rbacApiHandler<T = unknown>(
  handler: ApiHandler<T>,
  action: RbacAction,
  resource: RbacResource,
  config: Omit<ApiHandlerConfig, 'rbac'> = {}
) {
  return apiHandler(handler, {
    ...config,
    requireAuth: true, // RBAC requires authentication
    rbac: { action, resource }
  });
}

// Performance alert thresholds (in milliseconds)
const PERF_THRESHOLDS = {
  WARNING: 1000,   // Alert warning at 1 second
  CRITICAL: 2000   // Alert critical at 2 seconds
};

/**
 * Track API response time (fire-and-forget)
 * Records performance metrics to the database for the admin performance dashboard
 * Also generates alerts when thresholds are exceeded
 */
function trackApiPerformance(
  endpoint: string,
  duration: number,
  statusCode: number,
  userId?: string
): void {
  // Fire-and-forget: Don't await, don't block the response
  try {
    const db = getDatabaseService();
    const perfService = new PerformanceMonitoringService(db);

    // Track the performance metric
    perfService.trackApiResponse({
      endpoint,
      duration,
      statusCode,
      userId: userId ? parseInt(userId, 10) : undefined
    }).catch(() => {
      // Silently ignore tracking errors - circuit breaker pattern
    });

    // Generate alerts for threshold violations (fire-and-forget)
    if (duration >= PERF_THRESHOLDS.CRITICAL || statusCode >= 500) {
      const alertService = new AlertingService(db);
      alertService.createAlert({
        alertType: AlertType.RESPONSE_TIME,
        alertName: `api.response_time.${statusCode >= 500 ? 'error' : 'slow'}`,
        thresholdValue: statusCode >= 500 ? 500 : PERF_THRESHOLDS.CRITICAL,
        currentValue: statusCode >= 500 ? statusCode : duration,
        severity: AlertSeverity.CRITICAL,
        message: statusCode >= 500
          ? `API error: ${endpoint} returned ${statusCode}`
          : `API response time critical: ${endpoint} took ${duration.toFixed(0)}ms (threshold: ${PERF_THRESHOLDS.CRITICAL}ms)`,
        metadata: { endpoint, duration, statusCode }
      }).catch(() => {
        // Silently ignore alert errors
      });
    } else if (duration >= PERF_THRESHOLDS.WARNING) {
      const alertService = new AlertingService(db);
      alertService.createAlert({
        alertType: AlertType.RESPONSE_TIME,
        alertName: 'api.response_time.warning',
        thresholdValue: PERF_THRESHOLDS.WARNING,
        currentValue: duration,
        severity: AlertSeverity.WARNING,
        message: `API response time warning: ${endpoint} took ${duration.toFixed(0)}ms (threshold: ${PERF_THRESHOLDS.WARNING}ms)`,
        metadata: { endpoint, duration, statusCode }
      }).catch(() => {
        // Silently ignore alert errors
      });
    }
  } catch {
    // Silently ignore initialization errors
  }
}

/**
 * Re-export RBAC types for convenience
 */
export type { RbacAction, RbacResource, RbacPrincipal } from '@core/services/rbac';
