/**
 * Admin Listings Bulk Moderation API Route
 * POST /api/admin/listings/bulk-moderate - Bulk approve or reject listings
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
 * POST /api/admin/listings/bulk-moderate
 * Bulk moderate listings (approve/reject)
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
  const { listingIds, action } = body;

  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    return NextResponse.json(
      { success: false, error: { message: 'listingIds array is required' } },
      { status: 400 }
    );
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { success: false, error: { message: 'Action must be "approve" or "reject"' } },
      { status: 400 }
    );
  }

  try {
    const db = getDatabaseService();

    // Map action to approved status
    const approvedStatus = action === 'approve' ? 'approved' : 'rejected';

    // Build placeholders for IN clause
    const placeholders = listingIds.map(() => '?').join(',');

    // Get unique listing owners before updating (for role upgrade)
    let usersUpgraded = 0;
    if (action === 'approve') {
      // Get all unique user_ids from affected listings
      const ownersResult = await db.query<{ user_id: number }>(
        `SELECT DISTINCT user_id FROM listings WHERE id IN (${placeholders}) AND user_id IS NOT NULL`,
        [...listingIds]
      );

      const ownerIds = ownersResult.rows?.map(r => r.user_id) || [];

      if (ownerIds.length > 0) {
        // Upgrade any general users to listing_member
        // Pattern from ClaimListingService.ts:705-709
        const ownerPlaceholders = ownerIds.map(() => '?').join(',');
        const upgradeResult = await db.query(
          `UPDATE users SET role = 'listing_member', updated_at = NOW()
           WHERE id IN (${ownerPlaceholders}) AND role = 'general'`,
          [...ownerIds]
        );
        usersUpgraded = (upgradeResult as { affectedRows?: number }).affectedRows || 0;
      }
    }

    // Bulk update listings
    await db.query(
      `UPDATE listings
       SET approved = ?,
           updated_at = NOW()
       WHERE id IN (${placeholders})`,
      [approvedStatus, ...listingIds]
    );

    // Log admin activity (non-blocking)
    getAdminActivityService().logModeration({
      adminUserId: user.id,
      targetEntityType: 'listing',
      targetEntityId: 0,
      actionType: action === 'approve' ? 'bulk_listing_approved' : 'bulk_listing_rejected',
      actionDescription: `Bulk ${action}d ${listingIds.length} listings${usersUpgraded > 0 ? ` (${usersUpgraded} users upgraded)` : ''}`,
      beforeData: { listingIds, count: listingIds.length },
      afterData: { action: approvedStatus, count: listingIds.length, usersUpgraded },
      severity: listingIds.length > 10 ? 'high' : 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        message: `${listingIds.length} listings ${action}d successfully${usersUpgraded > 0 ? ` (${usersUpgraded} users upgraded to listing_member)` : ''}`,
        count: listingIds.length,
        usersUpgraded
      }
    });
  } catch (error) {
    ErrorService.capture('Error bulk moderating listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to bulk moderate listings' }
      },
      { status: 500 }
    );
  }
}
