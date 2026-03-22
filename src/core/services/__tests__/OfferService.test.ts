/**
 * OfferService Test Suite
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary testing
 * - Business rule validation
 * - Error handling verification
 *
 * @authority Phase 4 Brain Plan - Task 4.3: OfferService Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfferService, OfferType, OfferStatus } from '../OfferService';
import { DatabaseService } from '../DatabaseService';
import { ListingService } from '../ListingService';
import type { DbResult } from '@core/types/db';

// Mock DatabaseService
const mockDb = {
  query: vi.fn(),
  transaction: vi.fn()
} as unknown as DatabaseService;

// Mock ListingService
const mockListingService = {
  getById: vi.fn(),
  canAddOffer: vi.fn()
} as unknown as ListingService;

describe('OfferService', () => {
  let service: OfferService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OfferService(mockDb, mockListingService);
  });

  // ==========================================================================
  // READ Operations Tests
  // ==========================================================================

  describe('getAll', () => {
    it('should get all offers with pagination', async () => {
      const mockOffers = [
        {
          id: 1,
          listing_id: 1,
          title: 'Test Offer',
          slug: 'test-offer',
          offer_type: 'discount',
          start_date: new Date('2025-12-06'),
          end_date: new Date('2025-12-31'),
          status: 'active',
          max_per_user: 1,
          redemption_count: 0,
          is_featured: 0,
          is_mock: 0,
          view_count: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] } as DbResult<unknown>)
        .mockResolvedValueOnce({ rows: mockOffers } as DbResult<unknown>);

      const result = await service.getAll();

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by listing ID', async () => {
      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 0 }] } as DbResult<unknown>)
        .mockResolvedValueOnce({ rows: [] } as DbResult<unknown>);

      await service.getAll({ listingId: 1 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('listing_id = ?'),
        expect.arrayContaining([1])
      );
    });

    it('should filter active offers', async () => {
      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 0 }] } as DbResult<unknown>)
        .mockResolvedValueOnce({ rows: [] } as DbResult<unknown>);

      await service.getAll({ isActive: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = ?"),
        expect.arrayContaining(['active'])
      );
    });
  });

  describe('getById', () => {
    it('should get offer by ID', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date('2025-12-06'),
        end_date: new Date('2025-12-31'),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [mockOffer]
      } as DbResult<unknown>);

      const result = await service.getById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM offers WHERE id = ?',
        [1]
      );
    });

    it('should return null for non-existent offer', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: []
      } as DbResult<unknown>);

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('should get offer by slug', async () => {
      const mockOffer = {
        id: 1,
        slug: 'test-offer',
        listing_id: 1,
        title: 'Test Offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date(),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [mockOffer]
      } as DbResult<unknown>);

      const result = await service.getBySlug('test-offer');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('test-offer');
    });
  });

  describe('getByListingId', () => {
    it('should get all offers for a listing', async () => {
      const mockOffers = [
        { id: 1, listing_id: 1, title: 'Offer 1', slug: 'offer-1', offer_type: 'discount', start_date: new Date(), end_date: new Date(), status: 'active', max_per_user: 1, redemption_count: 0, is_featured: 0, is_mock: 0, view_count: 0, created_at: new Date(), updated_at: new Date() },
        { id: 2, listing_id: 1, title: 'Offer 2', slug: 'offer-2', offer_type: 'coupon', start_date: new Date(), end_date: new Date(), status: 'active', max_per_user: 1, redemption_count: 0, is_featured: 0, is_mock: 0, view_count: 0, created_at: new Date(), updated_at: new Date() }
      ];

      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: mockOffers
      } as DbResult<unknown>);

      const result = await service.getByListingId(1);

      expect(result).toHaveLength(2);
      expect(result[0].listing_id).toBe(1);
    });
  });

  describe('getActive', () => {
    it('should get only active offers', async () => {
      const mockOffers = [
        { id: 1, listing_id: 1, title: 'Active Offer', slug: 'active-offer', offer_type: 'discount', start_date: new Date(), end_date: new Date('2025-12-31'), status: 'active', max_per_user: 1, redemption_count: 0, is_featured: 0, is_mock: 0, view_count: 0, created_at: new Date(), updated_at: new Date() }
      ];

      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: mockOffers
      } as DbResult<unknown>);

      const result = await service.getActive();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        undefined
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getExpiring', () => {
    it('should get offers expiring within specified days', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: []
      } as DbResult<unknown>);

      await service.getExpiring(7);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DATE_ADD(NOW(), INTERVAL ? DAY)'),
        [7]
      );
    });
  });

  // ==========================================================================
  // WRITE Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new offer', async () => {
      const mockListing = { id: 1, tier: 'essential' as const };
      (mockListingService.getById as vi.Mock).mockResolvedValue(mockListing);

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [{ count: 0 }] } as DbResult<unknown>) // Tier check
        .mockResolvedValueOnce({ rows: [] } as DbResult<unknown>) // Slug check
        .mockResolvedValueOnce({ insertId: 1 } as DbResult<unknown>) // Insert
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            listing_id: 1,
            title: 'New Offer',
            slug: 'new-offer',
            offer_type: 'discount',
            start_date: new Date('2025-12-06'),
            end_date: new Date('2025-12-31'),
            status: 'draft',
            max_per_user: 1,
            redemption_count: 0,
            is_featured: 0,
            is_mock: 0,
            view_count: 0,
            created_at: new Date(),
            updated_at: new Date()
          }]
        } as DbResult<unknown>); // Get created

      const result = await service.create(1, {
        title: 'New Offer',
        offer_type: OfferType.DISCOUNT,
        start_date: new Date('2025-12-06'),
        end_date: new Date('2025-12-31'),
        discount_percentage: 20
      });

      expect(result.id).toBe(1);
      expect(result.title).toBe('New Offer');
    });

    it('should reject invalid dates', async () => {
      const mockListing = { id: 1, tier: 'essential' as const };
      (mockListingService.getById as vi.Mock).mockResolvedValue(mockListing);
      (mockDb.query as vi.Mock).mockResolvedValue({ rows: [{ count: 0 }] } as DbResult<unknown>);

      await expect(
        service.create(1, {
          title: 'Invalid Offer',
          offer_type: OfferType.DISCOUNT,
          start_date: new Date('2025-12-31'),
          end_date: new Date('2025-12-06') // End before start
        })
      ).rejects.toThrow('Invalid offer dates');
    });

    it('should reject both discount and sale price', async () => {
      const mockListing = { id: 1, tier: 'essential' as const };
      (mockListingService.getById as vi.Mock).mockResolvedValue(mockListing);
      (mockDb.query as vi.Mock).mockResolvedValue({ rows: [{ count: 0 }] } as DbResult<unknown>);

      await expect(
        service.create(1, {
          title: 'Invalid Offer',
          offer_type: OfferType.DISCOUNT,
          start_date: new Date('2025-12-06'),
          end_date: new Date('2025-12-31'),
          discount_percentage: 20,
          sale_price: 99.99
        })
      ).rejects.toThrow('Invalid pricing');
    });

    it('should enforce tier limits', async () => {
      const mockListing = { id: 1, tier: 'essential' as const };
      (mockListingService.getById as vi.Mock).mockResolvedValue(mockListing);
      (mockDb.query as vi.Mock).mockResolvedValue({ rows: [{ count: 4 }] } as DbResult<unknown>); // At limit

      await expect(
        service.create(1, {
          title: 'Excess Offer',
          offer_type: OfferType.DISCOUNT,
          start_date: new Date('2025-12-06'),
          end_date: new Date('2025-12-31')
        })
      ).rejects.toThrow('Tier limit exceeded');
    });
  });

  describe('update', () => {
    it('should update an offer', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Old Title',
        slug: 'old-title',
        offer_type: 'discount',
        start_date: new Date('2025-12-06'),
        end_date: new Date('2025-12-31'),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        discount_percentage: 10,
        sale_price: null,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get existing
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>) // Update
        .mockResolvedValueOnce({
          rows: [{ ...mockOffer, title: 'New Title' }]
        } as DbResult<unknown>); // Get updated

      const result = await service.update(1, { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });

    it('should throw error for non-existent offer', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({ rows: [] } as DbResult<unknown>);

      await expect(service.update(999, { title: 'Test' })).rejects.toThrow(
        'Offer not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete an offer', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date(),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>); // Delete

      await service.delete(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM offers WHERE id = ?',
        [1]
      );
    });
  });

  describe('pause and resume', () => {
    it('should pause an offer', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date('2025-12-31'),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        discount_percentage: 10,
        sale_price: null,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>) // Update
        .mockResolvedValueOnce({
          rows: [{ ...mockOffer, status: 'paused' }]
        } as DbResult<unknown>); // Get updated

      const result = await service.pause(1);

      expect(result.status).toBe(OfferStatus.PAUSED);
    });

    it('should resume a paused offer', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date('2025-12-31'),
        status: 'paused',
        max_per_user: 1,
        redemption_count: 0,
        quantity_remaining: 10,
        discount_percentage: 10,
        sale_price: null,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get again for resume
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>) // Update
        .mockResolvedValueOnce({
          rows: [{ ...mockOffer, status: 'active' }]
        } as DbResult<unknown>); // Get updated

      const result = await service.resume(1);

      expect(result.status).toBe(OfferStatus.ACTIVE);
    });
  });

  // ==========================================================================
  // REDEMPTION Operations Tests
  // ==========================================================================

  describe('redeem', () => {
    it('should redeem an offer', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date('2025-12-01'),
        end_date: new Date('2025-12-31'),
        status: 'active',
        max_per_user: 3,
        redemption_count: 0,
        quantity_remaining: 10,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // canRedeem check
        .mockResolvedValueOnce({ rows: [{ count: 0 }] } as DbResult<unknown>) // User redemption count
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>); // Get offer

      (mockDb.transaction as vi.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ insertId: 1 } as DbResult<unknown>) // Insert redemption
            .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>) // Update stats
            .mockResolvedValueOnce({
              rows: [
                {
                  id: 1,
                  offer_id: 1,
                  user_id: 1,
                  redeemed_at: new Date(),
                  redemption_code: null
                }
              ]
            } as DbResult<unknown>) // Get redemption
        };
        return callback(mockClient as unknown);
      });

      const result = await service.redeem(1, 1);

      expect(result.offer_id).toBe(1);
      expect(result.user_id).toBe(1);
    });
  });

  describe('canRedeem', () => {
    it('should return true if user can redeem', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date('2025-12-01'),
        end_date: new Date('2025-12-31'),
        status: 'active',
        max_per_user: 3,
        redemption_count: 0,
        quantity_remaining: 10,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get offer
        .mockResolvedValueOnce({ rows: [{ count: 0 }] } as DbResult<unknown>); // User redemption count

      const result = await service.canRedeem(1, 1);

      expect(result.canRedeem).toBe(true);
      expect(result.remainingRedemptions).toBe(3);
    });

    it('should return false if offer expired', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [mockOffer]
      } as DbResult<unknown>);

      const result = await service.canRedeem(1, 1);

      expect(result.canRedeem).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should return false if user reached redemption limit', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date('2025-12-01'),
        end_date: new Date('2025-12-31'),
        status: 'active',
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get offer
        .mockResolvedValueOnce({ rows: [{ count: 1 }] } as DbResult<unknown>); // User redemption count

      const result = await service.canRedeem(1, 1);

      expect(result.canRedeem).toBe(false);
      expect(result.reason).toContain('limit');
    });
  });

  describe('getRedemptionCount', () => {
    it('should get total redemption count', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [{ count: 5 }]
      } as DbResult<unknown>);

      const result = await service.getRedemptionCount(1);

      expect(result).toBe(5);
    });

    it('should get user-specific redemption count', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [{ count: 2 }]
      } as DbResult<unknown>);

      const result = await service.getRedemptionCount(1, 1);

      expect(result).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND user_id = ?'),
        [1, 1]
      );
    });
  });

  // ==========================================================================
  // TIER ENFORCEMENT Tests
  // ==========================================================================

  describe('checkOfferLimit', () => {
    it('should check tier limits correctly', async () => {
      const mockListing = { id: 1, tier: 'essential' as const };
      (mockListingService.getById as vi.Mock).mockResolvedValue(mockListing);
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [{ count: 2 }]
      } as DbResult<unknown>);

      const result = await service.checkOfferLimit(1);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(4);
      expect(result.tier).toBe('essential');
    });

    it('should return false when limit exceeded', async () => {
      const mockListing = { id: 1, tier: 'essential' as const };
      (mockListingService.getById as vi.Mock).mockResolvedValue(mockListing);
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [{ count: 4 }]
      } as DbResult<unknown>);

      const result = await service.checkOfferLimit(1);

      expect(result.allowed).toBe(false);
    });
  });

  // ==========================================================================
  // UTILITY Tests
  // ==========================================================================

  describe('generateSlug', () => {
    it('should generate URL-safe slug', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: []
      } as DbResult<unknown>);

      const result = await service.generateSlug('Test Offer 20% OFF!');

      expect(result).toBe('test-offer-20-off');
    });

    it('should ensure uniqueness by appending counter', async () => {
      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [{ slug: 'test-offer' }] } as DbResult<unknown>) // First exists
        .mockResolvedValueOnce({ rows: [] } as DbResult<unknown>); // Second doesn't

      const result = await service.generateSlug('Test Offer');

      expect(result).toBe('test-offer-1');
    });
  });

  describe('expireExpiredOffers', () => {
    it('should expire all expired offers', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rowCount: 3
      } as DbResult<unknown>);

      const result = await service.expireExpiredOffers();

      expect(result).toBe(3);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'expired'"),
        undefined
      );
    });
  });

  describe('updateInventory', () => {
    it('should update quantity_remaining', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date(),
        status: 'active',
        quantity_remaining: 10,
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>); // Update

      await service.updateInventory(1, -2);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE offers SET quantity_remaining = ? WHERE id = ?',
        [8, 1]
      );
    });

    it('should mark sold_out when quantity reaches 0', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date(),
        status: 'active',
        quantity_remaining: 1,
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock)
        .mockResolvedValueOnce({ rows: [mockOffer] } as DbResult<unknown>) // Get
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>) // Update quantity
        .mockResolvedValueOnce({ rowCount: 1 } as DbResult<unknown>); // Update status

      await service.updateInventory(1, -1);

      expect(mockDb.query).toHaveBeenCalledWith(
        "UPDATE offers SET status = 'sold_out' WHERE id = ?",
        [1]
      );
    });

    it('should reject negative inventory', async () => {
      const mockOffer = {
        id: 1,
        listing_id: 1,
        title: 'Test Offer',
        slug: 'test-offer',
        offer_type: 'discount',
        start_date: new Date(),
        end_date: new Date(),
        status: 'active',
        quantity_remaining: 1,
        max_per_user: 1,
        redemption_count: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockDb.query as vi.Mock).mockResolvedValue({
        rows: [mockOffer]
      } as DbResult<unknown>);

      await expect(service.updateInventory(1, -5)).rejects.toThrow(
        'Inventory cannot be negative'
      );
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      (mockDb.query as vi.Mock).mockResolvedValue({
        rowCount: 1
      } as DbResult<unknown>);

      await service.incrementViewCount(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE offers SET view_count = view_count + 1 WHERE id = ?',
        [1]
      );
    });
  });
});
