/**
 * OfferService - Integration Tests
 *
 * @tier ENTERPRISE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests OfferService methods with mocked database layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfferService } from '../OfferService';

// Mock DatabaseService
vi.mock('../DatabaseService', () => ({
  DatabaseService: {
    getInstance: vi.fn(() => ({
      query: vi.fn(),
      execute: vi.fn(),
    })),
  },
}));

describe('OfferService Integration Tests', () => {
  let offerService: OfferService;
  let mockDbQuery: any;
  let mockDbExecute: any;

  beforeEach(() => {
    offerService = OfferService.getInstance();
    const { DatabaseService } = require('../DatabaseService');
    const dbInstance = DatabaseService.getInstance();
    mockDbQuery = dbInstance.query;
    mockDbExecute = dbInstance.execute;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOfferBySlug', () => {
    it('retrieves offer by slug with full details', async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 1,
          slug: 'summer-sale',
          title: 'Summer Sale',
          listing_id: 1,
          status: 'active',
        },
      ]);

      const offer = await offerService.getOfferBySlug('summer-sale');

      expect(offer).toBeDefined();
      expect(offer.slug).toBe('summer-sale');
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE slug = ?'),
        ['summer-sale']
      );
    });

    it('returns null for non-existent slug', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      const offer = await offerService.getOfferBySlug('non-existent');

      expect(offer).toBeNull();
    });
  });

  describe('createOffer', () => {
    it('creates new offer with valid data', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const offerData = {
        listing_id: 1,
        title: 'New Offer',
        offer_type: 'discount',
        discount_percentage: 20,
      };

      const offerId = await offerService.createOffer(offerData);

      expect(offerId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offers'),
        expect.arrayContaining([1, 'New Offer', 'discount', 20])
      );
    });

    it('generates slug from title', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      await offerService.createOffer({
        listing_id: 1,
        title: 'Summer Sale 2026',
        offer_type: 'discount',
      });

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['summer-sale-2026'])
      );
    });
  });

  describe('updateOffer', () => {
    it('updates offer fields', async () => {
      mockDbExecute.mockResolvedValueOnce({ affectedRows: 1 });

      const success = await offerService.updateOffer(1, {
        title: 'Updated Title',
        discount_percentage: 25,
      });

      expect(success).toBe(true);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE offers SET'),
        expect.any(Array)
      );
    });

    it('returns false when offer not found', async () => {
      mockDbExecute.mockResolvedValueOnce({ affectedRows: 0 });

      const success = await offerService.updateOffer(999, { title: 'Test' });

      expect(success).toBe(false);
    });
  });

  describe('deleteOffer', () => {
    it('soft deletes offer by setting status to deleted', async () => {
      mockDbExecute.mockResolvedValueOnce({ affectedRows: 1 });

      const success = await offerService.deleteOffer(1);

      expect(success).toBe(true);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'deleted'"),
        [1]
      );
    });
  });

  describe('claimOffer', () => {
    it('creates claim record for user', async () => {
      mockDbQuery.mockResolvedValueOnce([{ id: 1, quantity_remaining: 10 }]);
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const claimId = await offerService.claimOffer(1, 123);

      expect(claimId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offer_claims'),
        expect.arrayContaining([1, 123])
      );
    });

    it('decrements quantity_remaining', async () => {
      mockDbQuery.mockResolvedValueOnce([{ id: 1, quantity_remaining: 10 }]);
      mockDbExecute
        .mockResolvedValueOnce({ insertId: 1 })
        .mockResolvedValueOnce({ affectedRows: 1 });

      await offerService.claimOffer(1, 123);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE offers SET quantity_remaining'),
        expect.any(Array)
      );
    });

    it('throws error when quantity exhausted', async () => {
      mockDbQuery.mockResolvedValueOnce([{ id: 1, quantity_remaining: 0 }]);

      await expect(offerService.claimOffer(1, 123)).rejects.toThrow(
        'Offer quantity exhausted'
      );
    });
  });

  describe('recordShare', () => {
    it('records share event with platform', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const shareId = await offerService.recordShare(1, 123, 'facebook');

      expect(shareId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offer_shares'),
        expect.arrayContaining([1, 123, 'facebook'])
      );
    });
  });

  describe('getShareAnalytics', () => {
    it('returns share counts by platform', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { platform: 'facebook', count: 10 },
        { platform: 'twitter', count: 5 },
      ]);

      const analytics = await offerService.getShareAnalytics(1);

      expect(analytics).toHaveLength(2);
      expect(analytics[0].platform).toBe('facebook');
      expect(analytics[0].count).toBe(10);
    });
  });

  describe('getAnalyticsFunnel', () => {
    it('returns funnel conversion metrics', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { views: 1000, claims: 150, shares: 30 },
      ]);

      const funnel = await offerService.getAnalyticsFunnel(1);

      expect(funnel.views).toBe(1000);
      expect(funnel.claims).toBe(150);
      expect(funnel.conversionRate).toBe(15.0);
    });
  });

  describe('saveAsTemplate', () => {
    it('creates template from offer', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { id: 1, title: 'Offer', offer_type: 'discount', discount_percentage: 20 },
      ]);
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const templateId = await offerService.saveAsTemplate(1, 'My Template');

      expect(templateId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offer_templates'),
        expect.arrayContaining(['My Template'])
      );
    });
  });

  describe('loadTemplate', () => {
    it('creates offer from template', async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 1,
          template_data: JSON.stringify({ title: 'Template Offer', offer_type: 'discount' }),
        },
      ]);
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const offerId = await offerService.loadTemplate(1, 1);

      expect(offerId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offers'),
        expect.any(Array)
      );
    });
  });

  describe('createFlashOffer', () => {
    it('creates flash offer with expiration', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const offerId = await offerService.createFlashOffer({
        listing_id: 1,
        title: 'Flash Sale',
        duration_minutes: 60,
      });

      expect(offerId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('is_flash = 1'),
        expect.any(Array)
      );
    });
  });

  describe('getActiveFlashOffers', () => {
    it('returns only active flash offers', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { id: 1, title: 'Flash 1', is_flash: true },
        { id: 2, title: 'Flash 2', is_flash: true },
      ]);

      const offers = await offerService.getActiveFlashOffers();

      expect(offers).toHaveLength(2);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_flash = 1'),
        expect.any(Array)
      );
    });
  });

  describe('addGeoTrigger', () => {
    it('adds geo-fence trigger to offer', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const triggerId = await offerService.addGeoTrigger(1, {
        latitude: 47.6062,
        longitude: -122.3321,
        radius: 5,
      });

      expect(triggerId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offer_geo_triggers'),
        expect.arrayContaining([1, 47.6062, -122.3321, 5])
      );
    });
  });

  describe('getSocialProofData', () => {
    it('returns social proof metrics', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { claims_today: 15, total_claims: 100, connection_claims: 3 },
      ]);

      const socialProof = await offerService.getSocialProofData(1);

      expect(socialProof.claimsToday).toBe(15);
      expect(socialProof.totalClaims).toBe(100);
      expect(socialProof.connectionsClaimed).toBe(3);
    });
  });

  describe('getUserLoyalty', () => {
    it('calculates user loyalty tier and points', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { total_claims: 10, total_spent: 500 },
      ]);

      const loyalty = await offerService.getUserLoyalty(123);

      expect(loyalty.tier).toBeDefined();
      expect(loyalty.points).toBeGreaterThan(0);
    });
  });

  describe('submitReview', () => {
    it('creates review for offer', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const reviewId = await offerService.submitReview(1, 123, {
        rating: 5,
        comment: 'Great offer!',
      });

      expect(reviewId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offer_reviews'),
        expect.arrayContaining([1, 123, 5, 'Great offer!'])
      );
    });
  });

  describe('createABTest', () => {
    it('creates A/B test configuration', async () => {
      mockDbExecute.mockResolvedValueOnce({ insertId: 1 });

      const testId = await offerService.createABTest(1, {
        variantA: { title: 'Original' },
        variantB: { title: 'Variant' },
        trafficSplit: 50,
      });

      expect(testId).toBe(1);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offer_ab_tests'),
        expect.any(Array)
      );
    });
  });

  describe('markForOfflineCache', () => {
    it('marks offer for offline availability', async () => {
      mockDbExecute.mockResolvedValueOnce({ affectedRows: 1 });

      const success = await offerService.markForOfflineCache(1);

      expect(success).toBe(true);
      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE offers SET offline_cache'),
        [1]
      );
    });
  });

  describe('verifyRedemptionCode', () => {
    it('verifies valid redemption code', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { id: 1, code: 'ABC123', used: false },
      ]);

      const isValid = await offerService.verifyRedemptionCode(1, 'ABC123');

      expect(isValid).toBe(true);
    });

    it('rejects used redemption code', async () => {
      mockDbQuery.mockResolvedValueOnce([
        { id: 1, code: 'ABC123', used: true },
      ]);

      const isValid = await offerService.verifyRedemptionCode(1, 'ABC123');

      expect(isValid).toBe(false);
    });
  });
});
