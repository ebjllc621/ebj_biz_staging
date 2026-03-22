/**
 * Health Monitoring API Endpoint
 *
 * @phase 5 - Governance Integration & Health Monitoring
 * @authority admin-build-map-v2.1.mdc, service-architecture-standards.mdc
 * @compliance Phase 5 health monitoring requirements
 * @pattern Next.js 14 App Router with AuthServiceRegistry singleton
 *
 * GET /api/admin/governance/health
 * Returns enhanced health status for authentication system with performance metrics
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@/core/api/apiHandler';
import AuthServiceRegistry, { type EnhancedHealthStatus } from '@/core/registry/AuthServiceRegistry';

/**
 * GET /api/admin/governance/health
 * Returns enhanced health status for authentication system
 *
 * @requires Admin authentication
 * @returns EnhancedHealthStatus with performance metrics
 */
async function healthHandler(context: ApiContext) {
  const startTime = Date.now();

  try {
    // Get enhanced health status from registry
    const health = AuthServiceRegistry.getEnhancedHealthStatus();

    const responseTime = Date.now() - startTime;

    // Record this request for performance tracking
    AuthServiceRegistry.recordRequest(responseTime);

    return createSuccessResponse({ health }, context.requestId);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    AuthServiceRegistry.recordRequest(responseTime, true);

    throw error; // apiHandler will handle error formatting
  }
}

/**
 * Export GET handler with admin authentication
 * GOVERNANCE: Requires admin role to view health status
 * @remediation Phase R2.0.1 - API handler enforcement (RBAC added)
 */
export const GET = apiHandler(healthHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'governance_health'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});

// Method guards
import { jsonMethodNotAllowed } from '@/lib/http/json';

const ALLOWED_METHODS = ['GET'];

export async function POST() {
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
