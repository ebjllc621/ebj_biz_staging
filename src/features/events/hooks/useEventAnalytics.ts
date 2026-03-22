/**
 * useEventAnalytics - Track event analytics from client components
 *
 * @tier SIMPLE
 * @phase Phase 3 - Event Analytics & Social Sharing
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useRef, useCallback } from 'react';
import type { EventAnalyticsMetricType, EventAnalyticsSource } from '@features/events/types';

export function useEventAnalytics(eventId: number | undefined) {
  const trackedEvents = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(async (
    metricType: EventAnalyticsMetricType,
    source?: EventAnalyticsSource,
    platform?: string
  ) => {
    if (!eventId) return;

    // Client-side dedup key (supplements server-side 30s dedup)
    const dedupKey = `${eventId}-${metricType}`;
    if ((metricType === 'page_view' || metricType === 'impression') && trackedEvents.current.has(dedupKey)) {
      return;
    }
    trackedEvents.current.add(dedupKey);

    // Fire-and-forget
    try {
      await fetch(`/api/events/${eventId}/analytics`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_type: metricType,
          ...(source && { source }),
          ...(platform && { platform })
        })
      });
    } catch {
      // Silently fail — analytics should never block UX
    }
  }, [eventId]);

  return { trackEvent };
}
