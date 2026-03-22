/**
 * VanityURLService - Short URL CRUD Wrapper
 *
 * Service wrapper around existing url-shortener.ts utility functions.
 * Provides CRUD operations for short URLs using the existing url_shortcodes table.
 * Does NOT create new tables — url_shortcodes already exists (8 cols, 2 rows).
 *
 * url_shortcodes schema:
 *   id, short_code, full_url, entity_type ENUM('offer','listing','event'),
 *   entity_id, clicks, created_at, expires_at
 *
 * @tier SIMPLE
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/core/utils/url-shortener.ts - Wrapped utility functions
 * @reference src/core/services/InternalAnalyticsService.ts - Constructor pattern
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  createShortUrl as utilCreateShortUrl,
  resolveShortUrl as utilResolveShortUrl,
  buildShortUrl,
} from '@core/utils/url-shortener';

// ============================================================================
// TypeScript Interfaces & Types
// ============================================================================

// url_shortcodes entity_type column only supports these three values
type ShortUrlEntityType = 'offer' | 'listing' | 'event';

interface CreateShortUrlParams {
  entityType: ShortUrlEntityType;
  entityId: number;
  fullUrl: string;
  expiresAt?: Date;
}

interface ShortUrlRecord {
  shortCode: string;
  fullUrl: string;
  clicks: number;
  createdAt: string;
}

interface ClickStats {
  totalClicks: number;
  urlCount: number;
}

// ============================================================================
// Service Class
// ============================================================================

export class VanityURLService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Create a short URL for any entity.
   * Returns the generated shortCode and the full short URL string.
   */
  async createShortUrl(
    params: CreateShortUrlParams
  ): Promise<{ shortCode: string; shortUrl: string }> {
    const { entityType, entityId, fullUrl, expiresAt } = params;

    const shortCode = await utilCreateShortUrl(
      this.db,
      fullUrl,
      entityType,
      entityId,
      expiresAt
    );

    const shortUrl = buildShortUrl(shortCode);

    return { shortCode, shortUrl };
  }

  /**
   * Resolve a short code to the full URL with automatic click tracking.
   * The underlying resolveShortUrl() increments the clicks counter (fire-and-forget).
   * Returns null if the code is not found or expired.
   */
  async resolveAndTrack(shortCode: string): Promise<string | null> {
    try {
      return await utilResolveShortUrl(this.db, shortCode);
    } catch {
      // CIRCUIT BREAKER: Don't propagate tracking errors
      return null;
    }
  }

  /**
   * Get click statistics for all short URLs belonging to an entity.
   */
  async getClickStats(
    entityType: ShortUrlEntityType,
    entityId: number
  ): Promise<ClickStats> {
    const result = await this.db.query<{
      total_clicks: bigint | number | null;
      url_count: bigint | number;
    }>(
      `SELECT SUM(clicks) as total_clicks, COUNT(*) as url_count
       FROM url_shortcodes
       WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );

    const row = result.rows[0];
    return {
      totalClicks: bigIntToNumber(row?.total_clicks ?? 0),
      urlCount: bigIntToNumber(row?.url_count ?? 0),
    };
  }

  /**
   * List all short URLs created for a given entity.
   */
  async getEntityShortUrls(
    entityType: ShortUrlEntityType,
    entityId: number
  ): Promise<ShortUrlRecord[]> {
    const result = await this.db.query<{
      short_code: string;
      full_url: string;
      clicks: number;
      created_at: Date | string;
    }>(
      `SELECT short_code, full_url, clicks, created_at
       FROM url_shortcodes
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );

    return result.rows.map((row) => ({
      shortCode: row.short_code,
      fullUrl: row.full_url,
      clicks: row.clicks,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }));
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: VanityURLService | null = null;

export function getVanityURLService(): VanityURLService {
  if (!instance) {
    const db = getDatabaseService();
    instance = new VanityURLService(db);
  }
  return instance;
}
