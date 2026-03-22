/**
 * ConnectionAnalyticsService - Connection Health & Analytics
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - BigInt handling: ALL COUNT(*) queries use bigIntToNumber()
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/contacts/services/ContactService.ts - Analytics pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { ConnectionHealth, UserConnection } from '../types';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Custom Errors
// ============================================================================

export class AnalyticsError extends BizError {
  constructor(message: string) {
    super({ code: 'ANALYTICS_ERROR', message, userMessage: message });
    this.name = 'AnalyticsError';
  }
}

// ============================================================================
// Additional Types
// ============================================================================

export interface ActivityTimelinePoint {
  date: string;
  new_connections: number;
  interactions: number;
}

export interface ConnectionTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface StaleConnection extends UserConnection {
  days_since_interaction: number;
}

// ============================================================================
// ConnectionAnalyticsService Implementation
// ============================================================================

export class ConnectionAnalyticsService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Calculate connection health score (0-100)
   * Based on:
   * - Active ratio (40%): connections with interaction in last 90 days
   * - Interaction score (30%): average interactions normalized
   * - Growth score (30%): new connections in last 30 days
   */
  async getConnectionHealth(userId: number): Promise<ConnectionHealth> {
    // 1. Get total connections
    const totalResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected'`,
      [userId, userId]
    );
    const totalConnections = bigIntToNumber(totalResult.rows[0]?.count);

    if (totalConnections === 0) {
      return {
        userId,
        healthScore: 0,
        totalConnections: 0,
        activeConnections: 0,
        staleConnections: 0,
        averageInteractionFrequency: 0,
        lastCalculated: new Date(),
        recommendations: ['Start connecting with others to build your network']
      };
    }

    // 2. Calculate active ratio (connections with interaction in last 90 days)
    const activeResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?)
         AND status = 'connected'
         AND last_interaction >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
      [userId, userId]
    );
    const activeConnections = bigIntToNumber(activeResult.rows[0]?.count);
    const activeRatio = totalConnections > 0 ? (activeConnections / totalConnections) : 0;
    const activeScore = activeRatio * 40; // 40% weight

    // 3. Calculate interaction score (average interactions normalized)
    const interactionResult: DbResult<{ avg_interactions: number | null }> = await this.db.query(
      `SELECT AVG(interaction_count) AS avg_interactions FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected'`,
      [userId, userId]
    );
    const avgInteractions = interactionResult.rows[0]?.avg_interactions || 0;
    // Normalize: 0 interactions = 0, 10+ interactions = 30
    const interactionScore = Math.min(30, (avgInteractions / 10) * 30); // 30% weight

    // 4. Calculate growth score (new connections in last 30 days)
    const growthResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?)
         AND status = 'connected'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId, userId]
    );
    const newConnections = bigIntToNumber(growthResult.rows[0]?.count);
    // Normalize: 0 new = 0, 5+ new = 30
    const growthScore = Math.min(30, (newConnections / 5) * 30); // 30% weight

    // 5. Calculate total health score
    const healthScore = Math.round(activeScore + interactionScore + growthScore);

    // 6. Calculate stale connections (no interaction in 90+ days)
    const staleConnections = totalConnections - activeConnections;

    // 7. Generate recommendations based on metrics
    const recommendations: string[] = [];

    if (activeRatio < 0.5) {
      recommendations.push('Over half of your connections are inactive. Try reaching out!');
    }

    if (avgInteractions < 3) {
      recommendations.push('Increase engagement by messaging or interacting with your connections');
    }

    if (newConnections === 0) {
      recommendations.push('Consider connecting with new people to grow your network');
    }

    if (staleConnections > 10) {
      recommendations.push(`You have ${staleConnections} stale connections. Reconnect with them!`);
    }

    if (healthScore >= 80) {
      recommendations.push('Your connection health is excellent! Keep up the great work.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your network is looking healthy. Keep engaging with your connections.');
    }

    return {
      userId,
      healthScore,
      totalConnections,
      activeConnections,
      staleConnections,
      averageInteractionFrequency: avgInteractions,
      lastCalculated: new Date(),
      recommendations
    };
  }

  /**
   * Get activity timeline for the last N days
   * Shows new connections and interactions per day
   */
  async getActivityTimeline(userId: number, days: number = 30): Promise<ActivityTimelinePoint[]> {
    const timeline: ActivityTimelinePoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0] || '';

      // Count new connections on this day
      const newConnectionsResult: DbResult<{ count: bigint | number }> = await this.db.query(
        `SELECT COUNT(*) AS count FROM user_connection
         WHERE (sender_user_id = ? OR receiver_user_id = ?)
           AND status = 'connected'
           AND DATE(created_at) = ?`,
        [userId, userId, dateStr]
      );
      const newConnections = bigIntToNumber(newConnectionsResult.rows[0]?.count);

      // Count interactions on this day (simplified - using last_interaction)
      const interactionsResult: DbResult<{ count: bigint | number }> = await this.db.query(
        `SELECT COUNT(*) AS count FROM user_connection
         WHERE (sender_user_id = ? OR receiver_user_id = ?)
           AND status = 'connected'
           AND DATE(last_interaction) = ?`,
        [userId, userId, dateStr]
      );
      const interactions = bigIntToNumber(interactionsResult.rows[0]?.count);

      timeline.push({
        date: dateStr,
        new_connections: newConnections,
        interactions
      });
    }

    return timeline;
  }

  /**
   * Get connection type distribution with percentages
   */
  async getConnectionTypeDistribution(userId: number): Promise<ConnectionTypeDistribution[]> {
    const result: DbResult<{ connection_type: string | null; count: bigint | number }> = await this.db.query(
      `SELECT connection_type, COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected'
       GROUP BY connection_type`,
      [userId, userId]
    );

    // Get total for percentage calculation
    const totalResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected'`,
      [userId, userId]
    );
    const total = bigIntToNumber(totalResult.rows[0]?.count);

    const distribution: ConnectionTypeDistribution[] = result.rows.map(row => {
      const count = bigIntToNumber(row.count);
      return {
        type: row.connection_type || 'unspecified',
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });

    return distribution;
  }

  /**
   * Get stale connections (no interaction in X days)
   * Returns connections with days_since_interaction field
   */
  async getStaleConnections(userId: number, staleDays: number = 90): Promise<StaleConnection[]> {
    const result: DbResult<any> = await this.db.query(
      `SELECT
        uc.id,
        CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id
          ELSE uc.sender_user_id
        END AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color,
        uc.connection_type,
        uc.created_at AS connected_since,
        uc.mutual_connections,
        uc.interaction_count,
        uc.last_interaction,
        uc.notes,
        uc.tags,
        DATEDIFF(NOW(), COALESCE(uc.last_interaction, uc.created_at)) AS days_since_interaction
      FROM user_connection uc
      JOIN users u ON (
        CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id = u.id
          ELSE uc.sender_user_id = u.id
        END
      )
      WHERE (uc.sender_user_id = ? OR uc.receiver_user_id = ?)
        AND uc.status = 'connected'
        AND (uc.last_interaction IS NULL OR uc.last_interaction < DATE_SUB(NOW(), INTERVAL ? DAY))
      ORDER BY days_since_interaction DESC`,
      [userId, userId, userId, userId, staleDays]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color || null,
      connection_type: row.connection_type,
      connected_since: new Date(row.connected_since),
      mutual_connections: row.mutual_connections,
      interaction_count: row.interaction_count,
      last_interaction: row.last_interaction ? new Date(row.last_interaction) : null,
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : null,
      days_since_interaction: row.days_since_interaction
    }));
  }
}
