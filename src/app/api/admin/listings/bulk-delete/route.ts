/**
 * Admin Listings Bulk Delete API Route
 * POST /api/admin/listings/bulk-delete - Bulk delete listings
 *
 * GOVERNANCE COMPLIANCE:
 * - Authentication: Admin-only
 * - Response format: JSON with success/error
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 0 - Admin Realignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { ErrorService } from '@core/services/ErrorService';

/**
 * POST /api/admin/listings/bulk-delete
 * Bulk delete listings
 */
export async function POST(request: NextRequest) {
  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: 'Authentication required' } },
      { status: 401 }
    );
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { message: 'Admin access required' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { listingIds } = body;

  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    return NextResponse.json(
      { success: false, error: { message: 'listingIds array is required' } },
      { status: 400 }
    );
  }

  try {
    const db = getDatabaseService();

    // Admin bulk delete - direct database operation (bypasses ownership check)
    const placeholders = listingIds.map(() => '?').join(',');

    // Delete listings directly
    const result = await db.query(
      `DELETE FROM listings WHERE id IN (${placeholders})`,
      listingIds
    );

    const deleted = result.rowCount || 0;

    // Log admin activity (non-blocking)
    getAdminActivityService().logBatchDeletion({
      adminUserId: user.id,
      targetEntityType: 'listing',
      actionDescription: `Bulk deleted ${deleted} listings`,
      beforeData: { items: listingIds.map((id: number) => ({ id })), total_requested: listingIds.length },
      afterData: { deleted, failed: [] },
      severity: deleted > 10 ? 'high' : 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        message: `${deleted} listings deleted successfully`,
        deleted
      }
    });
  } catch (error) {
    ErrorService.capture('Error bulk deleting listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to bulk delete listings' }
      },
      { status: 500 }
    );
  }
}
