/**
 * useAnalyticsTracking - Listing Analytics Event Tracking Hook
 *
 * @hook Custom Hook
 * @tier SIMPLE
 * @phase Phase 10 - Marketing & Advanced Features (Analytics E2E)
 * @generated SYSREP Diagnostic Fix
 * @governance Build Map v2.1 ENHANCED
 *
 * Provides fire-and-forget analytics tracking for listing interactions:
 * - Click events (favorite, share, contact, website, directions, phone, email)
 * - Conversion events (contact sent, quote request, booking)
 *
 * Fire-and-forget pattern: Never fails user experience, silently handles errors.
 *
 * @see docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 */

import { useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/** Event types for click tracking */
export type ClickEventType =
  | 'listing_favorite'
  | 'listing_share'
  | 'listing_contact_click'
  | 'listing_website_click'
  | 'listing_directions_click'
  | 'listing_phone_click'
  | 'listing_email_click'
  | 'listing_map_click'
  | 'listing_gallery_click'
  | 'listing_review_click'
  | 'listing_quote_open';

/** Conversion types for conversion tracking */
export type ConversionType =
  | 'listing_contact'
  | 'listing_quote'
  | 'listing_booking'
  | 'listing_call';

/** Optional event data payload */
export interface EventData {
  /** Share platform (facebook, twitter, clipboard, etc.) */
  platform?: string;
  /** Action type (add, remove) */
  action?: string;
  /** Additional custom data */
  [key: string]: unknown;
}

/** Hook return type */
export interface UseAnalyticsTrackingReturn {
  /** Track a click event (fire-and-forget) */
  trackClick: (eventType: ClickEventType, eventData?: EventData) => void;
  /** Track a conversion event (fire-and-forget) */
  trackConversion: (conversionType: ConversionType, value?: number) => void;
  /** Check if tracking is available */
  isTrackingEnabled: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useAnalyticsTracking - Fire-and-forget analytics tracking for listings
 *
 * @param listingId - The listing ID to track events for
 * @returns Tracking functions and status
 *
 * @example
 * ```tsx
 * const { trackClick, trackConversion } = useAnalyticsTracking(listing.id);
 *
 * // Track a click
 * const handleFavorite = () => {
 *   trackClick('listing_favorite', { action: 'add' });
 *   // ... rest of handler
 * };
 *
 * // Track a conversion
 * const handleContactSubmit = () => {
 *   trackConversion('listing_contact');
 *   // ... rest of handler
 * };
 * ```
 */
export function useAnalyticsTracking(listingId: number | null | undefined): UseAnalyticsTrackingReturn {
  // Track in-flight requests to prevent duplicates within short time window
  const recentEventsRef = useRef<Set<string>>(new Set());

  /**
   * Get current referrer (where user came from)
   */
  const getReferrer = useCallback((): string | null => {
    if (typeof document === 'undefined') return null;
    return document.referrer || null;
  }, []);

  /**
   * Generate a simple session ID for correlation (not for auth)
   */
  const getSessionId = useCallback((): string | null => {
    if (typeof sessionStorage === 'undefined') return null;
    let sessionId = sessionStorage.getItem('bk_analytics_session');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('bk_analytics_session', sessionId);
    }
    return sessionId;
  }, []);

  /**
   * Track a click event (fire-and-forget)
   */
  const trackClick = useCallback((eventType: ClickEventType, eventData?: EventData) => {
    if (!listingId) return;

    // Deduplicate events within 1 second
    const eventKey = `${eventType}-${listingId}-${JSON.stringify(eventData || {})}`;
    if (recentEventsRef.current.has(eventKey)) return;

    recentEventsRef.current.add(eventKey);
    setTimeout(() => {
      recentEventsRef.current.delete(eventKey);
    }, 1000);

    // Fire-and-forget tracking call
    const trackAsync = async () => {
      try {
        await fetch(`/api/listings/${listingId}/track`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: 'click',
            eventName: eventType,
            eventData: eventData || {},
            sessionId: getSessionId(),
            referrer: getReferrer(),
          }),
        });
      } catch {
        // Fire-and-forget: silently ignore errors
        // Never impact user experience
      }
    };

    // Use requestIdleCallback for non-blocking tracking (or setTimeout fallback)
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => void trackAsync());
    } else {
      setTimeout(() => void trackAsync(), 0);
    }
  }, [listingId, getSessionId, getReferrer]);

  /**
   * Track a conversion event (fire-and-forget)
   */
  const trackConversion = useCallback((conversionType: ConversionType, value?: number) => {
    if (!listingId) return;

    // Deduplicate conversions within 5 seconds (conversions are rarer)
    const eventKey = `conversion-${conversionType}-${listingId}`;
    if (recentEventsRef.current.has(eventKey)) return;

    recentEventsRef.current.add(eventKey);
    setTimeout(() => {
      recentEventsRef.current.delete(eventKey);
    }, 5000);

    // Fire-and-forget tracking call
    const trackAsync = async () => {
      try {
        await fetch(`/api/listings/${listingId}/track`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: 'conversion',
            conversionType,
            value: value || null,
            sessionId: getSessionId(),
            referrer: getReferrer(),
          }),
        });
      } catch {
        // Fire-and-forget: silently ignore errors
      }
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => void trackAsync());
    } else {
      setTimeout(() => void trackAsync(), 0);
    }
  }, [listingId, getSessionId, getReferrer]);

  return {
    trackClick,
    trackConversion,
    isTrackingEnabled: Boolean(listingId),
  };
}

export default useAnalyticsTracking;
