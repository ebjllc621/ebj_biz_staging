/**
 * useJobAnalytics - Job analytics tracking hook
 *
 * @hook
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 *
 * Provides analytics event tracking for jobs
 */

import { useCallback } from 'react';
import type { AnalyticsEventType, AnalyticsSource } from '@features/jobs/types';

interface TrackEventOptions {
  jobId: number;
  eventType: AnalyticsEventType;
  source?: AnalyticsSource;
  referrer?: string;
}

interface UseJobAnalyticsReturn {
  trackEvent: (options: TrackEventOptions) => Promise<boolean>;
  trackView: (jobId: number, source?: AnalyticsSource) => Promise<boolean>;
  trackSave: (jobId: number, source?: AnalyticsSource) => Promise<boolean>;
  trackShare: (jobId: number, source?: AnalyticsSource) => Promise<boolean>;
  trackApplyClick: (jobId: number, source?: AnalyticsSource) => Promise<boolean>;
  trackExternalClick: (jobId: number, source?: AnalyticsSource) => Promise<boolean>;
}

/**
 * Custom hook for tracking job analytics events
 *
 * @returns Analytics tracking functions
 *
 * @example
 * ```tsx
 * const { trackView, trackApplyClick } = useJobAnalytics();
 *
 * // Track page view
 * useEffect(() => {
 *   trackView(jobId, 'job_detail');
 * }, [jobId]);
 *
 * // Track apply click
 * const handleApply = () => {
 *   trackApplyClick(jobId, 'job_detail');
 *   // ... handle application
 * };
 * ```
 */
export function useJobAnalytics(): UseJobAnalyticsReturn {
  /**
   * Track a generic analytics event
   */
  const trackEvent = useCallback(async (options: TrackEventOptions): Promise<boolean> => {
    const { jobId, eventType, source, referrer } = options;

    try {
      const response = await fetch(`/api/jobs/${jobId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: eventType,
          source: source || null,
          referrer: referrer || null
        })
      });

      return response.ok;
    } catch (error) {
      console.error('[useJobAnalytics] Failed to track event:', error);
      return false;
    }
  }, []);

  /**
   * Track job page view
   */
  const trackView = useCallback(
    async (jobId: number, source?: AnalyticsSource): Promise<boolean> => {
      return trackEvent({ jobId, eventType: 'page_view', source });
    },
    [trackEvent]
  );

  /**
   * Track job save/bookmark
   */
  const trackSave = useCallback(
    async (jobId: number, source?: AnalyticsSource): Promise<boolean> => {
      return trackEvent({ jobId, eventType: 'save', source });
    },
    [trackEvent]
  );

  /**
   * Track job share
   */
  const trackShare = useCallback(
    async (jobId: number, source?: AnalyticsSource): Promise<boolean> => {
      return trackEvent({ jobId, eventType: 'share', source });
    },
    [trackEvent]
  );

  /**
   * Track apply button click
   */
  const trackApplyClick = useCallback(
    async (jobId: number, source?: AnalyticsSource): Promise<boolean> => {
      return trackEvent({ jobId, eventType: 'apply_click', source });
    },
    [trackEvent]
  );

  /**
   * Track external application link click
   */
  const trackExternalClick = useCallback(
    async (jobId: number, source?: AnalyticsSource): Promise<boolean> => {
      return trackEvent({ jobId, eventType: 'external_click', source });
    },
    [trackEvent]
  );

  return {
    trackEvent,
    trackView,
    trackSave,
    trackShare,
    trackApplyClick,
    trackExternalClick
  };
}

export default useJobAnalytics;
