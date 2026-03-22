/**
 * ClaimListingService - Listing Claim Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Activity logging integration (non-blocking)
 * - Phase 1: Database schema + service foundation
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 1 Brain Plan - Service Layer Implementation
 * @phase Claim Listing Phase 1
 * @tier ADVANCED (multi-table operations, business logic)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { ListingClaimRow, ListingClaimVerificationRow } from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import { randomBytes } from 'crypto';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { ClaimNotificationService } from '@core/services/notification/ClaimNotificationService';
import { getListingService } from '@core/services/ServiceRegistry';
import { calculateListingCompleteness } from '@features/listings/utils/calculateListingCompleteness';

// ============================================================================
// Type Definitions
// ============================================================================

// Claim type enum
export type ClaimType = 'owner' | 'manager' | 'authorized_representative';

// Claim status enum
export type ClaimStatus = 'initiated' | 'verification_pending' | 'under_review' | 'approved' | 'rejected' | 'expired';

// Verification method enum
export type VerificationMethod = 'email' | 'phone' | 'domain' | 'document' | 'manual';

// Verification status enum
export type VerificationStatus = 'pending' | 'sent' | 'completed' | 'failed' | 'expired';

// Application-level claim interface (parsed from DB row)
export interface ListingClaim {
  id: number;
  listingId: number;
  claimantUserId: number;
  claimType: ClaimType;
  status: ClaimStatus;
  verificationScore: number | null;
  adminReviewerId: number | null;
  adminNotes: string | null;
  adminDecisionAt: Date | null;
  rejectionReason: string | null;
  claimantDescription: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Application-level verification interface
export interface ClaimVerification {
  id: number;
  claimId: number;
  method: VerificationMethod;
  status: VerificationStatus;
  verificationCode: string | null;
  codeExpiresAt: Date | null;
  attempts: number;
  maxAttempts: number;
  score: number | null;
  details: Record<string, unknown> | null;
  completedAt: Date | null;
  createdAt: Date;
}

// Input for initiating a claim
export interface InitiateClaimInput {
  listingId: number;
  claimantUserId: number;
  claimType: ClaimType;
  claimantDescription?: string;
}

// Input for admin review
export interface AdminReviewInput {
  claimId: number;
  adminUserId: number;
  decision: 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
}

// Result for admin review
export interface AdminReviewResult {
  claim: ListingClaim;
  listingUpdated: boolean;
  userRoleUpdated: boolean;
}

// Admin claims list filters
export interface ClaimFilters {
  status?: ClaimStatus;
  listingId?: number;
  claimantUserId?: number;
}

// Paginated claims result
export interface PaginatedClaimsResult {
  claims: ListingClaim[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Custom Errors
// ============================================================================

export class ClaimNotFoundError extends BizError {
  constructor(claimId: number) {
    super({
      code: 'CLAIM_NOT_FOUND',
      message: `Claim not found: ${claimId}`,
      context: { claimId },
      userMessage: 'The requested claim was not found'
    });
  }
}

export class ClaimAlreadyExistsError extends BizError {
  constructor(listingId: number, userId: number) {
    super({
      code: 'CLAIM_ALREADY_EXISTS',
      message: `Active claim already exists for listing ${listingId} by user ${userId}`,
      context: { listingId, userId },
      userMessage: 'You already have a pending claim for this business'
    });
  }
}

export class ListingAlreadyClaimedError extends BizError {
  constructor(listingId: number) {
    super({
      code: 'LISTING_ALREADY_CLAIMED',
      message: `Listing ${listingId} is already claimed`,
      context: { listingId },
      userMessage: 'This business has already been claimed'
    });
  }
}

export class InvalidClaimTransitionError extends BizError {
  constructor(claimId: number, currentStatus: string, attemptedAction: string) {
    super({
      code: 'INVALID_CLAIM_TRANSITION',
      message: `Cannot ${attemptedAction} claim ${claimId} in status ${currentStatus}`,
      context: { claimId, currentStatus, attemptedAction },
      userMessage: 'This claim action is not valid for the current claim status'
    });
  }
}

export class VerificationExpiredError extends BizError {
  constructor(verificationId: number) {
    super({
      code: 'VERIFICATION_EXPIRED',
      message: `Verification ${verificationId} has expired`,
      context: { verificationId },
      userMessage: 'This verification code has expired. Please request a new one'
    });
  }
}

export class MaxAttemptsExceededError extends BizError {
  constructor(verificationId: number, attempts: number) {
    super({
      code: 'MAX_ATTEMPTS_EXCEEDED',
      message: `Verification ${verificationId} exceeded max attempts: ${attempts}`,
      context: { verificationId, attempts },
      userMessage: 'Maximum verification attempts exceeded. Please request a new code'
    });
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

// Claim expiration: 30 days
const CLAIM_EXPIRATION_DAYS = 30;
// Verification code expiration: 15 minutes
const CODE_EXPIRATION_MINUTES = 15;

export class ClaimListingService {
  private db: DatabaseService;
  private notificationService: ClaimNotificationService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.notificationService = new ClaimNotificationService(db);
  }

  // ============================================================================
  // CLAIM LIFECYCLE
  // ============================================================================

  /**
   * Initiate a new claim for a listing
   * Validates listing exists, not already claimed, and no active claim
   */
  async initiateClaim(input: InitiateClaimInput): Promise<ListingClaim> {
    const { listingId, claimantUserId, claimType, claimantDescription } = input;

    // 1. Verify listing exists
    const listingResult: DbResult<{ id: number; claimed: number; user_id: number | null }> = await this.db.query(
      'SELECT id, claimed, user_id FROM listings WHERE id = ?',
      [listingId]
    );

    if (!listingResult.rows || listingResult.rows.length === 0) {
      throw BizError.notFound('Listing not found', listingId);
    }

    const listing = listingResult.rows[0];
    if (!listing) {
      throw BizError.notFound('Listing not found', listingId);
    }

    // 2. Check if already claimed
    if (listing.claimed === 1) {
      throw new ListingAlreadyClaimedError(listingId);
    }

    // 3. Check for active claim
    const activeClaimResult: DbResult<ListingClaimRow> = await this.db.query(
      `SELECT * FROM listing_claims
       WHERE listing_id = ?
       AND status NOT IN ('rejected', 'expired')
       ORDER BY created_at DESC
       LIMIT 1`,
      [listingId]
    );

    if (activeClaimResult.rows && activeClaimResult.rows.length > 0) {
      throw new ClaimAlreadyExistsError(listingId, claimantUserId);
    }

    // 4. Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CLAIM_EXPIRATION_DAYS);

    // 5. Insert claim
    const insertResult = await this.db.query(
      `INSERT INTO listing_claims
       (listing_id, claimant_user_id, claim_type, status, claimant_description, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, 'initiated', ?, ?, NOW(3), NOW(3))`,
      [listingId, claimantUserId, claimType, claimantDescription || null, expiresAt.toISOString()]
    );

    const claimId = insertResult.insertId;
    if (!claimId) {
      throw BizError.badRequest('Failed to create claim');
    }

    // 6. Retrieve created claim
    const claimResult: DbResult<ListingClaimRow> = await this.db.query(
      'SELECT * FROM listing_claims WHERE id = ?',
      [claimId]
    );

    if (!claimResult.rows || claimResult.rows.length === 0) {
      throw new ClaimNotFoundError(claimId);
    }

    const row = claimResult.rows[0];
    if (!row) {
      throw new ClaimNotFoundError(claimId);
    }

    const claim = this.mapRowToClaim(row);

    // 7. Log activity (non-blocking)
    const activityService = getActivityLoggingService();
    activityService.logActivity({
      action: 'claim.initiated',
      actionType: 'account',
      description: `User initiated claim for listing ${listingId}`,
      userId: claimantUserId,
      entityType: 'listing_claim',
      entityId: String(claimId),
      success: true,
      metadata: { listingId, claimType }
    }).catch(() => {});

    // 8. Send claim initiated email (non-blocking)
    this.getListingName(input.listingId).then(listingName => {
      this.notificationService.sendClaimInitiated(
        input.claimantUserId,
        listingName || `Listing #${input.listingId}`,
        input.claimType
      ).catch(() => {});
    }).catch(() => {});

    return claim;
  }

  /**
   * Get claim by ID
   */
  async getClaimById(claimId: number): Promise<ListingClaim | null> {
    const result: DbResult<ListingClaimRow> = await this.db.query(
      'SELECT * FROM listing_claims WHERE id = ?',
      [claimId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToClaim(row);
  }

  /**
   * Get most recent claim status for a user+listing pair
   */
  async getClaimStatus(listingId: number, userId: number): Promise<ListingClaim | null> {
    const result: DbResult<ListingClaimRow> = await this.db.query(
      `SELECT * FROM listing_claims
       WHERE listing_id = ? AND claimant_user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [listingId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToClaim(row);
  }

  /**
   * Get active claim for a listing (if exists)
   */
  async getActiveClaimForListing(listingId: number): Promise<ListingClaim | null> {
    const result: DbResult<ListingClaimRow> = await this.db.query(
      `SELECT * FROM listing_claims
       WHERE listing_id = ?
       AND status NOT IN ('rejected', 'expired')
       ORDER BY created_at DESC
       LIMIT 1`,
      [listingId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToClaim(row);
  }

  // ============================================================================
  // VERIFICATION
  // ============================================================================

  /**
   * Create a verification for a claim
   */
  async createVerification(claimId: number, method: VerificationMethod): Promise<ClaimVerification> {
    // 1. Verify claim exists and is in correct status
    const claim = await this.getClaimById(claimId);
    if (!claim) {
      throw new ClaimNotFoundError(claimId);
    }

    if (claim.status !== 'initiated' && claim.status !== 'verification_pending') {
      throw new InvalidClaimTransitionError(claimId, claim.status, 'create verification');
    }

    // 2. Insert verification
    const insertResult = await this.db.query(
      `INSERT INTO listing_claim_verifications
       (claim_id, method, status, created_at)
       VALUES (?, ?, 'pending', NOW(3))`,
      [claimId, method]
    );

    const verificationId = insertResult.insertId;
    if (!verificationId) {
      throw BizError.badRequest('Failed to create verification');
    }

    // 3. Update claim status to verification_pending if currently initiated
    if (claim.status === 'initiated') {
      await this.db.query(
        `UPDATE listing_claims
         SET status = 'verification_pending', updated_at = NOW(3)
         WHERE id = ?`,
        [claimId]
      );
    }

    // 4. Retrieve created verification
    const verificationResult: DbResult<ListingClaimVerificationRow> = await this.db.query(
      'SELECT * FROM listing_claim_verifications WHERE id = ?',
      [verificationId]
    );

    if (!verificationResult.rows || verificationResult.rows.length === 0) {
      throw BizError.notFound('Verification not found', verificationId);
    }

    const row = verificationResult.rows[0];
    if (!row) {
      throw BizError.notFound('Verification not found', verificationId);
    }

    return this.mapRowToVerification(row);
  }

  /**
   * Send verification code
   * Generates 6-digit code and updates verification
   * Actual email/SMS sending deferred to Phase 5
   */
  async sendVerificationCode(verificationId: number): Promise<{ codeSent: boolean; method: VerificationMethod }> {
    // 1. Get verification
    const verificationResult: DbResult<ListingClaimVerificationRow> = await this.db.query(
      'SELECT * FROM listing_claim_verifications WHERE id = ?',
      [verificationId]
    );

    if (!verificationResult.rows || verificationResult.rows.length === 0) {
      throw BizError.notFound('Verification not found', verificationId);
    }

    const verification = verificationResult.rows[0];
    if (!verification) {
      throw BizError.notFound('Verification not found', verificationId);
    }

    // 2. Generate code
    const code = this.generateVerificationCode();

    // 3. Calculate expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);

    // 4. Update verification
    await this.db.query(
      `UPDATE listing_claim_verifications
       SET verification_code = ?, code_expires_at = ?, status = 'sent'
       WHERE id = ?`,
      [code, expiresAt.toISOString(), verificationId]
    );

    // 5. Send verification pending email (non-blocking)
    const claim = await this.getClaimById(verification.claim_id);
    if (claim) {
      this.getListingName(claim.listingId).then(listingName => {
        this.notificationService.sendVerificationPending(
          claim.claimantUserId,
          claim.listingId,
          listingName || `Listing #${claim.listingId}`,
          verification.method
        ).catch(() => {});
      }).catch(() => {});
    }

    return {
      codeSent: true,
      method: verification.method as VerificationMethod
    };
  }

  /**
   * Verify code submission
   * Checks code match, expiration, and attempts
   */
  async verifyCode(claimId: number, code: string): Promise<{ verified: boolean; score: number }> {
    // 1. Get active verification for this claim
    const verificationResult: DbResult<ListingClaimVerificationRow> = await this.db.query(
      `SELECT * FROM listing_claim_verifications
       WHERE claim_id = ? AND status = 'sent'
       ORDER BY created_at DESC
       LIMIT 1`,
      [claimId]
    );

    if (!verificationResult.rows || verificationResult.rows.length === 0) {
      throw BizError.badRequest('No pending verification found for this claim');
    }

    const verification = verificationResult.rows[0];
    if (!verification) {
      throw BizError.badRequest('No pending verification found for this claim');
    }

    // 2. Check max attempts
    if (verification.attempts >= verification.max_attempts) {
      throw new MaxAttemptsExceededError(verification.id, verification.attempts);
    }

    // 3. Increment attempts
    await this.db.query(
      `UPDATE listing_claim_verifications
       SET attempts = attempts + 1
       WHERE id = ?`,
      [verification.id]
    );

    // 4. Check code match and expiration
    const codeMatch = verification.verification_code === code;
    const codeExpiresAt = verification.code_expires_at ? new Date(verification.code_expires_at) : null;
    const isExpired = codeExpiresAt ? new Date() > codeExpiresAt : true;

    if (isExpired) {
      await this.db.query(
        `UPDATE listing_claim_verifications
         SET status = 'expired'
         WHERE id = ?`,
        [verification.id]
      );
      throw new VerificationExpiredError(verification.id);
    }

    if (!codeMatch) {
      return { verified: false, score: 0 };
    }

    // 5. Code is correct - update verification
    const score = verification.method === 'email' ? 0.8 : 0.7; // Method-specific scoring
    await this.db.query(
      `UPDATE listing_claim_verifications
       SET status = 'completed', score = ?, completed_at = NOW(3)
       WHERE id = ?`,
      [score, verification.id]
    );

    // 6. Recalculate overall verification score for the claim
    const allVerificationsResult: DbResult<ListingClaimVerificationRow> = await this.db.query(
      'SELECT * FROM listing_claim_verifications WHERE claim_id = ?',
      [claimId]
    );

    const allVerifications = (allVerificationsResult.rows || []).map(row => this.mapRowToVerification(row));
    const overallScore = this.calculateVerificationScore(allVerifications);

    await this.db.query(
      `UPDATE listing_claims
       SET verification_score = ?
       WHERE id = ?`,
      [overallScore, claimId]
    );

    return { verified: true, score };
  }

  /**
   * Submit claim for admin review
   * Requires at least one completed verification OR claimant description
   */
  async submitForReview(claimId: number): Promise<ListingClaim> {
    // 1. Get claim
    const claim = await this.getClaimById(claimId);
    if (!claim) {
      throw new ClaimNotFoundError(claimId);
    }

    if (claim.status !== 'verification_pending') {
      throw new InvalidClaimTransitionError(claimId, claim.status, 'submit for review');
    }

    // 2. Get verifications
    const verificationsResult: DbResult<ListingClaimVerificationRow> = await this.db.query(
      'SELECT * FROM listing_claim_verifications WHERE claim_id = ?',
      [claimId]
    );

    const verifications = (verificationsResult.rows || []).map(row => this.mapRowToVerification(row));
    const hasCompletedVerification = verifications.some(v => v.status === 'completed');

    // 3. Require verification OR description
    if (!hasCompletedVerification && !claim.claimantDescription) {
      throw BizError.badRequest('Claim requires at least one completed verification or description');
    }

    // 4. Calculate score
    const score = this.calculateVerificationScore(verifications);

    // 5. Update claim to under_review
    await this.db.query(
      `UPDATE listing_claims
       SET status = 'under_review', verification_score = ?, updated_at = NOW(3)
       WHERE id = ?`,
      [score, claimId]
    );

    // 6. Log activity (non-blocking)
    const activityService = getActivityLoggingService();
    activityService.logActivity({
      action: 'claim.submitted_for_review',
      actionType: 'account',
      description: `Claim ${claimId} submitted for admin review`,
      userId: claim.claimantUserId,
      entityType: 'listing_claim',
      entityId: String(claimId),
      success: true,
      metadata: { listingId: claim.listingId, score }
    }).catch(() => {});

    // 7. Send under review email to user (non-blocking)
    this.getListingName(claim.listingId).then(listingName => {
      this.notificationService.sendUnderReview(
        claim.claimantUserId,
        listingName || `Listing #${claim.listingId}`
      ).catch(() => {});
    }).catch(() => {});

    // 8. Send admin alert (non-blocking)
    this.getUserInfo(claim.claimantUserId).then(user => {
      this.getListingName(claim.listingId).then(listingName => {
        this.notificationService.sendAdminNewClaimAlert(
          claimId,
          listingName || `Listing #${claim.listingId}`,
          user?.display_name || user?.first_name || 'Unknown',
          user?.email || 'unknown@email.com',
          claim.claimType,
          score
        ).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});

    return (await this.getClaimById(claimId))!;
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  /**
   * Admin review claim (approve or reject)
   */
  async adminReviewClaim(input: AdminReviewInput): Promise<AdminReviewResult> {
    const { claimId, adminUserId, decision, adminNotes, rejectionReason } = input;

    // 1. Get claim
    const claim = await this.getClaimById(claimId);
    if (!claim) {
      throw new ClaimNotFoundError(claimId);
    }

    if (claim.status !== 'under_review') {
      throw new InvalidClaimTransitionError(claimId, claim.status, 'admin review');
    }

    let listingUpdated = false;
    let userRoleUpdated = false;

    if (decision === 'approved') {
      // APPROVE: Update claim, listing, and potentially user role
      await this.db.query(
        `UPDATE listing_claims
         SET status = 'approved', admin_reviewer_id = ?, admin_notes = ?, admin_decision_at = NOW(3), updated_at = NOW(3)
         WHERE id = ?`,
        [adminUserId, adminNotes || null, claimId]
      );

      // Update listing
      await this.db.query(
        `UPDATE listings
         SET claimed = 1, user_id = ?, tier = 'essentials', status = 'active', approved = 'approved'
         WHERE id = ?`,
        [claim.claimantUserId, claim.listingId]
      );
      listingUpdated = true;

      // Check user role and update if needed
      const userResult: DbResult<{ role: string }> = await this.db.query(
        'SELECT role FROM users WHERE id = ?',
        [claim.claimantUserId]
      );

      if (userResult.rows && userResult.rows[0]?.role === 'general') {
        await this.db.query(
          `UPDATE users SET role = 'listing_member' WHERE id = ?`,
          [claim.claimantUserId]
        );
        userRoleUpdated = true;
      }

      // Log activity (non-blocking)
      const activityService = getActivityLoggingService();
      activityService.logActivity({
        action: 'claim.approved',
        actionType: 'account',
        description: `Admin approved claim ${claimId} for listing ${claim.listingId}`,
        userId: adminUserId,
        entityType: 'listing_claim',
        entityId: String(claimId),
        success: true,
        metadata: { listingId: claim.listingId, claimantUserId: claim.claimantUserId, userRoleUpdated }
      }).catch(() => {});

      // Send approved email with completeness percentage (non-blocking)
      Promise.all([
        this.getListingName(claim.listingId),
        this.getListingCompleteness(claim.listingId)
      ]).then(([listingName, completenessPercent]) => {
        this.notificationService.sendClaimApproved(
          claim.claimantUserId,
          claim.listingId,
          listingName || `Listing #${claim.listingId}`,
          'essentials',
          completenessPercent
        ).catch(() => {});
      }).catch(() => {});

    } else {
      // REJECT: Update claim only
      await this.db.query(
        `UPDATE listing_claims
         SET status = 'rejected', admin_reviewer_id = ?, admin_notes = ?, rejection_reason = ?, admin_decision_at = NOW(3), updated_at = NOW(3)
         WHERE id = ?`,
        [adminUserId, adminNotes || null, rejectionReason || null, claimId]
      );

      // Log activity (non-blocking)
      const activityService = getActivityLoggingService();
      activityService.logActivity({
        action: 'claim.rejected',
        actionType: 'account',
        description: `Admin rejected claim ${claimId} for listing ${claim.listingId}`,
        userId: adminUserId,
        entityType: 'listing_claim',
        entityId: String(claimId),
        success: true,
        metadata: { listingId: claim.listingId, rejectionReason }
      }).catch(() => {});

      // Send rejected email (non-blocking)
      this.getListingName(claim.listingId).then(listingName => {
        this.notificationService.sendClaimRejected(
          claim.claimantUserId,
          claim.listingId,
          listingName || `Listing #${claim.listingId}`,
          rejectionReason || 'Your claim did not meet our verification requirements.'
        ).catch(() => {});
      }).catch(() => {});
    }

    const updatedClaim = (await this.getClaimById(claimId))!;

    return {
      claim: updatedClaim,
      listingUpdated,
      userRoleUpdated
    };
  }

  /**
   * Get claims for admin with filters and pagination
   */
  async getClaimsForAdmin(
    filters?: ClaimFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedClaimsResult> {
    // Build WHERE clause
    const whereClauses: string[] = [];
    const whereParams: any[] = [];

    if (filters?.status) {
      whereClauses.push('lc.status = ?');
      whereParams.push(filters.status);
    }

    if (filters?.listingId) {
      whereClauses.push('lc.listing_id = ?');
      whereParams.push(filters.listingId);
    }

    if (filters?.claimantUserId) {
      whereClauses.push('lc.claimant_user_id = ?');
      whereParams.push(filters.claimantUserId);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countResult: DbResult<{ total: bigint }> = await this.db.query(
      `SELECT COUNT(*) as total FROM listing_claims lc ${whereClause}`,
      whereParams
    );

    const total = bigIntToNumber(countResult.rows?.[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Get paginated claims with JOIN for display info
    const claimsResult: DbResult<ListingClaimRow> = await this.db.query(
      `SELECT lc.*
       FROM listing_claims lc
       ${whereClause}
       ORDER BY lc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    const claims = (claimsResult.rows || []).map(row => this.mapRowToClaim(row));

    return {
      claims,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get claim with all verifications
   */
  async getClaimWithVerifications(claimId: number): Promise<{ claim: ListingClaim; verifications: ClaimVerification[] } | null> {
    const claim = await this.getClaimById(claimId);
    if (!claim) {
      return null;
    }

    const verificationsResult: DbResult<ListingClaimVerificationRow> = await this.db.query(
      'SELECT * FROM listing_claim_verifications WHERE claim_id = ? ORDER BY created_at ASC',
      [claimId]
    );

    const verifications = (verificationsResult.rows || []).map(row => this.mapRowToVerification(row));

    return { claim, verifications };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Expire old claims (cron job utility)
   */
  async expireOldClaims(): Promise<number> {
    const result = await this.db.query(
      `UPDATE listing_claims
       SET status = 'expired', updated_at = NOW(3)
       WHERE status NOT IN ('approved', 'rejected', 'expired')
       AND expires_at < NOW(3)`
    );

    return (result as any).affectedRows || 0;
  }

  /**
   * Calculate listing completeness score
   * Weighted scoring per brain plan specification
   */
  async calculateListingCompleteness(listingId: number): Promise<{ percentage: number; missingFields: string[] }> {
    const listingResult: DbResult<any> = await this.db.query(
      'SELECT * FROM listings WHERE id = ?',
      [listingId]
    );

    if (!listingResult.rows || listingResult.rows.length === 0) {
      throw BizError.notFound('Listing not found', listingId);
    }

    const listing = listingResult.rows[0];
    const missingFields: string[] = [];

    // Required fields (70% total weight)
    const requiredWeights = {
      name: 0.10,
      description: 0.15,
      address: 0.10,
      phone: 0.10,
      email: 0.05,
      category_id: 0.10,
      business_hours: 0.10
    };

    // Optional fields (30% total weight)
    const optionalWeights = {
      logo_url: 0.08,
      cover_image_url: 0.05,
      gallery_images: 0.05,
      social_media: 0.04,
      features: 0.03,
      amenities: 0.03,
      website: 0.02
    };

    let score = 0;

    // Check required fields
    for (const [field, weight] of Object.entries(requiredWeights)) {
      if (listing[field] && listing[field] !== null && listing[field] !== '') {
        score += weight;
      } else {
        missingFields.push(field);
      }
    }

    // Check optional fields
    for (const [field, weight] of Object.entries(optionalWeights)) {
      if (listing[field] && listing[field] !== null && listing[field] !== '') {
        score += weight;
      } else {
        missingFields.push(field);
      }
    }

    const percentage = Math.round(score * 100);

    return { percentage, missingFields };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Map database row to ListingClaim interface
   */
  private mapRowToClaim(row: ListingClaimRow): ListingClaim {
    return {
      id: row.id,
      listingId: row.listing_id,
      claimantUserId: row.claimant_user_id,
      claimType: row.claim_type,
      status: row.status,
      verificationScore: row.verification_score ? parseFloat(row.verification_score) : null,
      adminReviewerId: row.admin_reviewer_id,
      adminNotes: row.admin_notes,
      adminDecisionAt: row.admin_decision_at ? new Date(row.admin_decision_at) : null,
      rejectionReason: row.rejection_reason,
      claimantDescription: row.claimant_description,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to ClaimVerification interface
   */
  private mapRowToVerification(row: ListingClaimVerificationRow): ClaimVerification {
    return {
      id: row.id,
      claimId: row.claim_id,
      method: row.method,
      status: row.status,
      verificationCode: row.verification_code,
      codeExpiresAt: row.code_expires_at ? new Date(row.code_expires_at) : null,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      score: row.score ? parseFloat(row.score) : null,
      details: safeJsonParse(row.details, {}),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Generate 6-digit verification code
   */
  private generateVerificationCode(): string {
    const buffer = randomBytes(3);
    const num = buffer.readUIntBE(0, 3) % 1000000;
    return num.toString().padStart(6, '0');
  }

  /**
   * Calculate aggregate verification score from all completed verifications
   */
  private calculateVerificationScore(verifications: ClaimVerification[]): number {
    const completed = verifications.filter(v => v.status === 'completed' && v.score !== null);

    if (completed.length === 0) {
      return 0;
    }

    // Method-specific weights
    const methodWeights: Record<string, number> = {
      email: 0.8,
      phone: 0.7,
      domain: 0.6,
      document: 0.5,
      manual: 0.3
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const verification of completed) {
      const weight = methodWeights[verification.method] || 0.5;
      totalScore += (verification.score || 0) * weight;
      totalWeight += weight;
    }

    const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Cap at 1.0
    return Math.min(avgScore, 1.0);
  }

  /**
   * Get listing name for email notifications
   */
  private async getListingName(listingId: number): Promise<string | null> {
    try {
      const result = await this.db.query<{ name: string }>(
        'SELECT name FROM listings WHERE id = ?',
        [listingId]
      );
      return result.rows?.[0]?.name || null;
    } catch {
      return null;
    }
  }

  /**
   * Get listing completeness percentage
   * @phase Phase 6 - Listing Completeness Indicator
   */
  private async getListingCompleteness(listingId: number): Promise<number | undefined> {
    try {
      const listingService = getListingService();
      const listing = await listingService.getById(listingId);

      if (!listing) return undefined;

      const completion = calculateListingCompleteness(listing);
      return completion.percentage;
    } catch {
      return undefined;
    }
  }

  /**
   * Get user info for admin notifications
   */
  private async getUserInfo(userId: number): Promise<{
    email: string;
    first_name: string | null;
    display_name: string | null;
  } | null> {
    try {
      const result = await this.db.query<{
        email: string;
        first_name: string | null;
        display_name: string | null;
      }>(
        'SELECT email, first_name, display_name FROM users WHERE id = ?',
        [userId]
      );
      return result.rows?.[0] || null;
    } catch {
      return null;
    }
  }
}
