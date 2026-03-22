/**
 * useWebVitals - Core Web Vitals Monitoring Hook
 *
 * @hook Client-side only
 * @tier STANDARD
 * @phase Phase 9 - Performance & SEO
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Features:
 * - Monitors all Core Web Vitals (CLS, FID, FCP, LCP, TTFB)
 * - Sends metrics to Google Analytics (if available)
 * - Sends metrics to custom analytics endpoint
 * - Console logging in development mode
 * - Automatic cleanup on unmount
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_9_BRAIN_PLAN.md
 * @see https://web.dev/vitals/
 */
'use client';

import { useEffect } from 'react';
import type { Metric } from 'web-vitals';
import { ErrorService } from '@core/services/ErrorService';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (
      event: string,
      eventName: string,
      params: Record<string, unknown>
    ) => void;
  }
}

/**
 * Send metric to analytics endpoints
 */
function sendToAnalytics(metric: Metric): void {
  // Send to Google Analytics 4 (if available)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to custom analytics endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        id: metric.id,
        page: window.location.pathname,
        timestamp: Date.now()
      }),
      credentials: 'include'
    }).catch((error) => {
      // Silently fail - don't block page for analytics errors
      if (process.env.NODE_ENV === 'development') {
        ErrorService.capture('Failed to send Web Vitals metric:', error);
      }
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      id: metric.id,
      rating: metric.rating
    });
  }
}

/**
 * Web Vitals monitoring hook
 *
 * Usage:
 * ```tsx
 * function MyPage() {
 *   useWebVitals();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWebVitals(): void {
  useEffect(() => {
    // Dynamic import to avoid SSR issues and reduce initial bundle
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      // Core Web Vitals (official metrics)
      onCLS(sendToAnalytics);
      onLCP(sendToAnalytics);

      // Additional metrics (supplementary)
      onFCP(sendToAnalytics);
      onTTFB(sendToAnalytics);

      // Interaction to Next Paint (INP) - Chrome's replacement for FID
      onINP(sendToAnalytics);
    }).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        ErrorService.capture('Failed to load web-vitals library:', error);
      }
    });
  }, []);
}
