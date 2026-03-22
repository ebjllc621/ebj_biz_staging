/**
 * SocialShareService - Entity-Agnostic UTM Link Generation & Share Analytics
 *
 * Extracts inline UTM parameter generation from individual share modals
 * (ListingShareModal, OfferShareModal, JobShareModal, EventShareModal)
 * into a single reusable server-side service.
 *
 * @tier STANDARD
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/core/services/InternalAnalyticsService.ts - Constructor pattern
 * @reference src/features/listings/components/ListingShareModal.tsx - UTM building pattern
 * @reference src/core/utils/url-shortener.ts - Short URL creation
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  createShortUrl,
  resolveShortUrl,
  buildShortUrl,
} from '@core/utils/url-shortener';

// ============================================================================
// TypeScript Interfaces & Types
// ============================================================================

export type EntityType = 'listing' | 'offer' | 'event' | 'job';

export interface ShareAnalytics {
  shares_by_platform: Array<{
    platform: string;
    count: number;
    total_clicks: number;
  }>;
  total_shares: number;
  total_clicks: number;
  conversion_rate: number;
}

interface BuildShareUrlParams {
  entityType: EntityType;
  slug: string;
  platform: string;
  campaign?: string;
}

interface GenerateShortShareUrlParams {
  entityType: EntityType;
  entityId: number;
  slug: string;
  platform: string;
}

interface TrackShareClickParams {
  shortCode: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}

// ============================================================================
// Entity Path Mapping
// ============================================================================

const ENTITY_PATHS: Record<EntityType, string> = {
  listing: '/listings/',
  offer: '/offers/',
  event: '/events/',
  job: '/jobs/',
};

// url_shortcodes entity_type enum only supports 'offer' | 'listing' | 'event'
type ShortUrlEntityType = 'offer' | 'listing' | 'event';

function toShortUrlEntityType(entityType: EntityType): ShortUrlEntityType {
  if (entityType === 'job') return 'listing'; // fallback — job not in url_shortcodes enum
  return entityType as ShortUrlEntityType;
}

// ============================================================================
// Service Class
// ============================================================================

export class SocialShareService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Build a share URL with UTM parameters for any entity type.
   * Extracts the inline pattern from ListingShareModal.buildShareUrl().
   *
   * @example
   * buildShareUrl({ entityType: 'listing', slug: 'my-cafe', platform: 'facebook' })
   * // → https://bizconekt.com/listings/my-cafe?utm_source=facebook&utm_medium=social&...
   */
  buildShareUrl(params: BuildShareUrlParams): string {
    const { entityType, slug, platform, campaign } = params;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
    const entityPath = ENTITY_PATHS[entityType];
    const url = new URL(`${baseUrl}${entityPath}${slug}`);

    url.searchParams.set('utm_source', platform);
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', campaign || `${entityType}_share`);
    url.searchParams.set('utm_content', slug);

    return url.toString();
  }

  /**
   * Generate a short URL for sharing.
   * Wraps createShortUrl() + buildShortUrl() from url-shortener.ts.
   */
  async generateShortShareUrl(
    params: GenerateShortShareUrlParams
  ): Promise<{ shareUrl: string; shortUrl: string }> {
    const { entityType, entityId, slug, platform } = params;
    const shareUrl = this.buildShareUrl({ entityType, slug, platform });
    const shortUrlEntityType = toShortUrlEntityType(entityType);

    const shortCode = await createShortUrl(
      this.db,
      shareUrl,
      shortUrlEntityType,
      entityId
    );
    const shortUrl = buildShortUrl(shortCode);

    return { shareUrl, shortUrl };
  }

  /**
   * Track a click on a shared link.
   * Resolves the short code to a redirect URL. Returns null if not found/expired.
   * Fire-and-forget pattern — metadata recording never fails the caller.
   */
  async trackShareClick(params: TrackShareClickParams): Promise<string | null> {
    const { shortCode } = params;

    try {
      const redirectUrl = await resolveShortUrl(this.db, shortCode);
      return redirectUrl;
    } catch {
      // CIRCUIT BREAKER: Don't propagate tracking errors
      return null;
    }
  }

  /**
   * Get aggregated share analytics for any entity.
   * Queries listing_shares table (Phase 1A) for listing entities.
   * For other entity types, queries offer_shares if entity_type matches.
   */
  async getShareAnalytics(
    entityType: EntityType,
    entityId: number
  ): Promise<ShareAnalytics> {
    try {
      // Determine the correct shares table based on entity type
      let sharesQuery: string;
      let clicksQuery: string;

      if (entityType === 'listing') {
        sharesQuery = `
          SELECT platform, COUNT(*) as count
          FROM listing_shares
          WHERE listing_id = ?
          GROUP BY platform
          ORDER BY count DESC
        `;
        clicksQuery = `
          SELECT COUNT(*) as total_clicks
          FROM listing_share_clicks
          WHERE listing_id = ?
        `;
      } else if (entityType === 'offer') {
        sharesQuery = `
          SELECT platform, COUNT(*) as count, 0 as total_clicks
          FROM offer_shares
          WHERE offer_id = ?
          GROUP BY platform
          ORDER BY count DESC
        `;
        clicksQuery = `
          SELECT COUNT(*) as total_clicks FROM offer_shares WHERE offer_id = ? AND 1=0
        `;
      } else {
        // Events and jobs: query url_shortcodes for click tracking
        sharesQuery = `
          SELECT 'direct' as platform, COUNT(*) as count
          FROM url_shortcodes
          WHERE entity_type = ? AND entity_id = ?
          GROUP BY entity_type
        `;
        // Use different binding for non-listing types
        const sharesResult = await this.db.query<{
          platform: string;
          count: bigint | number;
        }>(sharesQuery, [toShortUrlEntityType(entityType), entityId]);

        const clicksResult = await this.db.query<{ total_clicks: bigint | number }>(
          `SELECT SUM(clicks) as total_clicks FROM url_shortcodes WHERE entity_type = ? AND entity_id = ?`,
          [toShortUrlEntityType(entityType), entityId]
        );

        const sharesByPlatform = sharesResult.rows.map((row) => ({
          platform: row.platform,
          count: bigIntToNumber(row.count),
          total_clicks: 0,
        }));
        const totalShares = sharesByPlatform.reduce((sum, r) => sum + r.count, 0);
        const clicksRow = clicksResult.rows[0];
        const totalClicks = bigIntToNumber(clicksRow?.total_clicks ?? 0);

        return {
          shares_by_platform: sharesByPlatform,
          total_shares: totalShares,
          total_clicks: totalClicks,
          conversion_rate: totalShares > 0 ? (totalClicks / totalShares) * 100 : 0,
        };
      }

      const sharesResult = await this.db.query<{
        platform: string;
        count: bigint | number;
      }>(sharesQuery, [entityId]);

      const clicksResult = await this.db.query<{ total_clicks: bigint | number }>(
        clicksQuery,
        [entityId]
      );

      const clicksRow = clicksResult.rows[0];
      const totalClicks = bigIntToNumber(clicksRow?.total_clicks ?? 0);

      const sharesByPlatform = sharesResult.rows.map((row) => ({
        platform: row.platform,
        count: bigIntToNumber(row.count),
        total_clicks: 0,
      }));

      const totalShares = sharesByPlatform.reduce((sum, r) => sum + r.count, 0);

      return {
        shares_by_platform: sharesByPlatform,
        total_shares: totalShares,
        total_clicks: totalClicks,
        conversion_rate: totalShares > 0 ? (totalClicks / totalShares) * 100 : 0,
      };
    } catch {
      // Return empty analytics on error — don't fail callers
      return {
        shares_by_platform: [],
        total_shares: 0,
        total_clicks: 0,
        conversion_rate: 0,
      };
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: SocialShareService | null = null;

export function getSocialShareService(): SocialShareService {
  if (!instance) {
    const db = getDatabaseService();
    instance = new SocialShareService(db);
  }
  return instance;
}
