/**
 * InternalAnalyticsService - Database-Backed User Analytics & Behavior Tracking
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Circuit breaker pattern (tracking doesn't fail requests)
 * - Build Map v2.1 ENHANCED patterns
 * - Fire-and-forget tracking for performance
 *
 * NOTE: This service is for INTERNAL analytics tracking (stored in database).
 * For EXTERNAL analytics (GA4/Facebook Pixel), see AnalyticsService.ts
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority User Requirements - Phase 6.3 AnalyticsService Implementation
 * @phase Phase 6.3 - SEO & Analytics
 * @complexity STANDARD tier (~400 lines, ≤4 dependencies)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { DbResult } from '@core/types/db';
import { CountResult, TopPageResult, TopSearchResult, PageViewTrendResult, ListingViewResult } from '@core/types/analytics';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces & Types
// ============================================================================

export interface PageViewData {
  url: string;
  title?: string;
  userId?: number;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface CustomEventData {
  eventName: string;
  eventData?: Record<string, unknown>;
  userId?: number;
  sessionId?: string;
}

export interface ConversionData {
  conversionType: string;  // 'signup', 'purchase', 'subscription', 'listing_create', etc.
  value?: number;
  userId?: number;
  sessionId?: string;
}

export interface ListingViewData {
  listingId: number;
  userId?: number;
  sessionId?: string;
}

export interface SearchQueryData {
  query: string;
  resultsCount: number;
  userId?: number;
  sessionId?: string;
}

export interface AnalyticsSummary {
  pageViews: number;
  uniqueVisitors: number;
  events: number;
  conversions: number;
  topPages: Array<{
    url: string;
    views: number;
  }>;
  topSearches: Array<{
    query: string;
    count: number;
  }>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Service Class
// ============================================================================

export class InternalAnalyticsService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // TRACKING METHODS (Fire-and-forget for performance)
  // ==========================================================================

  /**
   * Track page view event
   *
   * @param data - Page view tracking data
   * @returns Promise<void> - Fire-and-forget, swallows errors to not impact request
   *
   * @example
   * ```typescript
   * await analyticsService.trackPageView({
   *   url: '/listings/123',
   *   title: 'Amazing Coffee Shop',
   *   userId: 456,
   *   sessionId: 'sess_abc123',
   *   referrer: 'https://google.com'
   * });
   * ```
   */
  async trackPageView(data: PageViewData): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO analytics_page_views (
          url, title, user_id, session_id, referrer, user_agent, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.url,
          data.title || null,
          data.userId || null,
          data.sessionId || null,
          data.referrer || null,
          data.userAgent || null,
          data.ipAddress || null
        ]
      );
    } catch (error) {
      // CIRCUIT BREAKER: Don't fail the original request if analytics tracking fails
    }
  }

  /**
   * Track custom event
   *
   * @param data - Custom event tracking data
   * @returns Promise<void> - Fire-and-forget
   *
   * @example
   * ```typescript
   * await analyticsService.trackEvent({
   *   eventName: 'listing_share',
   *   eventData: { platform: 'facebook', listingId: 123 },
   *   userId: 456
   * });
   * ```
   */
  async trackEvent(data: CustomEventData): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO analytics_events (
          event_name, event_data, user_id, session_id
        ) VALUES (?, ?, ?, ?)`,
        [
          data.eventName,
          data.eventData ? JSON.stringify(data.eventData) : null,
          data.userId || null,
          data.sessionId || null
        ]
      );
    } catch (error) {
    }
  }

  /**
   * Track conversion event (signup, purchase, subscription)
   *
   * @param data - Conversion tracking data
   * @returns Promise<void> - Fire-and-forget
   *
   * @example
   * ```typescript
   * await analyticsService.trackConversion({
   *   conversionType: 'subscription',
   *   value: 49.99,
   *   userId: 456
   * });
   * ```
   */
  async trackConversion(data: ConversionData): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO analytics_conversions (
          conversion_type, value, user_id, session_id
        ) VALUES (?, ?, ?, ?)`,
        [
          data.conversionType,
          data.value || null,
          data.userId || null,
          data.sessionId || null
        ]
      );
    } catch (error) {
    }
  }

  /**
   * Track listing view event
   *
   * @param data - Listing view tracking data
   * @returns Promise<void> - Fire-and-forget
   *
   * @example
   * ```typescript
   * await analyticsService.trackListingView({
   *   listingId: 123,
   *   userId: 456,
   *   sessionId: 'sess_abc123'
   * });
   * ```
   */
  async trackListingView(data: ListingViewData): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO analytics_listing_views (
          listing_id, user_id, session_id
        ) VALUES (?, ?, ?)`,
        [
          data.listingId,
          data.userId || null,
          data.sessionId || null
        ]
      );
    } catch (error) {
    }
  }

  /**
   * Track search query
   *
   * @param data - Search query tracking data
   * @returns Promise<void> - Fire-and-forget
   *
   * @example
   * ```typescript
   * await analyticsService.trackSearchQuery({
   *   query: 'coffee shops near me',
   *   resultsCount: 15,
   *   userId: 456
   * });
   * ```
   */
  async trackSearchQuery(data: SearchQueryData): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO analytics_searches (
          query, results_count, user_id, session_id
        ) VALUES (?, ?, ?, ?)`,
        [
          data.query,
          data.resultsCount,
          data.userId || null,
          data.sessionId || null
        ]
      );
    } catch (error) {
    }
  }

  // ==========================================================================
  // RETRIEVAL METHODS
  // ==========================================================================

  /**
   * Get analytics summary for date range
   *
   * @param timeRange - Time range to analyze
   * @returns Promise<AnalyticsSummary>
   *
   * @example
   * ```typescript
   * const summary = await analyticsService.getAnalyticsSummary({
   *   start: new Date('2024-01-01'),
   *   end: new Date('2024-01-31')
   * });
   * ```
   */
  async getAnalyticsSummary(timeRange: TimeRange): Promise<AnalyticsSummary> {
    // Get page views count
    const pageViewsResult: DbResult = await this.db.query(
      `SELECT COUNT(*) as count
       FROM analytics_page_views
       WHERE created_at >= ? AND created_at <= ?`,
      [timeRange.start, timeRange.end]
    );

    // Get unique visitors count (distinct session_id)
    const uniqueVisitorsResult: DbResult = await this.db.query(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM analytics_page_views
       WHERE created_at >= ? AND created_at <= ?
       AND session_id IS NOT NULL`,
      [timeRange.start, timeRange.end]
    );

    // Get events count
    const eventsResult: DbResult = await this.db.query(
      `SELECT COUNT(*) as count
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?`,
      [timeRange.start, timeRange.end]
    );

    // Get conversions count
    const conversionsResult: DbResult = await this.db.query(
      `SELECT COUNT(*) as count
       FROM analytics_conversions
       WHERE created_at >= ? AND created_at <= ?`,
      [timeRange.start, timeRange.end]
    );

    // Get top pages
    const topPagesResult: DbResult = await this.db.query(
      `SELECT url, COUNT(*) as views
       FROM analytics_page_views
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY url
       ORDER BY views DESC
       LIMIT 10`,
      [timeRange.start, timeRange.end]
    );

    // Get top searches
    const topSearchesResult: DbResult = await this.db.query(
      `SELECT query, COUNT(*) as count
       FROM analytics_searches
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY query
       ORDER BY count DESC
       LIMIT 10`,
      [timeRange.start, timeRange.end]
    );

    const pageViewRow = pageViewsResult.rows[0] as CountResult | undefined;
    const uniqueVisitorsRow = uniqueVisitorsResult.rows[0] as CountResult | undefined;
    const eventsRow = eventsResult.rows[0] as CountResult | undefined;
    const conversionsRow = conversionsResult.rows[0] as CountResult | undefined;

    return {
      pageViews: pageViewRow?.count || 0,
      uniqueVisitors: uniqueVisitorsRow?.count || 0,
      events: eventsRow?.count || 0,
      conversions: conversionsRow?.count || 0,
      topPages: topPagesResult.rows.map((row) => ({
        url: (row as TopPageResult).url,
        views: (row as TopPageResult).views
      })),
      topSearches: topSearchesResult.rows.map((row) => ({
        query: (row as TopSearchResult).query,
        count: (row as TopSearchResult).count
      }))
    };
  }

  /**
   * Get page view trend data
   *
   * @param timeRange - Time range to analyze
   * @returns Promise<Array> - Page view counts by date
   */
  async getPageViewTrend(
    timeRange: TimeRange
  ): Promise<Array<{ date: string; views: number }>> {
    const result: DbResult = await this.db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as views
       FROM analytics_page_views
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [timeRange.start, timeRange.end]
    );

    return result.rows.map((row) => ({
      date: (row as PageViewTrendResult).date,
      views: (row as PageViewTrendResult).views
    }));
  }

  /**
   * Get most viewed listings
   *
   * @param limit - Number of listings to return
   * @param timeRange - Time range to analyze
   * @returns Promise<Array>
   */
  async getMostViewedListings(
    limit: number = 10,
    timeRange: TimeRange
  ): Promise<Array<{ listingId: number; views: number }>> {
    const result: DbResult = await this.db.query(
      `SELECT listing_id as listingId, COUNT(*) as views
       FROM analytics_listing_views
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY listing_id
       ORDER BY views DESC
       LIMIT ?`,
      [timeRange.start, timeRange.end, limit]
    );

    return result.rows.map((row) => ({
      listingId: (row as ListingViewResult).listingId,
      views: (row as ListingViewResult).views
    }));
  }

  /**
   * Get conversion rate for time range
   *
   * @param timeRange - Time range to analyze
   * @returns Promise<number> - Conversion rate as percentage
   */
  async getConversionRate(timeRange: TimeRange): Promise<number> {
    const visitorsResult: DbResult = await this.db.query(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM analytics_page_views
       WHERE created_at >= ? AND created_at <= ?
       AND session_id IS NOT NULL`,
      [timeRange.start, timeRange.end]
    );

    const conversionsResult: DbResult = await this.db.query(
      `SELECT COUNT(*) as count
       FROM analytics_conversions
       WHERE created_at >= ? AND created_at <= ?`,
      [timeRange.start, timeRange.end]
    );

    const visitorsRow = visitorsResult.rows[0] as CountResult | undefined;
    const conversionsRow = conversionsResult.rows[0] as CountResult | undefined;

    const visitors = visitorsRow?.count || 0;
    const conversions = conversionsRow?.count || 0;

    if (visitors === 0) return 0;

    return (conversions / visitors) * 100;
  }
}
