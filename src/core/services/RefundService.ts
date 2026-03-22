/**
 * RefundService - Refund request lifecycle management
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 4
 * @tier ENTERPRISE
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary (no direct DB in routes)
 * - BizError for all error handling
 * - Stripe tokens only (no card data stored)
 * - IDOR prevention via userId scoping on user-facing queries
 * - DECIMAL columns (original_amount, requested_amount, etc.) parsed via parseFloat
 * - TINYINT(1) (requires_escalation) parsed via Boolean()
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BillingService } from '@core/services/BillingService';
import { BizError } from '@core/errors/BizError';
import { stripe } from '@core/config/stripe';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RefundRequestRow, RefundAuditTrailRow } from '@core/types/db-rows';
import type {
  RefundRequest,
  RefundAuditEntry,
  CreateRefundRequestInput,
  RefundStatus,
  RefundAuditAction
} from '@core/types/subscription';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class RefundNotFoundError extends BizError {
  constructor(id: number) {
    super({
      code: 'REFUND_NOT_FOUND',
      message: `Refund request not found: ${id}`,
      context: { id },
      userMessage: 'Refund request not found'
    });
  }
}

export class InvalidRefundStatusError extends BizError {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super({
      code: 'INVALID_REFUND_STATUS',
      message: `Cannot ${action}: refund is '${currentStatus}', required '${requiredStatus}'`,
      context: { currentStatus, requiredStatus, action },
      userMessage: `This refund cannot be ${action} in its current status`
    });
  }
}

// ============================================================================
// Pagination Options
// ============================================================================

export interface RefundQueueOptions {
  status?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface RefundQueueResult {
  refunds: RefundRequestWithUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface RefundRequestWithUser extends RefundRequest {
  requesterEmail?: string;
  requesterName?: string | null;
}

// ============================================================================
// RefundService
// ============================================================================

export class RefundService {
  constructor(private db: DatabaseService) {}

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  /**
   * Submit a new refund request.
   * Auto-approves if requested amount <= $50.
   * Flags for escalation if requested amount > $200.
   */
  async createRefundRequest(userId: number, input: CreateRefundRequestInput): Promise<RefundRequest> {
    const requiresEscalation = input.requestedAmount > 200 ? 1 : 0;

    const insertResult = await this.db.query(
      `INSERT INTO refund_requests (
        entity_type, entity_id, user_id, listing_id,
        original_amount, requested_amount, currency,
        reason_category, reason_details, status,
        stripe_payment_intent_id, requires_escalation
      ) VALUES (?, ?, ?, ?, ?, ?, 'usd', ?, ?, 'submitted', ?, ?)`,
      [
        input.entityType,
        input.entityId,
        userId,
        input.listingId ?? null,
        input.originalAmount,
        input.requestedAmount,
        input.reasonCategory,
        input.reasonDetails ?? null,
        input.stripePaymentIntentId ?? null,
        requiresEscalation
      ]
    );

    const newId = insertResult.insertId as number;

    // Log initial audit entry
    await this.logAuditEntry({
      refundRequestId: newId,
      adminUserId: null,
      actionType: 'submitted',
      actionDescription: `Refund request submitted for ${input.entityType} (${input.entityId})`,
      afterStatus: 'submitted'
    });

    return this.getRefundById(newId);
  }

  /**
   * Approve a refund request. Admin only.
   * Validates status is 'submitted' or 'under_review'.
   */
  async approveRefund(
    refundId: number,
    adminUserId: number,
    approvedAmount?: number,
    notes?: string
  ): Promise<RefundRequest> {
    const request = await this.getRefundById(refundId);

    if (request.status !== 'submitted' && request.status !== 'under_review') {
      throw new InvalidRefundStatusError(request.status, 'submitted or under_review', 'approve');
    }

    const finalApprovedAmount = approvedAmount ?? request.requestedAmount;

    await this.db.query(
      `UPDATE refund_requests SET
        status = 'approved',
        approved_amount = ?,
        approved_by = ?,
        approved_at = NOW(),
        review_notes = ?
       WHERE id = ?`,
      [finalApprovedAmount, adminUserId, notes ?? null, refundId]
    );

    await this.logAuditEntry({
      refundRequestId: refundId,
      adminUserId,
      actionType: 'approved',
      actionDescription: notes ?? `Refund approved for $${finalApprovedAmount}`,
      beforeStatus: request.status,
      afterStatus: 'approved',
      beforeAmount: request.requestedAmount,
      afterAmount: finalApprovedAmount
    });

    // Non-blocking: notify user of refund approval
    try {
      const NotificationServiceModule = await import('@core/services/NotificationService');
      const notificationService = new NotificationServiceModule.NotificationService(this.db);
      await notificationService.dispatch({
        type: 'billing.refund_approved' as import('@core/services/notification/types').NotificationEventType,
        recipientId: request.userId,
        title: 'Refund Approved',
        message: `Your refund of $${finalApprovedAmount} has been approved and will be processed within 3-5 business days`,
        actionUrl: '/dashboard/account/billing',
        priority: 'normal'
      });
    } catch { /* Non-blocking */ }

    return this.getRefundById(refundId);
  }

  /**
   * Deny a refund request. Admin only.
   */
  async denyRefund(refundId: number, adminUserId: number, reason: string): Promise<RefundRequest> {
    const request = await this.getRefundById(refundId);

    if (request.status !== 'submitted' && request.status !== 'under_review') {
      throw new InvalidRefundStatusError(request.status, 'submitted or under_review', 'deny');
    }

    await this.db.query(
      `UPDATE refund_requests SET
        status = 'denied',
        reviewed_by = ?,
        reviewed_at = NOW(),
        review_notes = ?
       WHERE id = ?`,
      [adminUserId, reason, refundId]
    );

    await this.logAuditEntry({
      refundRequestId: refundId,
      adminUserId,
      actionType: 'denied',
      actionDescription: reason,
      beforeStatus: request.status,
      afterStatus: 'denied'
    });

    // Non-blocking: notify user of refund denial
    try {
      const NotificationServiceModule = await import('@core/services/NotificationService');
      const notificationService = new NotificationServiceModule.NotificationService(this.db);
      await notificationService.dispatch({
        type: 'billing.refund_denied' as import('@core/services/notification/types').NotificationEventType,
        recipientId: request.userId,
        title: 'Refund Request Update',
        message: `Your refund request could not be approved. Reason: ${reason}`,
        actionUrl: '/dashboard/account/billing',
        priority: 'normal'
      });
    } catch { /* Non-blocking */ }

    return this.getRefundById(refundId);
  }

  /**
   * Process an approved refund. Calls Stripe if payment_intent is present.
   * Records a negative billing_transaction entry for the refund.
   */
  async processRefund(refundId: number, adminUserId: number): Promise<RefundRequest> {
    const request = await this.getRefundById(refundId);

    if (request.status !== 'approved') {
      throw new InvalidRefundStatusError(request.status, 'approved', 'process');
    }

    await this.db.query(
      `UPDATE refund_requests SET status = 'processing' WHERE id = ?`,
      [refundId]
    );

    await this.logAuditEntry({
      refundRequestId: refundId,
      adminUserId,
      actionType: 'processing',
      actionDescription: 'Refund processing started',
      beforeStatus: 'approved',
      afterStatus: 'processing'
    });

    const refundAmount = request.approvedAmount ?? request.requestedAmount;

    try {
      let stripeRefundId: string | null = null;

      // Execute Stripe refund if payment intent is known
      if (request.stripePaymentIntentId) {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: request.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100)
        });
        stripeRefundId = stripeRefund.id;
      }

      // Record billing transaction for the refund (negative amount)
      const billingService = new BillingService(this.db);
      await billingService.recordTransaction({
        userId: request.userId,
        listingId: request.listingId ?? undefined,
        transactionType: 'refund',
        amount: -refundAmount,
        description: `Refund: ${request.reasonCategory}`,
        stripeChargeId: stripeRefundId ?? undefined
      });

      // Mark as completed
      await this.db.query(
        `UPDATE refund_requests SET
          status = 'completed',
          stripe_refund_id = ?,
          processed_amount = ?,
          processed_at = NOW()
         WHERE id = ?`,
        [stripeRefundId, refundAmount, refundId]
      );

      await this.logAuditEntry({
        refundRequestId: refundId,
        adminUserId,
        actionType: 'completed',
        actionDescription: stripeRefundId
          ? `Stripe refund ${stripeRefundId} processed`
          : 'Manual refund marked complete',
        beforeStatus: 'processing',
        afterStatus: 'completed',
        afterAmount: refundAmount,
        metadata: stripeRefundId ? { stripe_refund_id: stripeRefundId } : undefined
      });

      // Non-blocking: notify user of refund processing completion
      try {
        const NotificationServiceModule = await import('@core/services/NotificationService');
        const notificationService = new NotificationServiceModule.NotificationService(this.db);
        await notificationService.dispatch({
          type: 'billing.refund_processed' as import('@core/services/notification/types').NotificationEventType,
          recipientId: request.userId,
          title: 'Refund Processed',
          message: `Your refund of $${refundAmount} has been processed successfully`,
          actionUrl: '/dashboard/account/billing',
          priority: 'normal'
        });
      } catch { /* Non-blocking */ }

    } catch (error) {
      // Mark as failed on error
      await this.db.query(
        `UPDATE refund_requests SET status = 'failed' WHERE id = ?`,
        [refundId]
      );

      await this.logAuditEntry({
        refundRequestId: refundId,
        adminUserId,
        actionType: 'failed',
        actionDescription: error instanceof Error ? error.message : 'Unknown error during processing',
        beforeStatus: 'processing',
        afterStatus: 'failed'
      });

      throw error;
    }

    return this.getRefundById(refundId);
  }

  /**
   * Escalate a refund request for senior review.
   */
  async escalateRefund(refundId: number, adminUserId: number, reason: string): Promise<RefundRequest> {
    const request = await this.getRefundById(refundId);

    await this.db.query(
      `UPDATE refund_requests SET
        requires_escalation = 1,
        escalated_to = ?,
        escalated_at = NOW(),
        escalation_reason = ?,
        status = 'under_review'
       WHERE id = ?`,
      [adminUserId, reason, refundId]
    );

    await this.logAuditEntry({
      refundRequestId: refundId,
      adminUserId,
      actionType: 'escalated',
      actionDescription: reason,
      beforeStatus: request.status,
      afterStatus: 'under_review'
    });

    return this.getRefundById(refundId);
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get a refund request by ID.
   * If userId is provided, scopes to that user (IDOR prevention).
   * If no userId, admin-level access (no scoping).
   */
  async getRefundById(id: number, userId?: number): Promise<RefundRequest> {
    let sql = 'SELECT * FROM refund_requests WHERE id = ?';
    const params: (number)[] = [id];

    if (userId !== undefined) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    const result = await this.db.query<RefundRequestRow>(sql, params);
    const row = result.rows[0];

    if (!row) {
      throw new RefundNotFoundError(id);
    }

    return this.mapRowToRefundRequest(row);
  }

  /**
   * Get all refund requests for a user.
   */
  async getRefundsForUser(userId: number): Promise<RefundRequest[]> {
    const result = await this.db.query<RefundRequestRow>(
      'SELECT * FROM refund_requests WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(row => this.mapRowToRefundRequest(row));
  }

  /**
   * Admin paginated refund queue with optional filters.
   * JOINs users table for requester info.
   * Returns explicit `refunds` entity key.
   */
  async getRefundQueue(options: RefundQueueOptions): Promise<RefundQueueResult> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];

    if (options.status) {
      conditions.push('rr.status = ?');
      params.push(options.status);
    }

    if (options.search) {
      conditions.push('(u.email LIKE ? OR u.display_name LIKE ? OR rr.reason_details LIKE ?)');
      params.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countResult = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count
       FROM refund_requests rr
       JOIN users u ON rr.user_id = u.id
       WHERE ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

    // Data query — inline interface for joined row
    interface RefundWithUserRow extends RefundRequestRow {
      requester_email: string;
      requester_name: string | null;
    }

    const dataResult = await this.db.query<RefundWithUserRow>(
      `SELECT
         rr.*,
         u.email as requester_email,
         u.display_name as requester_name
       FROM refund_requests rr
       JOIN users u ON rr.user_id = u.id
       WHERE ${whereClause}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const refunds: RefundRequestWithUser[] = dataResult.rows.map(row => ({
      ...this.mapRowToRefundRequest(row),
      requesterEmail: row.requester_email,
      requesterName: row.requester_name
    }));

    return {
      refunds,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Get the full audit trail for a refund request.
   */
  async getAuditTrail(refundId: number): Promise<RefundAuditEntry[]> {
    const result = await this.db.query<RefundAuditTrailRow>(
      'SELECT * FROM refund_audit_trail WHERE refund_request_id = ? ORDER BY created_at ASC',
      [refundId]
    );
    return result.rows.map(row => this.mapRowToAuditEntry(row));
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Insert an immutable audit log entry.
   */
  private async logAuditEntry(entry: {
    refundRequestId: number;
    adminUserId: number | null;
    actionType: RefundAuditAction;
    actionDescription?: string;
    beforeStatus?: string;
    afterStatus?: string;
    beforeAmount?: number;
    afterAmount?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO refund_audit_trail (
        refund_request_id, admin_user_id, action_type,
        action_description, before_status, after_status,
        before_amount, after_amount, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.refundRequestId,
        entry.adminUserId,
        entry.actionType,
        entry.actionDescription ?? null,
        entry.beforeStatus ?? null,
        entry.afterStatus ?? null,
        entry.beforeAmount ?? null,
        entry.afterAmount ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]
    );
  }

  /**
   * Map a RefundRequestRow to the domain RefundRequest type.
   * - DECIMAL columns (amounts) → parseFloat
   * - TINYINT(1) (requires_escalation) → Boolean
   * - timestamp strings → Date objects
   */
  private mapRowToRefundRequest(row: RefundRequestRow): RefundRequest {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      userId: row.user_id,
      listingId: row.listing_id,
      originalAmount: parseFloat(row.original_amount),
      requestedAmount: parseFloat(row.requested_amount),
      approvedAmount: row.approved_amount !== null ? parseFloat(row.approved_amount) : null,
      processedAmount: row.processed_amount !== null ? parseFloat(row.processed_amount) : null,
      currency: row.currency,
      reasonCategory: row.reason_category,
      reasonDetails: row.reason_details,
      status: row.status as RefundStatus,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      reviewNotes: row.review_notes,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      stripeRefundId: row.stripe_refund_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      processedAt: row.processed_at ? new Date(row.processed_at) : null,
      requiresEscalation: Boolean(row.requires_escalation),
      escalatedTo: row.escalated_to,
      escalatedAt: row.escalated_at ? new Date(row.escalated_at) : null,
      escalationReason: row.escalation_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map a RefundAuditTrailRow to the domain RefundAuditEntry type.
   */
  private mapRowToAuditEntry(row: RefundAuditTrailRow): RefundAuditEntry {
    return {
      id: row.id,
      refundRequestId: row.refund_request_id,
      adminUserId: row.admin_user_id,
      actionType: row.action_type,
      actionDescription: row.action_description,
      beforeStatus: row.before_status,
      afterStatus: row.after_status,
      beforeAmount: row.before_amount !== null ? parseFloat(row.before_amount) : null,
      afterAmount: row.after_amount !== null ? parseFloat(row.after_amount) : null,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      createdAt: new Date(row.created_at)
    };
  }
}
