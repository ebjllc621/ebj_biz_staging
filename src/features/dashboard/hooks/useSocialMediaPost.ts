'use client';

/**
 * useSocialMediaPost Hook
 *
 * @description Manages social media connection fetching, cross-platform posting,
 *   and scheduled post management.
 * @phase Tier 5A Social Media Manager - Phase 7 (scheduling)
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_7_POST_SCHEDULING_CONTENT_CALENDAR.md
 */

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { SocialConnection, SocialPlatform, SocialPostingStatus, PostToSocialResult, SocialPost } from '@core/types/social-media';

interface UseSocialMediaPostOptions {
  listingId: number | null;
  contentType: string;
  contentId: number;
  contentTitle: string;
  contentUrl?: string;
}

interface UseSocialMediaPostReturn {
  connections: SocialConnection[];
  isLoadingConnections: boolean;
  connectionsError: string | null;
  selectedPlatforms: Set<SocialPlatform>;
  togglePlatform: (platform: SocialPlatform) => void;
  selectAll: () => void;
  deselectAll: () => void;
  platformTexts: Record<string, string>;
  setPlatformText: (platform: SocialPlatform, text: string) => void;
  getPostText: (platform: SocialPlatform) => string;
  postingStatuses: SocialPostingStatus[];
  isPosting: boolean;
  hasPosted: boolean;
  fetchConnections: () => Promise<void>;
  postToSelected: () => Promise<void>;
  reset: () => void;
  isScheduleMode: boolean;
  toggleScheduleMode: () => void;
  scheduledAt: string;
  setScheduledAt: React.Dispatch<React.SetStateAction<string>>;
  scheduledPosts: SocialPost[];
  isLoadingScheduled: boolean;
  fetchScheduledPosts: () => Promise<void>;
  cancelScheduledPost: (postId: number) => Promise<void>;
  scheduleToSelected: () => Promise<void>;
}

