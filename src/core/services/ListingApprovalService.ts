/**
 * ListingApprovalService - Unified Listing Approval Operations
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Activity logging integration (non-blocking)
 *
 * WHOLE-SITE VIEW:
 * This service consolidates approval logic from:
 * - ClaimListingService.adminReviewClaim() - Claim workflow
 * - ListingService.approveListing()/rejectListing() - User-created workflow
 * - /api/admin/listings/[id]/moderate - Direct route
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 3 Brain Plan - ListingApprovalService Creation
 * @phase Listing Approval System Phase 3
 * @tier ADVANCED (multi-table operations, business logic)
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getListingService, getUserManagementService, getListingNotificationService } from '@core/services/ServiceRegistry';
import type { Listing } from '@core/services/ListingService';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for approval operation
 */
export interface ApprovalOptions {
  adminNotes?: string;
}

/**
 * Options for rejection operation
 */
export interface RejectionOptions {
  reason: string;
  adminNotes?: string;
}

/**
 * Result of approval/rejection operation
 */
export interface ApprovalResult {
  listing: Listing;
  userRoleUpdated: boolean;
  activityLogged: boolean;
  notificationSent: boolean;
}

/**
 * Input for approval operation
 */
export interface ApproveListingInput {
  listingId: number;
  adminUserId: number;
  options?: ApprovalOptions;
}

/**
 * Input for rejection operation
 */
export interface RejectListingInput {
  listingId: number;
  adminUserId: number;
  options: RejectionOptions;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class ListingNotPendingError extends BizError {
  constructor(listingId: number, currentStatus: string) {
    super({
      code: 'LISTING_NOT_PENDING',
      message: `Listing ${listingId} is not pending approval (current: ${currentStatus})`,
      context: { listingId, currentStatus },
      userMessage: 'This listing is not pending approval'
    });
  }
}

export class ApprovalFailedError extends BizError {
  constructor(listingId: number, reason: string) {
    super({
      code: 'APPROVAL_FAILED',
      message: `Failed to approve listing ${listingId}: ${reason}`,
      context: { listingId, reason },
      userMessage: 'Failed to approve listing'
    });
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class ListingApprovalService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // APPROVAL OPERATIONS
  // ==========================================================================

  /**
   * Approve a listing
   *
   * Performs the following operations:
   * 1. Validates listing exists and is pending
   * 2. Updates listing status to 'approved' with admin audit trail
   * 3. Upgrades user role from 'general' to 'listing_member' if needed
   * 4. Logs activity (non-blocking)
   *
   * @param input Approval input with listingId, adminUserId, and options
   * @returns ApprovalResult with listing and operation flags
   */
  async approve(input: ApproveListingInput): Promise<ApprovalResult> {
    const { listingId, adminUserId, options } = input;

    // 1. Get listing and validate
    const listingService = getListingService();
    const listing = await listingService.getById(listingId);

    if (!listing) {
      throw BizError.notFound('Listing not found', listingId);
    }

    if (listing.approved !== 'pending') {
      throw new ListingNotPendingError(listingId, listing.approved);
    }

    // 2. Update listing status with admin audit trail
    await this.db.query(
      `UPDATE listings
       SET approved = 'approved',
           status = 'active',
           admin_reviewer_id = ?,
           admin_notes = ?,
           admin_decision_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [adminUserId, options?.adminNotes || null, listingId]
    );

    // 3. Upgrade user role if needed
    let userRoleUpdated = false;
    if (listing.user_id) {
      const userManagementService = getUserManagementService();
      const upgradeResult = await userManagementService.upgradeUserRoleToListingMember(listing.user_id);
      userRoleUpdated = upgradeResult.upgraded;
    }

    // 4. Log activity (non-blocking)
    let activityLogged = false;
    try {
      const activityService = getActivityLoggingService();
      activityService.logActivity({
        action: 'listing.approved',
        actionType: 'account',
        description: `Admin ${adminUserId} approved listing ${listingId}`,
        userId: adminUserId,
        entityType: 'listing',
        entityId: String(listingId),
        success: true,
        metadata: {
          listingId,
          listingName: listing.name,
          userRoleUpdated,
          adminNotes: options?.adminNotes || null
        }
      }).catch(() => {});
      activityLogged = true;
    } catch {
      // Activity logging is non-blocking
    }

    // 5. Get updated listing and return
    const updatedListing = await listingService.getById(listingId);
    if (!updatedListing) {
      throw new ApprovalFailedError(listingId, 'Failed to retrieve updated listing');
    }

    // 6. Send notification (non-blocking)
    let notificationSent = false;
    if (listing.user_id) {
      getListingNotificationService()
        .sendListingApproved(
          listing.user_id,
          listingId,
          listing.name,
          updatedListing.tier
        )
        .then(result => {
          if (!result.success) {
            // ErrorService is already called in ListingNotificationService
          }
        })
        .catch(() => {});
      notificationSent = true;
    }

    return {
      listing: updatedListing,
      userRoleUpdated,
      activityLogged,
      notificationSent
    };
  }

  /**
   * Reject a listing
   *
   * Performs the following operations:
   * 1. Validates listing exists and is pending
   * 2. Updates listing status to 'rejected' with rejection reason and admin audit trail
   * 3. Logs activity (non-blocking)
   *
   * @param input Rejection input with listingId, adminUserId, and options
   * @returns ApprovalResult with listing and operation flags
   */
  async reject(input: RejectListingInput): Promise<ApprovalResult> {
    const { listingId, adminUserId, options } = input;

    // 1. Get listing and validate
    const listingService = getListingService();
    const listing = await listingService.getById(listingId);

    if (!listing) {
      throw BizError.notFound('Listing not found', listingId);
    }

    if (listing.approved !== 'pending') {
      throw new ListingNotPendingError(listingId, listing.approved);
    }

    // 2. Update listing status with rejection reason and admin audit trail
    await this.db.query(
      `UPDATE listings
       SET approved = 'rejected',
           status = 'inactive',
           rejection_reason = ?,
           admin_reviewer_id = ?,
           admin_notes = ?,
           admin_decision_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [options.reason, adminUserId, options.adminNotes || null, listingId]
    );

    // 3. Log activity (non-blocking)
    let activityLogged = false;
    try {
      const activityService = getActivityLoggingService();
      activityService.logActivity({
        action: 'listing.rejected',
        actionType: 'account',
        description: `Admin ${adminUserId} rejected listing ${listingId}: ${options.reason}`,
        userId: adminUserId,
        entityType: 'listing',
        entityId: String(listingId),
        success: true,
        metadata: {
          listingId,
          listingName: listing.name,
          rejectionReason: options.reason,
          adminNotes: options.adminNotes || null
        }
      }).catch(() => {});
      activityLogged = true;
    } catch {
      // Activity logging is non-blocking
    }

    // 4. Get updated listing and return
    const updatedListing = await listingService.getById(listingId);
    if (!updatedListing) {
      throw new ApprovalFailedError(listingId, 'Failed to retrieve updated listing');
    }

    // 5. Send notification (non-blocking)
    let notificationSent = false;
    if (listing.user_id) {
      getListingNotificationService()
        .sendListingRejected(
          listing.user_id,
          listingId,
          listing.name,
          options.reason
        )
        .then(result => {
          if (!result.success) {
            // ErrorService is already called in ListingNotificationService
          }
        })
        .catch(() => {});
      notificationSent = true;
    }

    return {
      listing: updatedListing,
      userRoleUpdated: false, // Rejection never upgrades user role
      activityLogged,
      notificationSent
    };
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Get pending listings for admin review
   *
   * @param page Page number (1-indexed)
   * @param limit Items per page
   * @returns Paginated list of pending listings
   */
  async getPendingListings(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: Listing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const listingService = getListingService();

    // Use ListingService's getAll method with filter
    return listingService.getAll(
      { approved: 'pending' },
      { page, limit }
    );
  }

  /**
   * Get approval statistics for admin dashboard
   */
  async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    todayDecisions: number;
  }> {
    const results = await Promise.all([
      this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM listings WHERE approved = 'pending'`
      ),
      this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM listings WHERE approved = 'approved'`
      ),
      this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM listings WHERE approved = 'rejected'`
      ),
      this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM listings WHERE admin_decision_at >= CURDATE()`
      )
    ]);

