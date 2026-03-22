'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecommendedConnection, RecommendationOptions } from '../types';
import { ErrorService } from '@core/services/ErrorService';

interface UseRecommendationsResult {
  recommendations: RecommendedConnection[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  recordFeedback: (userId: number, action: 'connected' | 'dismissed' | 'not_interested', notInterestedReason?: string, otherReason?: string) => Promise<void>;
  dismissRecommendation: (userId: number) => void;
}

/**
 * Hook for managing connection recommendations
 *
 * @param options - Recommendation filtering options
 * @param autoLoad - Whether to automatically load on mount (default: true)
 * @returns Recommendation state and control functions
 *
 * @phase ConnectP2 Phase 2
 */
export function useRecommendations(
  options: Omit<RecommendationOptions, 'offset'> = {},
  autoLoad: boolean = true
): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<RecommendedConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  const limit = options.limit || 10;

  /**
   * Load recommendations from API
   */
  const loadRecommendations = useCallback(async (currentOffset: number, append: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
        ...(options.minScore !== undefined && { minScore: options.minScore.toString() }),
        ...(options.industry && { industry: options.industry }),
        ...(options.location && { location: options.location })
      });

      const response = await fetch(`/api/users/connections/recommendations?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load recommendations: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        if (append) {
          setRecommendations(prev => [...prev, ...data.data.recommendations]);
        } else {
          setRecommendations(data.data.recommendations);
        }
        setTotal(data.data.total);
      } else {
        throw new Error(data.message || 'Failed to load recommendations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      ErrorService.capture('[useRecommendations] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, options.minScore, options.industry, options.location]);

  /**
   * Refresh recommendations (reset to first page)
   */
  const refresh = useCallback(async () => {
    setOffset(0);
    await loadRecommendations(0, false);
  }, [loadRecommendations]);

  /**
   * Load more recommendations (pagination)
   */
  const loadMore = useCallback(async () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    await loadRecommendations(newOffset, true);
  }, [offset, limit, loadRecommendations]);

  /**
   * Record feedback for a recommendation
   */
  const recordFeedback = useCallback(async (
    userId: number,
    action: 'connected' | 'dismissed' | 'not_interested',
    notInterestedReason?: string,
    otherReason?: string
  ) => {
    try {
      const body: any = {
        recommended_user_id: userId,
        action
      };

      if (action === 'not_interested') {
        body.not_interested_reason = notInterestedReason;
        if (notInterestedReason === 'other') {
          body.other_reason = otherReason;
        }
      }

      const response = await fetch('/api/users/connections/recommendations/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to record feedback: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to record feedback');
      }
    } catch (err) {
      ErrorService.capture('[useRecommendations] Feedback error:', err);
      throw err;
    }
  }, []);

  /**
   * Dismiss a recommendation (remove from UI and record feedback)
   */
  const dismissRecommendation = useCallback((userId: number) => {
    // Optimistically remove from UI
    setRecommendations(prev => prev.filter(rec => rec.userId !== userId));
    setTotal(prev => Math.max(0, prev - 1));

    // Record feedback in background (fire and forget)
    recordFeedback(userId, 'dismissed').catch(err => {
      ErrorService.capture('[useRecommendations] Failed to record dismiss feedback:', err);
    });
  }, [recordFeedback]);

  /**
   * Auto-load on mount if enabled
   */
  useEffect(() => {
    if (autoLoad) {
      loadRecommendations(0, false);
    }
  }, [autoLoad, loadRecommendations]);

  /**
   * Calculate if there are more recommendations to load
   */
  const hasMore = recommendations.length < total;

  return {
    recommendations,
    isLoading,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
    recordFeedback,
    dismissRecommendation
  };
}
