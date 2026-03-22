/**
 * useContentCampaignData Hook - Fetch featured content for campaign section
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 4 - Content Page Components
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 *
 * Fetches featured articles, videos, and podcasts for the content campaign section.
 * Uses /api/content/featured endpoint with limit parameter.
 */

'use client';

import { useState, useEffect } from 'react';
import type { ContentArticle, ContentVideo, ContentPodcast } from '@core/services/ContentService';
import type { Guide } from '@core/types/guide';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Hook return type
 */
export interface UseContentCampaignDataReturn {
  /** Featured articles */
  articles: ContentArticle[];
  /** Featured videos */
  videos: ContentVideo[];
  /** Featured podcasts */
  podcasts: ContentPodcast[];
  /** Featured guides */
  guides: Guide[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Fetch featured content for campaign section
 */
export function useContentCampaignData(limit: number = 10): UseContentCampaignDataReturn {
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [podcasts, setPodcasts] = useState<ContentPodcast[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchFeaturedContent() {
      try {
        setIsLoading(true);
        setError(null);

        const [featuredResponse, guidesResponse] = await Promise.all([
          fetch(`/api/content/featured?limit=${limit}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }),
          fetch(`/api/content/guides?featured=true&pageSize=${limit}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })
        ]);

        if (!featuredResponse.ok) {
          throw new Error('Failed to fetch featured content');
        }

        const featuredResult = await featuredResponse.json();

        if (!isMounted) return;

        // apiHandler envelope: { success, data: { articles, videos, podcasts }, meta }
        // @fix CONT-002 - Navigate apiHandler envelope correctly
        // @see src/features/listings/hooks/useCampaignData.ts - Canonical pattern
        if (!featuredResult.success || !featuredResult.data) {
          throw new Error(featuredResult.error?.message || 'Failed to fetch featured content');
        }

        setArticles(featuredResult.data.articles || []);
        setVideos(featuredResult.data.videos || []);
        setPodcasts(featuredResult.data.podcasts || []);

        // Parse guides response (silent fail — don't block other content)
        if (guidesResponse.ok) {
          const guidesResult = await guidesResponse.json();
          if (guidesResult.success && guidesResult.data?.guides) {
            if (isMounted) setGuides(guidesResult.data.guides);
          }
        }
      } catch (err) {
        if (!isMounted) return;

        // Silent error handling - log error but don't throw
        ErrorService.capture('Error fetching featured content:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchFeaturedContent();

    return () => {
      isMounted = false;
    };
  }, [limit]);

  return {
    articles,
    videos,
    podcasts,
    guides,
    isLoading,
    error,
  };
}
