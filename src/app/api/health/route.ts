/**
 * Health Check Endpoint - System Health Status
 *
 * @exception API_ROUTE_COMPLIANCE - System probe endpoint
 * @reason Health checks must respond < 50ms, apiHandler overhead unacceptable
 * @approved E2.4 remediation phase - 2025-12-19
 * @governance Direct NextResponse permitted for probe endpoints only
 *
 * GOVERNANCE COMPLIANCE:
 * - Public endpoint (no authentication)
 * - Returns system health metrics
 * - Used by load balancers and monitoring
 *
 * @authority PHASE_6.4_BRAIN_PLAN.md - Section 3.5.1
 * @phase Phase 6.4 - Production Deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }> = {};

  // Check 1: Database connectivity
  try {
    const dbStart = Date.now();
    const db = getDatabaseService();
    await db.query('SELECT 1');
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed'
    };
  }

  // Check 2: Environment configuration
  checks.environment = {
    status: process.env.NODE_ENV ? 'healthy' : 'unhealthy',
    message: process.env.NODE_ENV || 'NODE_ENV not set'
  };

  // Check 3: Required environment variables
  const requiredVars = ['DB_HOST', 'DB_NAME', 'SESSION_SECRET'];
  const missingVars = requiredVars.filter(key => !process.env[key]);
  checks.configuration = {
    status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
    message: missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : 'All required variables set'
  };

  // Overall health status
  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  const status = allHealthy ? 'healthy' : 'unhealthy';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      responseTime: Date.now() - startTime
    },
    { status: allHealthy ? 200 : 503 }
  );
}
