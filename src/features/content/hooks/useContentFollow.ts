/**
 * useContentFollow - Hook for content follow state management
 *
 * @tier STANDARD
 * @phase Phase 3 - Follow Button and Hook
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier4_Phases/PHASE_3_FOLLOW_BUTTON_AND_HOOK.md
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type { ContentFollowType, ContentNotificationFrequency, ContentFollow, ContentFollowState } from '@core/types/content-follow';

interface UseContentFollowReturn {
  follows: boolean;
  follow: ContentFollow | null;
  isLoading: boolean;
  error: string | null;
  toggleFollow: (frequency?: ContentNotificationFrequency) => Promise<void>;
  updateFrequency: (frequency: ContentNotificationFrequency) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing content follow state
 *
 * @param followType Type of follow (business, category, content_type, all_content, newsletter, etc.)
 * @param targetId Target ID (null for all_content)
 * @param contentTypeFilter Optional content type filter (article, video, podcast, etc.)
 * @returns Follow state and actions
 */
export function useContentFollow(
  followType: ContentFollowType,
  targetId: number | null,
  contentTypeFilter?: string | null
): UseContentFollowReturn {
  const [follows, setFollows] = useState(false);
  const [follow, setFollow] = useState<ContentFollow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check follow status
  const checkFollowStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        follow_type: followType
      });

      if (targetId !== null) {
        params.append('target_id', targetId.toString());
      }

      if (contentTypeFilter) {
        params.append('content_type_filter', contentTypeFilter);
      }

      const response = await fetch(`/api/content/follow?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check follow status');
      }

      const data = await response.json();
      const status = data.data as ContentFollowState | undefined;
      setFollows(status?.isFollowing || false);

      if (status?.isFollowing && status.followId !== null) {
        // Reconstruct a minimal ContentFollow from the state shape for downstream consumers
        setFollow({
          id: status.followId as number,
          userId: 0, // not returned by status check — placeholder
          followType,
          targetId,
          contentTypeFilter: contentTypeFilter ?? null,
          notificationFrequency: status.frequency,
          isActive: status.isActive,
          createdAt: new Date(),
          updatedAt: null
        });
      } else {
        setFollow(null);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check follow status';
      setError(message);
      ErrorService.capture('[useContentFollow] checkFollowStatus failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [followType, targetId, contentTypeFilter]);

  // Initial load
  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  // Toggle follow
  const toggleFollow = useCallback(async (frequency: ContentNotificationFrequency = 'daily') => {
    try {
      setIsLoading(true);
      setError(null);

      if (follows && follow) {
        // Unfollow
        const response = await fetchWithCsrf(`/api/content/follow?followId=${follow.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to unfollow');
        }

        setFollows(false);
        setFollow(null);
      } else {
        // Follow
        const response = await fetchWithCsrf('/api/content/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            followType,
            targetId,
            contentTypeFilter: contentTypeFilter ?? null,
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
      ErrorService.capture('[useContentFollow] toggleFollow failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [follows, follow, followType, targetId, contentTypeFilter]);

  // Update frequency
  const updateFrequency = useCallback(async (newFrequency: ContentNotificationFrequency) => {
    if (!follow) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithCsrf('/api/content/follow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followId: follow.id,
          frequency: newFrequency
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update frequency');
      }

      setFollow(prev => prev ? { ...prev, notificationFrequency: newFrequency } : prev);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update frequency';
      setError(message);
      ErrorService.capture('[useContentFollow] updateFrequency failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [follow]);

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

export default useContentFollow;
