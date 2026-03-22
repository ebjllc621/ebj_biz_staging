/**
 * useContentAnalytics - Track content analytics from client components
 *
 * @tier SIMPLE
 * @phase Phase 3B - Share Modal + Comment Section + Analytics Integration
 * @governance Build Map v2.1 ENHANCED
 * @reference src/features/events/hooks/useEventAnalytics.ts — CANONICAL pattern
 *
 * Fire-and-forget analytics tracking with client-side dedup for page_view events.
 */
'use client';

import { useRef, useCallback } from 'react';
import type { ContentType } from '@core/services/ContentInteractionService';

export type ContentAnalyticsMetricType = 'page_view' | 'share' | 'comment' | 'bookmark' | 'report' | 'pdf_download';

export function useContentAnalytics(
  contentType: ContentType,
  contentId: number | undefined
) {
  const trackedEvents = useRef<Set<string>>(new Set());

  const trackContentEvent = useCallback(async (
    metricType: ContentAnalyticsMetricType,
    source?: string,
    platform?: string
  ) => {
    if (!contentId) return;

    // Client-side dedup key — page_view tracked once per mount
    const dedupKey = `${contentType}-${contentId}-${metricType}`;
    if (metricType === 'page_view' && trackedEvents.current.has(dedupKey)) {
      return;
    }
    trackedEvents.current.add(dedupKey);

    // Fire-and-forget — analytics never blocks UX
    try {
      await fetch(`/api/content/${contentType}/${contentId}/analytics`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_type: metricType,
          content_type: contentType,
          ...(source && { source }),
          ...(platform && { platform })
        })
      });
    } catch {
      // Silently fail — analytics should never block UX
    }
  }, [contentType, contentId]);

  return { trackContentEvent };
}
