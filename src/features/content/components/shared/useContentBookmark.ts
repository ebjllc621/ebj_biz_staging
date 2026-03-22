/**
 * useContentBookmark - Hook for content bookmark state and toggle
 *
 * Checks bookmark state on mount (if authenticated), and provides
 * optimistic toggle with server sync and rollback on error.
 *
 * @component Client Hook ('use client' boundary)
 * @tier STANDARD
 * @phase Content Phase 3A
 * @reference src/features/events/components/EventReportModal.tsx — auth gating pattern
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

type ContentType = 'article' | 'podcast' | 'video' | 'newsletter' | 'guide';

interface UseContentBookmarkReturn {
  isBookmarked: boolean;
  isLoading: boolean;
  bookmarkCount: number;
  toggleBookmark: () => Promise<void>;
}

/**
 * Manage bookmark state for a content item.
 *
 * @param contentType - 'article' | 'podcast' | 'video'
 * @param contentId - Numeric content ID (must be > 0 to trigger bookmark check)
 */
export function useContentBookmark(
  contentType: ContentType,
  contentId: number
): UseContentBookmarkReturn {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  // Check bookmark state on mount — only if authenticated and contentId is valid
  useEffect(() => {
    if (!user || !contentId || contentId <= 0) return;

    const checkBookmark = async () => {
      try {
        const response = await fetch(
          `/api/content/${contentType}/${contentId}/bookmark`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          setIsBookmarked(data.data?.bookmarked ?? false);
          setBookmarkCount(data.data?.count ?? 0);
        }
      } catch {
        // Silently fail — bookmark check is not critical
      }
    };

    checkBookmark();
  }, [user, contentType, contentId]);

  const toggleBookmark = useCallback(async () => {
    if (!user) {
      // User is not authenticated — could show toast or redirect (Phase 3B)
      return;
    }

    // Optimistic UI update
    const wasBookmarked = isBookmarked;
    setIsLoading(true);
    setIsBookmarked(!wasBookmarked);
    setBookmarkCount(prev => wasBookmarked ? Math.max(0, prev - 1) : prev + 1);

    try {
      const response = await fetchWithCsrf(
        `/api/content/${contentType}/${contentId}/bookmark`,
        {
          method: wasBookmarked ? 'DELETE' : 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        // Revert optimistic update on server error
        setIsBookmarked(wasBookmarked);
        setBookmarkCount(prev => wasBookmarked ? prev + 1 : Math.max(0, prev - 1));
      } else {
        const data = await response.json();
        // Sync with server-authoritative state
        const serverBookmarked = data.data?.bookmarked;
        const serverCount = data.data?.count;
        if (serverBookmarked !== undefined) {
          setIsBookmarked(serverBookmarked);
        }
        if (serverCount !== undefined) {
          setBookmarkCount(serverCount);
        }
      }
    } catch {
      // Revert optimistic update on network error
      setIsBookmarked(wasBookmarked);
      setBookmarkCount(prev => wasBookmarked ? prev + 1 : Math.max(0, prev - 1));
    } finally {
      setIsLoading(false);
    }
  }, [user, contentType, contentId, isBookmarked]);

  return { isBookmarked, isLoading, bookmarkCount, toggleBookmark };
}
