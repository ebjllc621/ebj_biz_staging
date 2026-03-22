/**
 * useOfferReviews - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfferReviews } from '../useOfferReviews';

global.fetch = vi.fn();

const mockReviews = [
  { id: 1, rating: 5, comment: 'Great!' },
  { id: 2, rating: 4, comment: 'Good' },
];

describe('useOfferReviews', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('fetching reviews', () => {
    it('fetches reviews on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviews: mockReviews, summary: { averageRating: 4.5 } }),
      });

      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.reviews).toEqual(mockReviews);
      });
    });

    it('does not fetch when autoLoad is false', () => {
      renderHook(() => useOfferReviews({ offerId: 1, autoLoad: false }));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed');
      });
    });

    it('fetches summary with reviews', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviews: [], summary: { averageRating: 4.5, totalCount: 10 } }),
      });

      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.summary).toEqual({ averageRating: 4.5, totalCount: 10 });
      });
    });
  });

  describe('creating reviews', () => {
    it('creates review successfully', async () => {
      const newReview = { id: 3, rating: 5, comment: 'Awesome!' };
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ review: newReview }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reviews: [...mockReviews, newReview] }),
        });

      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: false }));

      let review;
      await act(async () => {
        review = await result.current.createReview({ claim_id: 1, rating: 5, comment: 'Awesome!' });
      });

      expect(review).toEqual(newReview);
    });

    it('handles create review errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: false }));

      let review;
      await act(async () => {
        review = await result.current.createReview({ claim_id: 1, rating: 5 });
      });

      expect(review).toBeNull();
      expect(result.current.error).toBe('Create failed');
    });
  });

  describe('pagination', () => {
    it('loads more reviews when hasMore is true', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reviews: mockReviews, hasMore: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reviews: [{ id: 3, rating: 3 }], hasMore: false }),
        });

      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: true }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.reviews).toHaveLength(3);
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useOfferReviews({ offerId: 1, autoLoad: false }));

      expect(result.current).toHaveProperty('reviews');
      expect(result.current).toHaveProperty('summary');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('page');
      expect(result.current).toHaveProperty('fetchReviews');
      expect(result.current).toHaveProperty('createReview');
      expect(result.current).toHaveProperty('canReview');
      expect(result.current).toHaveProperty('loadMore');
    });
  });
});
