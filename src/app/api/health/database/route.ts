/**
 * Database Health Probe Endpoint
 *
 * @exception API_ROUTE_COMPLIANCE - System probe endpoint
 * @reason Health checks must respond < 50ms, apiHandler overhead unacceptable
 * @approved Phase 4 - Database Health Monitoring
 * @governance Direct NextResponse permitted for probe endpoints only
 *
 * PUBLIC ENDPOINT:
 * - No authentication required
 * - Used by load balancers and monitoring systems
 * - Optimized for speed (< 50ms target)
 *
 * @phase Phase 4 - Database Health Monitoring
 * @authority DATABASE_SCALING_MASTER_INDEX_BRAIN_PLAN.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseHealthService } from '@core/services/DatabaseHealthService';

export async function GET(req: NextRequest) {
  try {
    const healthService = getDatabaseHealthService();
    const health = await healthService.getProbeHealth();

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': `${health.responseTime}ms`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: false,
        pool: false,
        cache: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
