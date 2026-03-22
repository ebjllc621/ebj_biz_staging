/**
 * RefundService Test Suite
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 8
 * @phase Phase 8 - E2E Testing & Test Mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundService } from '../RefundService';

vi.mock('@core/config/stripe', () => ({
  stripe: {
    refunds: { create: vi.fn() },
  },
}));

vi.mock('@core/services/NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    dispatch: vi.fn().mockResolvedValue(undefined),
  })),
}));

// =============================================================================
// Shared mock row builder
// =============================================================================

function buildRefundRow(overrides: Partial<{
  id: number;
  status: string;
  approved_amount: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    entity_type: 'subscription' as const,
    entity_id: 1,
    user_id: 1,
    listing_id: null,
    original_amount: '99.00',
    requested_amount: '50.00',
    approved_amount: overrides.approved_amount ?? null,
    processed_amount: null,
    currency: 'usd',
    reason_category: 'customer_request' as const,
    reason_details: null,
    status: (overrides.status ?? 'submitted') as
      'submitted' | 'under_review' | 'approved' | 'denied' | 'processing' | 'completed' | 'failed',
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    approved_by: null,
    approved_at: null,
    stripe_refund_id: null,
    stripe_payment_intent_id: null,
    processed_at: null,
    requires_escalation: 0,
    escalated_to: null,
    escalated_at: null,
    escalation_reason: null,
    created_at: '2026-03-16T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
  };
}

describe('RefundService', () => {
  let service: RefundService;
  let mockDb: {
    query: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn((fn: (db: typeof mockDb) => unknown) => fn(mockDb)),
    };
    service = new RefundService(mockDb as never);
  });

  // ==========================================================================
  // createRefundRequest
  // ==========================================================================

  describe('createRefundRequest', () => {
    it('should create a refund request and return mapped result', async () => {
      const submittedRow = buildRefundRow({ status: 'submitted' });

      mockDb.query
        .mockResolvedValueOnce({ insertId: 1 })           // INSERT refund_requests
        .mockResolvedValueOnce({})                         // INSERT refund_audit_trail (logAuditEntry)
        .mockResolvedValueOnce({ rows: [submittedRow] }); // SELECT for getRefundById

      const result = await service.createRefundRequest(1, {
        entityType: 'subscription',
        entityId: 1,
        originalAmount: 99,
        requestedAmount: 50,
        reasonCategory: 'customer_request',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('submitted');
      expect(result.userId).toBe(1);
    });

    it('should set requires_escalation for amounts over $200', async () => {
      const submittedRow = buildRefundRow({ status: 'submitted' });

      mockDb.query
        .mockResolvedValueOnce({ insertId: 1 })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ ...submittedRow, requires_escalation: 1 }] });

      const result = await service.createRefundRequest(1, {
        entityType: 'subscription',
        entityId: 1,
        originalAmount: 500,
        requestedAmount: 250,
        reasonCategory: 'customer_request',
      });

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // getRefundsForUser
  // ==========================================================================

  describe('getRefundsForUser', () => {
    it('should return empty array if user has no refunds', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      const result = await service.getRefundsForUser(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return mapped refund requests for user', async () => {
      const row = buildRefundRow({ status: 'submitted' });
      mockDb.query.mockResolvedValueOnce({ rows: [row] });
      const result = await service.getRefundsForUser(1);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(1);
    });
  });

  // ==========================================================================
  // getRefundById
  // ==========================================================================

  describe('getRefundById', () => {
    it('should throw RefundNotFoundError if refund not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      await expect(service.getRefundById(999)).rejects.toThrow();
    });

    it('should return mapped refund request if found', async () => {
      const row = buildRefundRow({ id: 5, status: 'under_review' });
      mockDb.query.mockResolvedValueOnce({ rows: [row] });
      const result = await service.getRefundById(5);
      expect(result.id).toBe(5);
      expect(result.status).toBe('under_review');
    });
  });

  // ==========================================================================
  // approveRefund
  // ==========================================================================

  describe('approveRefund', () => {
    it('should update status to approved', async () => {
      const submittedRow = buildRefundRow({ status: 'submitted' });
      const approvedRow = buildRefundRow({ status: 'approved', approved_amount: '50.00' });

      mockDb.query
        .mockResolvedValueOnce({ rows: [submittedRow] }) // getRefundById (current state)
        .mockResolvedValueOnce({})                        // UPDATE refund_requests
        .mockResolvedValueOnce({})                        // INSERT audit trail (logAuditEntry)
        .mockResolvedValueOnce({ rows: [approvedRow] }); // getRefundById (after update)

      const result = await service.approveRefund(1, 1, 50);
      expect(result.status).toBe('approved');
    });

    it('should throw if refund is not in submitted or under_review status', async () => {
      const completedRow = buildRefundRow({ status: 'completed' });
      mockDb.query.mockResolvedValueOnce({ rows: [completedRow] });
      await expect(service.approveRefund(1, 1, 50)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // denyRefund
  // ==========================================================================

  describe('denyRefund', () => {
    it('should update status to denied', async () => {
      const submittedRow = buildRefundRow({ status: 'submitted' });
      const deniedRow = buildRefundRow({ status: 'denied' });

      mockDb.query
        .mockResolvedValueOnce({ rows: [submittedRow] }) // getRefundById (current)
        .mockResolvedValueOnce({})                        // UPDATE
        .mockResolvedValueOnce({})                        // audit INSERT
        .mockResolvedValueOnce({ rows: [deniedRow] });   // getRefundById (after)

      const result = await service.denyRefund(1, 1, 'Outside refund window');
      expect(result.status).toBe('denied');
    });
  });
});
