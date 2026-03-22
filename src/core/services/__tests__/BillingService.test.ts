/**
 * BillingService Test Suite
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 8
 * @phase Phase 8 - E2E Testing & Test Mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from '../BillingService';

// Mock stripe
vi.mock('@core/config/stripe', () => ({
  stripe: {
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      retrieve: vi.fn(),
    },
    customers: {
      create: vi.fn(),
    },
  },
}));

// Mock notification service (dynamic import)
vi.mock('@core/services/NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    dispatch: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('BillingService', () => {
  let service: BillingService;
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
    service = new BillingService(mockDb as never);
  });

  // ==========================================================================
  // recordTransaction
  // ==========================================================================

  describe('recordTransaction', () => {
    it('should insert a billing transaction and return mapped result', async () => {
      const mockRow = {
        id: 1,
        user_id: 1,
        listing_id: null,
        transaction_type: 'subscription_charge' as const,
        amount: '49.00',
        currency: 'usd',
        status: 'completed' as const,
        subscription_id: null,
        addon_id: null,
        stripe_charge_id: null,
        stripe_invoice_id: null,
        stripe_payment_intent_id: null,
        description: 'Test',
        invoice_number: 'BK-2026-03-001',
        tax_amount: '0.00',
        tax_rate: null,
        transaction_date: '2026-03-16T00:00:00Z',
        due_date: null,
        paid_date: '2026-03-16T00:00:00Z',
        receipt_url: null,
        statement_month: '2026-03',
        metadata: null,
        created_at: '2026-03-16T00:00:00Z',
        updated_at: '2026-03-16T00:00:00Z',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 0n }] }) // COUNT for generateInvoiceNumber
        .mockResolvedValueOnce({ insertId: 1 })             // INSERT billing_transactions
        .mockResolvedValueOnce({ rows: [mockRow] });        // SELECT for getTransactionById

      const result = await service.recordTransaction({
        userId: 1,
        transactionType: 'subscription_charge',
        amount: 49,
        description: 'Test',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(49);
      expect(result.invoiceNumber).toContain('BK-');
    });
  });

  // ==========================================================================
  // generateInvoiceNumber
  // ==========================================================================

  describe('generateInvoiceNumber', () => {
    it('should generate BK-YYYY-MM-SEQ format', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 5n }] });
      const result = await service.generateInvoiceNumber();
      expect(result).toMatch(/^BK-\d{4}-\d{2}-\d{3}$/);
    });

    it('should pad sequence to 3 digits', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 0n }] });
      const result = await service.generateInvoiceNumber();
      expect(result).toMatch(/^BK-\d{4}-\d{2}-001$/);
    });
  });

  // ==========================================================================
  // validateListingOwnership
  // ==========================================================================

  describe('validateListingOwnership', () => {
    it('should throw forbidden if user does not own listing', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ user_id: 999 }] });
      await expect(service.validateListingOwnership(1, 1)).rejects.toThrow();
    });

    it('should resolve without error if user owns listing', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });
      await expect(service.validateListingOwnership(1, 1)).resolves.toBeUndefined();
    });

    it('should throw not found if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      await expect(service.validateListingOwnership(1, 999)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // getTierRank
  // ==========================================================================

  describe('getTierRank', () => {
    it('should return correct rank for each tier', () => {
      expect(service.getTierRank('essentials')).toBe(0);
      expect(service.getTierRank('plus')).toBe(1);
      expect(service.getTierRank('preferred')).toBe(2);
      expect(service.getTierRank('premium')).toBe(3);
    });

    it('should return -1 for unknown tier', () => {
      expect(service.getTierRank('unknown')).toBe(-1);
    });
  });

  // ==========================================================================
  // getSubscriptionForListing
  // ==========================================================================

  describe('getSubscriptionForListing', () => {
    it('should return null if no active subscription', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      const result = await service.getSubscriptionForListing(1);
      expect(result).toBeNull();
    });

    it('should return mapped subscription if active subscription exists', async () => {
      const mockRow = {
        id: 1,
        listing_id: 1,
        plan_id: 1,
        plan_version: 1,
        started_at: '2026-01-01T00:00:00Z',
        renews_at: '2026-04-01T00:00:00Z',
        is_grandfathered: 0,
        override_features: null,
        status: 'active' as const,
        stripe_subscription_id: null,
        stripe_price_id: null,
        next_billing_date: null,
        failed_payment_count: 0,
        pending_tier_change: null,
        billing_cycle: 'monthly' as const,
        cancel_at_period_end: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await service.getSubscriptionForListing(1);
      expect(result).not.toBeNull();
      expect(result?.listing_id).toBe(1);
    });
  });

  // ==========================================================================
  // getTransactionsForUser
  // ==========================================================================

  describe('getTransactionsForUser', () => {
    it('should return paginated transactions with total', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 0n }] }) // COUNT
        .mockResolvedValueOnce({ rows: [] });              // SELECT rows
      const result = await service.getTransactionsForUser(1);
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(0);
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});