export function useSocialMediaPost({
  listingId,
  contentType,
  contentId,
  contentTitle,
  contentUrl,
}: UseSocialMediaPostOptions): UseSocialMediaPostReturn {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatform>>(new Set());
  const [platformTexts, setPlatformTexts] = useState<Record<string, string>>({});
  const [postingStatuses, setPostingStatuses] = useState<SocialPostingStatus[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);

  // Schedule mode state
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [scheduledPosts, setScheduledPosts] = useState<SocialPost[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  const setPlatformText = useCallback((platform: SocialPlatform, text: string) => {
    setPlatformTexts(prev => ({ ...prev, [platform]: text }));
  }, []);

  const getPostText = useCallback((platform: SocialPlatform): string => {
    return platformTexts[platform] ?? '';
  }, [platformTexts]);

  const fetchConnections = useCallback(async () => {
    if (!listingId) return;

    setIsLoadingConnections(true);
    setConnectionsError(null);

    try {
      const response = await fetch(
        `/api/social/connections?listing_id=${listingId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to load social connections');
      }

      const result = await response.json();
      const fetched: SocialConnection[] = result.data?.connections ?? [];

      setConnections(fetched);

      // Select all active connections by default
      const activeConnections = fetched.filter(c => c.is_active);
      setSelectedPlatforms(new Set(activeConnections.map(c => c.platform)));

      // Auto-generate per-platform post text
      const autoText = contentTitle + (contentUrl ? ' ' + contentUrl : '');
      const initialTexts: Record<string, string> = {};
      activeConnections.forEach(c => {
        initialTexts[c.platform] = autoText;
      });
      setPlatformTexts(initialTexts);

      // Fire-and-forget analytics
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventName: 'social_modal_opened',
          eventData: {
            contentType,
            contentId,
            listingId,
            connectionCount: fetched.length,
          },
        }),
      }).catch(() => {});
    } catch (err) {
      setConnectionsError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setIsLoadingConnections(false);
    }
  }, [listingId, contentType, contentId, contentTitle, contentUrl]);

  const togglePlatform = useCallback((platform: SocialPlatform) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPlatforms(new Set(connections.filter(c => c.is_active).map(c => c.platform)));
  }, [connections]);

  const deselectAll = useCallback(() => {
    setSelectedPlatforms(new Set());
  }, []);

  const postToSelected = useCallback(async () => {
    if (selectedPlatforms.size === 0) return;

    setIsPosting(true);

    // Initialize posting statuses for all selected platforms
    const initialStatuses: SocialPostingStatus[] = Array.from(selectedPlatforms).map(platform => {
      const connection = connections.find(c => c.platform === platform && c.is_active);
      return {
        platform,
        connection_id: connection?.id ?? 0,
        status: 'idle' as const,
      };
    });
    setPostingStatuses(initialStatuses);

    // Fire-and-forget analytics on submit
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventName: 'social_post_submitted',
        eventData: {
          contentType,
          contentId,
          listingId,
          platforms: Array.from(selectedPlatforms),
        },
      }),
    }).catch(() => {});

    // Post to each selected platform sequentially
    for (const platform of Array.from(selectedPlatforms)) {
      const connection = connections.find(c => c.platform === platform && c.is_active);
      if (!connection) continue;

      // Mark as posting
      setPostingStatuses(prev =>
        prev.map(s =>
          s.platform === platform ? { ...s, status: 'posting' as const } : s
        )
      );

      try {
        const platformPostText = platformTexts[platform] || '';

        const response = await fetchWithCsrf('/api/social/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connection_id: connection.id,
            content_type: contentType,
            content_id: contentId,
            post_text: platformPostText,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to post');
        }

        const postResult: PostToSocialResult = result.data?.post ?? { success: true, post_id: 0 };

        setPostingStatuses(prev =>
          prev.map(s =>
            s.platform === platform
              ? { ...s, status: 'success' as const, result: postResult }
              : s
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to post';
        setPostingStatuses(prev =>
          prev.map(s =>
            s.platform === platform
              ? { ...s, status: 'failed' as const, error: errorMsg }
              : s
          )
        );
      }
    }

    setIsPosting(false);
    setHasPosted(true);
  }, [selectedPlatforms, connections, contentType, contentId, listingId, platformTexts]);

  const toggleScheduleMode = useCallback(() => {
    setIsScheduleMode(prev => !prev);
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    if (!listingId) return;

    setIsLoadingScheduled(true);

    try {
      const response = await fetch(
        `/api/social/scheduled?listing_id=${listingId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to load scheduled posts');
      }

      const result = await response.json();
      setScheduledPosts(result.data?.scheduled_posts ?? []);
    } catch {
      // Silently fail — scheduled posts section is non-critical
    } finally {
      setIsLoadingScheduled(false);
    }
  }, [listingId]);

  const cancelScheduledPost = useCallback(async (postId: number) => {
    await fetchWithCsrf(`/api/social/scheduled/${postId}`, {
      method: 'DELETE',
    });
    setScheduledPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const scheduleToSelected = useCallback(async () => {
    if (selectedPlatforms.size === 0 || !scheduledAt) return;

    setIsPosting(true);

    // Initialize posting statuses for all selected platforms
    const initialStatuses: SocialPostingStatus[] = Array.from(selectedPlatforms).map(platform => {
      const connection = connections.find(c => c.platform === platform && c.is_active);
      return {
        platform,
        connection_id: connection?.id ?? 0,
        status: 'idle' as const,
      };
    });
    setPostingStatuses(initialStatuses);

    // Schedule to each selected platform sequentially
    for (const platform of Array.from(selectedPlatforms)) {
      const connection = connections.find(c => c.platform === platform && c.is_active);
      if (!connection) continue;

      // Mark as posting
      setPostingStatuses(prev =>
        prev.map(s =>
          s.platform === platform ? { ...s, status: 'posting' as const } : s
        )
      );

      try {
        const platformPostText = platformTexts[platform] || '';

        const response = await fetchWithCsrf('/api/social/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connection_id: connection.id,
            content_type: contentType,
            content_id: contentId,
            post_text: platformPostText,
            scheduled_at: scheduledAt,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to schedule post');
        }

        const postResult: PostToSocialResult = result.data?.post ?? { success: true, post_id: 0 };

        setPostingStatuses(prev =>
          prev.map(s =>
            s.platform === platform
              ? { ...s, status: 'success' as const, result: postResult }
              : s
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to schedule post';
        setPostingStatuses(prev =>
          prev.map(s =>
            s.platform === platform
              ? { ...s, status: 'failed' as const, error: errorMsg }
              : s
          )
        );
      }
    }

    setIsPosting(false);
    setHasPosted(true);
  }, [selectedPlatforms, connections, contentType, contentId, scheduledAt, platformTexts]);

  const reset = useCallback(() => {
    setConnections([]);
    setIsLoadingConnections(false);
    setConnectionsError(null);
    setSelectedPlatforms(new Set());
    setPlatformTexts({});
    setPostingStatuses([]);
    setIsPosting(false);
    setHasPosted(false);
    setIsScheduleMode(false);
    setScheduledAt('');
    setScheduledPosts([]);
    setIsLoadingScheduled(false);
  }, []);

  return {
    connections,
    isLoadingConnections,
    connectionsError,
    selectedPlatforms,
    togglePlatform,
    selectAll,
    deselectAll,
    platformTexts,
    setPlatformText,
    getPostText,
    postingStatuses,
    isPosting,
    hasPosted,
    fetchConnections,
    postToSelected,
    reset,
    isScheduleMode,
    toggleScheduleMode,
    scheduledAt,
    setScheduledAt,
    scheduledPosts,
    isLoadingScheduled,
    fetchScheduledPosts,
    cancelScheduledPost,
    scheduleToSelected,
  };
}
