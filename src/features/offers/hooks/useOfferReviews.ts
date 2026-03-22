/**
 * useOfferReviews - Hook for offer reviews management
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { OfferReview, ReviewSummary } from '@features/offers/types';

interface UseOfferReviewsOptions {
  offerId: number;
  autoLoad?: boolean;
}

interface CreateReviewData {
  claim_id: number;
  rating: number;
  comment?: string;
}

interface UseOfferReviewsReturn {
  reviews: OfferReview[];
  summary: ReviewSummary | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  fetchReviews: (pageNum?: number) => Promise<void>;
  createReview: (data: CreateReviewData) => Promise<OfferReview | null>;
  canReview: (claimId: number) => Promise<boolean>;
  loadMore: () => Promise<void>;
}

export function useOfferReviews({
  offerId,
  autoLoad = true,
}: UseOfferReviewsOptions): UseOfferReviewsReturn {
  const [reviews, setReviews] = useState<OfferReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });

      const response = await fetch(`/api/offers/${offerId}/reviews?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();

      if (pageNum === 1) {
        setReviews(data.reviews || []);
      } else {
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      }

      setSummary(data.summary || null);
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  const createReview = useCallback(async (
    data: CreateReviewData
  ): Promise<OfferReview | null> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create review');
      }

      const result = await response.json();
      await fetchReviews(1);
      return result.review;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [offerId, fetchReviews]);

  const canReview = useCallback(async (claimId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/claims/${claimId}/can-review`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.canReview || false;
    } catch {
      return false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchReviews(page + 1);
  }, [hasMore, loading, page, fetchReviews]);

  useEffect(() => {
    if (autoLoad && offerId) {
      fetchReviews(1);
    }
  }, [autoLoad, offerId, fetchReviews]);

  return {
    reviews,
    summary,
    loading,
    error,
    hasMore,
    page,
    fetchReviews,
    createReview,
    canReview,
    loadMore,
  };
}
