/**
 * useRecommendationAnalytics - Client-side analytics tracking hook
 *
 * Provides methods for tracking recommendation interactions from UI components.
 * Handles session management, offline queueing, and batch event submission.
 *
 * @pattern hook/useRecommendationAnalytics
 * @category analytics
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @phase Phase 8F
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { RecommendationAnalyticsEventType } from '../types';
import { useOnlineStatus } from './useOnlineStatus';

interface TrackEventParams {
  eventType: RecommendationAnalyticsEventType;
  recommendedUserId: number;
  score: number;
  position: number;
  source: 'homepage_widget' | 'connections_page' | 'mobile_list' | 'profile_sidebar';
  dwellTimeMs?: number;
  reasons?: string[];
  metadata?: Record<string, unknown>;
}

interface QueuedEvent extends TrackEventParams {
  timestamp: number;
}

interface UseRecommendationAnalyticsResult {
  trackImpression: (params: Omit<TrackEventParams, 'eventType'>) => void;
  trackInteraction: (eventType: RecommendationAnalyticsEventType, params: Omit<TrackEventParams, 'eventType'>) => void;
  trackSwipe: (direction: 'left' | 'right', params: Omit<TrackEventParams, 'eventType'>) => void;
  flushEvents: () => Promise<void>;
  variantId: string | null;
}

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem('rec_analytics_session');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('rec_analytics_session', sessionId);
  }
  return sessionId;
}

// Get stored variant ID
function getVariantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rec_variant_id');
}

// Store variant ID
function setVariantId(variantId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('rec_variant_id', variantId);
}

export function useRecommendationAnalytics(): UseRecommendationAnalyticsResult {
  const { isOnline } = useOnlineStatus();
  const eventQueue = useRef<QueuedEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);
  const variantIdRef = useRef<string | null>(getVariantId());

  // Fetch variant ID on mount if not set
  useEffect(() => {
    if (variantIdRef.current) return;

    const fetchVariant = async () => {
      try {
        const response = await fetch('/api/users/connections/recommendations/variant', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.variantId) {
            variantIdRef.current = data.data.variantId;
            setVariantId(data.data.variantId);
          }
        }
      } catch (err) {
        console.error('[useRecommendationAnalytics] Variant fetch error:', err);
      }
    };

    fetchVariant();
  }, []);

  /**
   * Queue an event for tracking
   */
  const queueEvent = useCallback((event: TrackEventParams) => {
    eventQueue.current.push({
      ...event,
      timestamp: Date.now()
    });

    // Auto-flush after 5 seconds or 10 events
    if (eventQueue.current.length >= 10) {
      flushEvents();
    } else if (!flushTimeout.current) {
      flushTimeout.current = setTimeout(() => {
        flushEvents();
      }, 5000);
    }
  }, []);

  /**
   * Flush queued events to server
   */
  const flushEvents = useCallback(async () => {
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
      flushTimeout.current = null;
    }

    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    if (!isOnline) {
      // Store for later sync
      const stored = JSON.parse(localStorage.getItem('rec_analytics_queue') || '[]');
      localStorage.setItem('rec_analytics_queue', JSON.stringify([...stored, ...events]));
      return;
    }

    try {
      const sessionId = getSessionId();

      await fetch('/api/users/connections/recommendations/analytics/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: events.map(e => ({
            ...e,
            sessionId,
            variantId: variantIdRef.current
          }))
        })
      });
    } catch (err) {
      // Re-queue failed events
      eventQueue.current = [...events, ...eventQueue.current];
      console.error('[useRecommendationAnalytics] Flush error:', err);
    }
  }, [isOnline]);

  /**
   * Track impression event
   */
  const trackImpression = useCallback((params: Omit<TrackEventParams, 'eventType'>) => {
    queueEvent({
      ...params,
      eventType: 'impression'
    });
  }, [queueEvent]);

  /**
   * Track interaction event
   */
  const trackInteraction = useCallback((
    eventType: RecommendationAnalyticsEventType,
    params: Omit<TrackEventParams, 'eventType'>
  ) => {
    queueEvent({
      ...params,
      eventType
    });
  }, [queueEvent]);

  /**
   * Track swipe event (mobile)
   */
  const trackSwipe = useCallback((
    direction: 'left' | 'right',
    params: Omit<TrackEventParams, 'eventType'>
  ) => {
    queueEvent({
      ...params,
      eventType: direction === 'left' ? 'swipe_dismiss' : 'swipe_connect'
    });
  }, [queueEvent]);

  // Sync stored events when coming back online
  useEffect(() => {
    if (!isOnline) return;

    const stored = JSON.parse(localStorage.getItem('rec_analytics_queue') || '[]');
    if (stored.length > 0) {
      eventQueue.current = [...stored, ...eventQueue.current];
      localStorage.removeItem('rec_analytics_queue');
      flushEvents();
    }
  }, [isOnline, flushEvents]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (eventQueue.current.length > 0) {
        // Sync flush on unmount
        const events = eventQueue.current;
        navigator.sendBeacon?.(
          '/api/users/connections/recommendations/analytics/events',
          JSON.stringify({
            events: events.map(e => ({
              ...e,
              sessionId: getSessionId(),
              variantId: variantIdRef.current
            }))
          })
        );
      }
    };
  }, []);

  return {
    trackImpression,
    trackInteraction,
    trackSwipe,
    flushEvents,
    variantId: variantIdRef.current
  };
}
