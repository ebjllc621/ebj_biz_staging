/**
 * Offer API Routes - Integration Tests
 *
 * @tier ENTERPRISE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests public offer API endpoints with mocked services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../route';

// Mock OfferService
vi.mock('@/core/services/OfferService', () => ({
  OfferService: {
    getInstance: vi.fn(() => ({
      getOffers: vi.fn(),
      getOfferBySlug: vi.fn(),
      claimOffer: vi.fn(),
      getAnalytics: vi.fn(),
      recordShare: vi.fn(),
      getSocialProof: vi.fn(),
      getActiveFlashOffers: vi.fn(),
      getNearbyOffers: vi.fn(),
      saveAsTemplate: vi.fn(),
      getReviews: vi.fn(),
      submitReview: vi.fn(),
    })),
  },
}));

describe('Offer API Routes', () => {
  let mockOfferService: any;

  beforeEach(() => {
    const { OfferService } = require('@/core/services/OfferService');
    mockOfferService = OfferService.getInstance();
    vi.clearAllMocks();
  });

  describe('GET /api/offers', () => {
    it('returns paginated offers list', async () => {
      mockOfferService.getOffers.mockResolvedValueOnce({
        items: [
          { id: 1, title: 'Offer 1' },
          { id: 2, title: 'Offer 2' },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      });

      const request = new Request('http://localhost/api/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(20);
    });

    it('supports pagination parameters', async () => {
      mockOfferService.getOffers.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
      });

      const request = new Request('http://localhost/api/offers?page=2&pageSize=10');
      await GET(request);

      expect(mockOfferService.getOffers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 })
      );
    });

    it('supports search query', async () => {
      const request = new Request('http://localhost/api/offers?q=summer');
      await GET(request);

      expect(mockOfferService.getOffers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'summer' })
      );
    });

    it('supports offer type filter', async () => {
      const request = new Request('http://localhost/api/offers?offerType=discount');
      await GET(request);

      expect(mockOfferService.getOffers).toHaveBeenCalledWith(
        expect.objectContaining({ offerType: 'discount' })
      );
    });
  });

  describe('GET /api/offers?flash=true', () => {
    it('returns only flash offers', async () => {
      mockOfferService.getActiveFlashOffers.mockResolvedValueOnce([
        { id: 1, title: 'Flash Sale', is_flash: true },
      ]);

      const request = new Request('http://localhost/api/offers?flash=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offers).toHaveLength(1);
      expect(data.offers[0].is_flash).toBe(true);
    });
  });

  describe('GET /api/offers/[slug]', () => {
    it('returns offer by slug', async () => {
      mockOfferService.getOfferBySlug.mockResolvedValueOnce({
        id: 1,
        slug: 'summer-sale',
        title: 'Summer Sale',
      });

      const request = new Request('http://localhost/api/offers/summer-sale');
      const response = await GET(request, { params: { slug: 'summer-sale' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe('summer-sale');
    });

    it('returns 404 for non-existent offer', async () => {
      mockOfferService.getOfferBySlug.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/offers/non-existent');
      const response = await GET(request, { params: { slug: 'non-existent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/offers/[id]/claim', () => {
    it('claims offer for authenticated user', async () => {
      mockOfferService.claimOffer.mockResolvedValueOnce(1);

      const request = new Request('http://localhost/api/offers/1/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.claimId).toBe(1);
    });

    it('returns 401 for unauthenticated user', async () => {
      const request = new Request('http://localhost/api/offers/1/claim', {
        method: 'POST',
      });

      const response = await POST(request, { params: { id: '1' } });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/offers/[id]/analytics', () => {
    it('returns offer analytics', async () => {
      mockOfferService.getAnalytics.mockResolvedValueOnce({
        views: 1000,
        claims: 150,
        shares: 30,
        conversionRate: 15.0,
      });

      const request = new Request('http://localhost/api/offers/1/analytics');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.views).toBe(1000);
      expect(data.conversionRate).toBe(15.0);
    });
  });

  describe('POST /api/offers/[id]/shares', () => {
    it('records share event', async () => {
      mockOfferService.recordShare.mockResolvedValueOnce(1);

      const request = new Request('http://localhost/api/offers/1/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'facebook' }),
      });

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shareId).toBe(1);
    });
  });

  describe('GET /api/offers/[id]/social-proof', () => {
    it('returns social proof data', async () => {
      mockOfferService.getSocialProof.mockResolvedValueOnce({
        isTrending: true,
        recentClaimsCount: 15,
        connectionsClaimed: 3,
      });

      const request = new Request('http://localhost/api/offers/1/social-proof');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isTrending).toBe(true);
      expect(data.recentClaimsCount).toBe(15);
    });
  });

  describe('GET /api/offers/flash', () => {
    it('returns active flash offers', async () => {
      mockOfferService.getActiveFlashOffers.mockResolvedValueOnce([
        { id: 1, title: 'Flash 1' },
        { id: 2, title: 'Flash 2' },
      ]);

      const request = new Request('http://localhost/api/offers/flash');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offers).toHaveLength(2);
    });

    it('supports limit parameter', async () => {
      const request = new Request('http://localhost/api/offers/flash?limit=5');
      await GET(request);

      expect(mockOfferService.getActiveFlashOffers).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('GET /api/offers/nearby', () => {
    it('returns nearby offers based on location', async () => {
      mockOfferService.getNearbyOffers.mockResolvedValueOnce([
        { id: 1, title: 'Nearby Offer', distance: 0.5 },
      ]);

      const request = new Request(
        'http://localhost/api/offers/nearby?lat=47.6062&lng=-122.3321&radius=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.offers).toHaveLength(1);
    });
  });

  describe('POST /api/offers/[id]/save-as-template', () => {
    it('saves offer as template', async () => {
      mockOfferService.saveAsTemplate.mockResolvedValueOnce(1);

      const request = new Request('http://localhost/api/offers/1/save-as-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Template' }),
      });

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templateId).toBe(1);
    });
  });

  describe('GET /api/offers/[id]/reviews', () => {
    it('returns offer reviews', async () => {
      mockOfferService.getReviews.mockResolvedValueOnce([
        { id: 1, rating: 5, comment: 'Great!' },
        { id: 2, rating: 4, comment: 'Good' },
      ]);

      const request = new Request('http://localhost/api/offers/1/reviews');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviews).toHaveLength(2);
    });
  });

  describe('POST /api/offers/[id]/reviews', () => {
    it('submits review', async () => {
      mockOfferService.submitReview.mockResolvedValueOnce(1);

      const request = new Request('http://localhost/api/offers/1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment: 'Excellent!' }),
      });

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviewId).toBe(1);
    });
  });

  describe('GET /api/bundles', () => {
    it('returns available bundles', async () => {
      mockOfferService.getBundles.mockResolvedValueOnce([
        { id: 1, name: 'Bundle 1', offer_ids: [1, 2] },
      ]);

      const request = new Request('http://localhost/api/bundles');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bundles).toHaveLength(1);
    });
  });
});
