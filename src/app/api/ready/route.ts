/**
 * Readiness Check Endpoint - Application Ready Status
 *
 * @exception API_ROUTE_COMPLIANCE - System probe endpoint
 * @reason Readiness checks must respond < 50ms, apiHandler overhead unacceptable
 * @approved E2.4 remediation phase - 2025-12-19
 * @governance Direct NextResponse permitted for probe endpoints only
 *
 * Used by Kubernetes/Docker to determine if app is ready to receive traffic.
 *
 * GOVERNANCE COMPLIANCE:
 * - Public endpoint (no authentication)
 * - DatabaseService boundary
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority PHASE_6.4_BRAIN_PLAN.md - Section 3.5.2
 * @phase Phase 6.4 - Production Deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

export async function GET(req: NextRequest) {
  try {
    // Check database connection
    const db = getDatabaseService();
    await db.query('SELECT 1');

    // Check critical tables exist
    const result = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'listings', 'categories')
    `, [process.env.DB_NAME]);

    const row = result.rows[0] as { count: number };
    const criticalTablesExist = row.count === 3;

    if (!criticalTablesExist) {
      throw new Error('Critical tables missing');
    }

    return NextResponse.json(
      {
        ready: true,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