    return {
      pending: Number(results[0].rows?.[0]?.count || 0),
      approved: Number(results[1].rows?.[0]?.count || 0),
      rejected: Number(results[2].rows?.[0]?.count || 0),
      todayDecisions: Number(results[3].rows?.[0]?.count || 0)
    };
  }

  // ==========================================================================
  // HELPER OPERATIONS
  // ==========================================================================

  /**
   * Check if a listing can be approved
   * @param listingId Listing ID
   * @returns Whether listing can be approved and reason if not
   */
  async canApprove(listingId: number): Promise<{ canApprove: boolean; reason?: string }> {
    const listingService = getListingService();
    const listing = await listingService.getById(listingId);

    if (!listing) {
      return { canApprove: false, reason: 'Listing not found' };
    }

    if (listing.approved !== 'pending') {
      return { canApprove: false, reason: `Listing is already ${listing.approved}` };
    }

    return { canApprove: true };
  }

  /**
   * Get admin decision history for a listing
   * @param listingId Listing ID
   * @returns Admin decision details or null if no decision made
   */
  async getDecisionHistory(listingId: number): Promise<{
    adminReviewerId: number | null;
    adminNotes: string | null;
    adminDecisionAt: Date | null;
    rejectionReason: string | null;
    approved: 'pending' | 'approved' | 'rejected';
  } | null> {
    const listingService = getListingService();
    const listing = await listingService.getById(listingId);

    if (!listing) {
      return null;
    }

    return {
      adminReviewerId: listing.admin_reviewer_id,
      adminNotes: listing.admin_notes,
      adminDecisionAt: listing.admin_decision_at,
      rejectionReason: listing.rejection_reason,
      approved: listing.approved
    };
  }
}

// ============================================================================
// Service Singleton Export
// ============================================================================

let listingApprovalServiceInstance: ListingApprovalService | null = null;

/**
 * Get ListingApprovalService singleton
 * @returns ListingApprovalService instance
 */
export function getListingApprovalService(): ListingApprovalService {
  if (!listingApprovalServiceInstance) {
    const db = getDatabaseService();
    listingApprovalServiceInstance = new ListingApprovalService(db);
  }
  return listingApprovalServiceInstance;
}

/**
 * Reset service instance (for testing)
 */
export function resetListingApprovalService(): void {
  listingApprovalServiceInstance = null;
}
