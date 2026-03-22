/**
 * Admin Offer API Routes - Integration Tests
 *
 * @tier ENTERPRISE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests admin offer API endpoints with authentication and authorization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '../../route';

// Mock OfferService
vi.mock('@/core/services/OfferService');

// Mock authentication
vi.mock('@/core/utils/session-helpers', () => ({
  getUserFromRequest: vi.fn(),
}));

describe('Admin Offer API Routes', () => {
  let mockOfferService: any;
  let mockGetUser: any;

  beforeEach(() => {
    const { OfferService } = require('@/core/services/OfferService');
    mockOfferService = OfferService.getInstance();

    const { getUserFromRequest } = require('@/core/utils/session-helpers');
    mockGetUser = getUserFromRequest;

    vi.clearAllMocks();
  });

  describe('authentication requirement', () => {
    it('returns 401 when user not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/admin/offers');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
      mockGetUser.mockResolvedValueOnce({ id: 1, role: 'user' });

      const request = new Request('http://localhost/api/admin/offers');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/offers', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValueOnce({ id: 1, role: 'admin' });
    });

    it('returns all offers including non-active for admin', async () => {
      mockOfferService.getOffers.mockResolvedValueOnce({
        items: [
          { id: 1, title: 'Active Offer', status: 'active' },
          { id: 2, title: 'Draft Offer', status: 'draft' },
          { id: 3, title: 'Deleted Offer', status: 'deleted' },
        ],
        total: 3,
      });

      const request = new Request('http://localhost/api/admin/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(3);
    });

    it('supports filtering by status', async () => {
      mockOfferService.getOffers.mockResolvedValueOnce({
        items: [{ id: 1, status: 'draft' }],
        total: 1,
      });

      const request = new Request('http://localhost/api/admin/offers?status=draft');
      await GET(request);

      expect(mockOfferService.getOffers).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('supports filtering by listing', async () => {
      const request = new Request('http://localhost/api/admin/offers?listingId=5');
      await GET(request);

      expect(mockOfferService.getOffers).toHaveBeenCalledWith(
        expect.objectContaining({ listingId: 5 })
      );
    });
  });

  describe('POST /api/admin/offers', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValueOnce({ id: 1, role: 'admin' });
    });

    it('creates new offer', async () => {
      mockOfferService.createOffer.mockResolvedValueOnce(1);

      const request = new Request('http://localhost/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: 1,
          title: 'New Admin Offer',
          offer_type: 'discount',
          discount_percentage: 30,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.offerId).toBe(1);
    });

    it('validates required fields', async () => {
      const request = new Request('http://localhost/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Missing Fields' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/admin/offers/[id]', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValueOnce({ id: 1, role: 'admin' });
    });

    it('updates existing offer', async () => {
      mockOfferService.updateOffer.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/admin/offers/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Title',
          discount_percentage: 25,
        }),
      });

      const response = await PUT(request, { params: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockOfferService.updateOffer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: 'Updated Title' })
      );
    });

    it('returns 404 when offer not found', async () => {
      mockOfferService.updateOffer.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/admin/offers/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Update' }),
      });

      const response = await PUT(request, { params: { id: '999' } });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/offers/[id]', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValueOnce({ id: 1, role: 'admin' });
    });

    it('soft deletes offer', async () => {
      mockOfferService.deleteOffer.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/admin/offers/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockOfferService.deleteOffer).toHaveBeenCalledWith(1);
    });

    it('returns 404 when offer not found', async () => {
      mockOfferService.deleteOffer.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/admin/offers/999', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: '999' } });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/admin/offers/analytics', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValueOnce({ id: 1, role: 'admin' });
    });

    it('returns system-wide offer analytics', async () => {
      mockOfferService.getSystemAnalytics.mockResolvedValueOnce({
        totalOffers: 150,
        activeOffers: 120,
        totalClaims: 5000,
        totalShares: 800,
        avgConversionRate: 18.5,
      });

      const request = new Request('http://localhost/api/admin/offers/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalOffers).toBe(150);
      expect(data.avgConversionRate).toBe(18.5);
    });
  });
});
