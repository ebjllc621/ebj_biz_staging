/**
 * AnalyticsService - Google Analytics 4 & Facebook Pixel Integration
 *
 * GOVERNANCE COMPLIANCE:
 * - No database access required (client-side tracking)
 * - Environment-based configuration
 * - Tier: STANDARD
 * - Build Map v2.1 ENHANCED patterns
 *
 * Features:
 * - Google Analytics 4 event tracking
 * - Facebook Pixel integration
 * - Custom event tracking
 * - Conversion tracking
 * - Tracking script generation for client-side injection
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.3
 * @phase Phase 6.3 - SEO & Analytics
 * @complexity STANDARD tier (~200 lines, no database)
 */

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PageViewData {
  url: string;
  title: string;
  userId?: number;
}

export interface EventData {
  eventName: string;
  params: Record<string, unknown>;
}

export interface ConversionData {
  conversionType: string;
  value: number;
  userId?: number;
}

// ============================================================================
// AnalyticsService Implementation
// ============================================================================

export class AnalyticsService {
  private ga4MeasurementId: string | null;
  private facebookPixelId: string | null;
  private isProduction: boolean;

  constructor() {
    this.ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || null;
    this.facebookPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || null;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // ==========================================================================
  // TRACKING SCRIPT GENERATION
  // ==========================================================================

  /**
   * Get tracking script for client-side injection
   *
   * This method generates the complete HTML script tags for both
   * Google Analytics 4 and Facebook Pixel based on environment configuration.
   *
   * @returns Script HTML string
   *
   * @example
   * ```typescript
   * const analyticsService = new AnalyticsService();
   * const scripts = analyticsService.getTrackingScript();
   * // Inject into <head> of HTML document
   * ```
   */
  getTrackingScript(): string {
    let script = '';

    // Google Analytics 4
    if (this.ga4MeasurementId) {
      script += `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${this.ga4MeasurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${this.ga4MeasurementId}', {
    page_path: window.location.pathname,
    send_page_view: true
  });
</script>`;
    }

    // Facebook Pixel
    if (this.facebookPixelId) {
      script += `
<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${this.facebookPixelId}');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=${this.facebookPixelId}&ev=PageView&noscript=1"
/></noscript>`;
    }

    return script;
  }

  // ==========================================================================
  // PAGE VIEW TRACKING
  // ==========================================================================

  /**
   * Track page view (server-side helper)
   *
   * Note: Actual tracking happens client-side via script injection.
   * This method is primarily for server-side logging in development.
   *
   * @param url - Page URL
   * @param title - Page title
   *
   * @example
   * ```typescript
   * analyticsService.trackPageView('/listings/123', 'Best Italian Restaurant');
   * ```
   */
  trackPageView(url: string, title: string): void {
    // Log for debugging in development
    if (!this.isProduction) {
      
    }

    // In production, this is handled client-side by GA4/Facebook scripts
    // No server-side action needed
  }

  // ==========================================================================
  // CUSTOM EVENT TRACKING
  // ==========================================================================

  /**
   * Track custom event
   *
   * Logs custom analytics events. In production, these should be
   * triggered client-side using gtag('event') or fbq('track').
   *
   * @param eventName - Event name (e.g., 'listing_view', 'search_query')
   * @param params - Event parameters
   *
   * @example
   * ```typescript
   * analyticsService.trackEvent('listing_view', {
   *   listing_id: 123,
   *   category: 'restaurants',
   *   tier: 'premium'
   * });
   * ```
   */
  trackEvent(eventName: string, params: Record<string, unknown>): void {
    if (!this.isProduction) {
    }

    // In production, client-side code would call:
    // gtag('event', eventName, params);
    // fbq('track', eventName, params);
  }

  // ==========================================================================
  // CONVERSION TRACKING
  // ==========================================================================

  /**
   * Track conversion event
   *
   * Used for tracking important conversion events like subscription upgrades,
   * listing purchases, or other revenue-generating actions.
   *
   * @param conversionType - Type of conversion (e.g., 'subscription_upgrade', 'purchase')
   * @param value - Conversion value in dollars
   *
   * @example
   * ```typescript
   * analyticsService.trackConversion('subscription_upgrade', 49.00);
   * ```
   */
  trackConversion(conversionType: string, value: number): void {
    if (!this.isProduction) {
      
    }

    // In production, client-side code would call:
    // gtag('event', 'conversion', { value: value, currency: 'USD', type: conversionType });
    // fbq('track', 'Purchase', { value: value, currency: 'USD' });
  }

  // ==========================================================================
  // ENTITY-SPECIFIC TRACKING
  // ==========================================================================

  /**
   * Track listing view
   *
   * @param listingId - Listing ID
   *
   * @example
   * ```typescript
   * analyticsService.trackListingView(123);
   * ```
   */
  trackListingView(listingId: number): void {
    this.trackEvent('listing_view', {
      listing_id: listingId,
      content_type: 'listing'
    });
  }

  /**
   * Track search query
   *
   * @param query - Search query string
   * @param results - Number of results returned
   *
   * @example
   * ```typescript
   * analyticsService.trackSearchQuery('italian restaurant', 24);
   * ```
   */
  trackSearchQuery(query: string, results: number): void {
    this.trackEvent('search', {
      search_term: query,
      results_count: results
    });
  }

  // ==========================================================================
  // CONFIGURATION HELPERS
  // ==========================================================================

  /**
   * Check if Google Analytics 4 is configured
   *
   * @returns True if GA4 measurement ID is set
   */
  isGA4Enabled(): boolean {
    return this.ga4MeasurementId !== null;
  }

  /**
   * Check if Facebook Pixel is configured
   *
   * @returns True if Facebook Pixel ID is set
   */
  isFacebookPixelEnabled(): boolean {
    return this.facebookPixelId !== null;
  }

  /**
   * Get current configuration status
   *
   * @returns Configuration object
   */
  getConfig(): {
    ga4Enabled: boolean;
    facebookPixelEnabled: boolean;
    isProduction: boolean;
  } {
    return {
      ga4Enabled: this.isGA4Enabled(),
      facebookPixelEnabled: this.isFacebookPixelEnabled(),
      isProduction: this.isProduction
    };
  }
}
