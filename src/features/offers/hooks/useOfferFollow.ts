/**
 * useOfferFollow - Hook for offer follow state management
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type { FollowType, NotificationFrequency, OfferFollow } from '@features/offers/types';

interface UseOfferFollowReturn {
  follows: boolean;
  follow: OfferFollow | null;
  isLoading: boolean;
  error: string | null;
  toggleFollow: (frequency?: NotificationFrequency) => Promise<void>;
  updateFrequency: (frequency: NotificationFrequency) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing offer follow state
 *
 * @param followType Type of follow (business, category, all_offers)
 * @param targetId Target ID (null for all_offers)
 * @returns Follow state and actions
 */
export function useOfferFollow(
  followType: FollowType,
  targetId: number | null
): UseOfferFollowReturn {
  const [follows, setFollows] = useState(false);
  const [follow, setFollow] = useState<OfferFollow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check follow status
  const checkFollowStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: followType
      });

      if (targetId !== null) {
        params.append('target', targetId.toString());
      }

      const response = await fetch(`/api/user/offer-follows/check?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check follow status');
      }

      const data = await response.json();
      setFollows(data.data?.follows || false);
      setFollow(data.data?.follow || null);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check follow status';
      setError(message);
      ErrorService.capture('[useOfferFollow] checkFollowStatus failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [followType, targetId]);

  // Initial load
  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  // Toggle follow
  const toggleFollow = useCallback(async (frequency: NotificationFrequency = 'realtime') => {
    try {
      setIsLoading(true);
      setError(null);

      if (follows && follow) {
        // Unfollow
        const response = await fetchWithCsrf(`/api/user/offer-follows/${follow.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to unfollow');
        }

        setFollows(false);
        setFollow(null);
      } else {
        // Follow
        const response = await fetchWithCsrf('/api/user/offer-follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            follow_type: followType,
            target_id: targetId,
            frequency
          })
        });

        if (!response.ok) {
          throw new Error('Failed to follow');
        }

        const data = await response.json();
        setFollows(true);
        setFollow(data.data?.follow || null);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle follow';
      setError(message);
      ErrorService.capture('[useOfferFollow] toggleFollow failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [follows, follow, followType, targetId]);

  // Update frequency
  const updateFrequency = useCallback(async (newFrequency: NotificationFrequency) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithCsrf('/api/user/offer-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_type: followType,
          target_id: targetId,
          frequency: newFrequency
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update frequency');
      }

      const data = await response.json();
      setFollow(data.data?.follow || null);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update frequency';
      setError(message);
      ErrorService.capture('[useOfferFollow] updateFrequency failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [followType, targetId]);

  return {
    follows,
    follow,
    isLoading,
    error,
    toggleFollow,
    updateFrequency,
    refresh: checkFollowStatus
  };
}

export default useOfferFollow;
