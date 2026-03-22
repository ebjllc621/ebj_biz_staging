/**
 * BizWireAnalyticsService - BizWire Contact Analytics Tracking
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Build Map v2.1 ENHANCED patterns
 * - All COUNT(*) queries use bigIntToNumber()
 *
 * @authority docs/components/contactListing/phases/PHASE_1_PLAN.md
 * @tier ADVANCED
 * @reference src/core/services/ListingMessageService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface BizWireAnalyticsEvent {
  listing_id: number;
  sender_user_id?: number;
  message_id?: number;
  source_page: string;
  source_entity_type?: string;
  source_entity_id?: number;
  action: 'modal_opened' | 'message_sent' | 'reply_sent' | 'message_read';
  device_type?: string;
  referrer_url?: string;
}

export interface BizWireAnalyticsSummary {
  total_messages: number;
  unread_messages: number;
  total_threads: number;
  avg_response_time_hours: number;
  response_rate: number;
  source_breakdown: Array<{ source: string; count: number; percentage: number }>;
  volume_over_time: Array<{ date: string; count: number }>;
}

// ============================================================================
// BizWireAnalyticsService Implementation
// ============================================================================

export class BizWireAnalyticsService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Track a BizWire analytics event
   */
  async trackEvent(event: BizWireAnalyticsEvent): Promise<number> {
    const sql = `
      INSERT INTO bizwire_analytics (
        listing_id, sender_user_id, message_id, source_page,
        source_entity_type, source_entity_id, action, device_type, referrer_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      event.listing_id,
      event.sender_user_id || null,
      event.message_id || null,
      event.source_page,
      event.source_entity_type || null,
      event.source_entity_id || null,
      event.action,
      event.device_type || null,
      event.referrer_url || null
    ];

    const result = await this.db.query(sql, params) as DbResult;
    return Number(result.insertId);
  }

  /**
   * Get aggregated analytics for a listing
   */
  async getListingAnalytics(listingId: number, days: number = 30): Promise<BizWireAnalyticsSummary> {
    // Total messages sent to this listing
    const msgCountSql = `
      SELECT COUNT(*) AS total
      FROM listing_messages
      WHERE listing_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const msgResult: DbResult<{ total: bigint | number }> = await this.db.query(msgCountSql, [listingId, days]);
    const total_messages = bigIntToNumber(msgResult.rows[0]?.total || 0);

    // Unread messages
    const unreadSql = `
      SELECT COUNT(*) AS total
      FROM listing_messages
      WHERE listing_id = ? AND is_read = 0
    `;
    const unreadResult: DbResult<{ total: bigint | number }> = await this.db.query(unreadSql, [listingId]);
    const unread_messages = bigIntToNumber(unreadResult.rows[0]?.total || 0);

    // Total threads
    const threadSql = `
      SELECT COUNT(DISTINCT thread_id) AS total
      FROM listing_messages
      WHERE listing_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const threadResult: DbResult<{ total: bigint | number }> = await this.db.query(threadSql, [listingId, days]);
    const total_threads = bigIntToNumber(threadResult.rows[0]?.total || 0);

    // Source breakdown
    const source_breakdown = await this.getSourceBreakdown(listingId, days);

    // Response metrics
    const responseMetrics = await this.getResponseMetrics(listingId, days);

    // Volume over time (daily for the period)
    const volumeSql = `
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM bizwire_analytics
      WHERE listing_id = ? AND action = 'message_sent'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const volumeResult: DbResult<{ date: string; count: bigint | number }> = await this.db.query(volumeSql, [listingId, days]);
    const volume_over_time = (volumeResult.rows || []).map(row => ({
      date: String(row.date),
      count: bigIntToNumber(row.count)
    }));

    return {
      total_messages,
      unread_messages,
      total_threads,
      avg_response_time_hours: responseMetrics.avg_response_time_hours,
      response_rate: responseMetrics.response_rate,
      source_breakdown,
      volume_over_time
    };
  }

  /**
   * Get source page breakdown for contacts
   */
  async getSourceBreakdown(
    listingId: number,
    days: number = 30
  ): Promise<Array<{ source: string; count: number; percentage: number }>> {
    const sql = `
      SELECT source_page AS source, COUNT(*) AS count
      FROM bizwire_analytics
      WHERE listing_id = ? AND action = 'message_sent'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY source_page
      ORDER BY count DESC
    `;

    const result: DbResult<{ source: string; count: bigint | number }> = await this.db.query(sql, [listingId, days]);
    const rows = result.rows || [];

    const totalCount = rows.reduce((sum, row) => sum + bigIntToNumber(row.count), 0);

    return rows.map(row => {
      const count = bigIntToNumber(row.count);
      return {
        source: row.source,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      };
    });
  }

  /**
   * Get response metrics (average response time + response rate)
   */
  async getResponseMetrics(
    listingId: number,
    days: number = 30
  ): Promise<{ avg_response_time_hours: number; response_rate: number }> {
    // Get threads with at least one reply from listing owner
    const sql = `
      SELECT
        COUNT(DISTINCT lm.thread_id) AS threads_with_reply,
        AVG(TIMESTAMPDIFF(HOUR, first_msg.first_time, reply.reply_time)) AS avg_hours
      FROM listing_messages lm
      JOIN (
        SELECT thread_id, MIN(created_at) AS first_time
        FROM listing_messages
        WHERE listing_id = ?
        GROUP BY thread_id
      ) first_msg ON lm.thread_id = first_msg.thread_id
      LEFT JOIN (
        SELECT thread_id, MIN(created_at) AS reply_time
        FROM listing_messages
        WHERE listing_id = ?
          AND sender_user_id IN (SELECT user_id FROM listings WHERE id = ?)
        GROUP BY thread_id
      ) reply ON lm.thread_id = reply.thread_id
      WHERE lm.listing_id = ?
        AND lm.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND reply.reply_time IS NOT NULL
    `;

    const result: DbResult<{ threads_with_reply: bigint | number; avg_hours: number | null }> =
      await this.db.query(sql, [listingId, listingId, listingId, listingId, days]);

    const threadsWithReply = bigIntToNumber(result.rows[0]?.threads_with_reply || 0);

    // Total threads for response rate
    const totalThreadsSql = `
      SELECT COUNT(DISTINCT thread_id) AS total
      FROM listing_messages
      WHERE listing_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const totalResult: DbResult<{ total: bigint | number }> = await this.db.query(totalThreadsSql, [listingId, days]);
    const totalThreads = bigIntToNumber(totalResult.rows[0]?.total || 0);

    return {
      avg_response_time_hours: result.rows[0]?.avg_hours ?? 0,
      response_rate: totalThreads > 0 ? Math.round((threadsWithReply / totalThreads) * 100) : 0
    };
  }
}
