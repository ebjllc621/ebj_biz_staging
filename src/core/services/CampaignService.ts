/**
 * CampaignService - Marketing Campaign Management Service
 *
 * @tier ADVANCED
 * @complexity Enterprise-grade campaign management with approval workflows
 * @methods 18 methods (create, update, approve, reject, performance tracking)
 * @authority Build Map v2.1 ENHANCED
 * @database campaigns table
 *
 * Manages marketing campaigns including:
 * - Campaign CRUD operations
 * - Approval workflow (admin approval required)
 * - Campaign performance tracking (impressions, clicks, conversions)
 * - Budget management and cost calculation
 * - Target audience size estimation
 * - Campaign lifecycle (draft → pending → approved → active → completed)
 *
 * @see docs/buildSpecs/incorporationV_old/phases/PHASE_5.3_BRAIN_PLAN.md
 */

import { DatabaseService, getDatabaseService } from './DatabaseService';
import { DbResult } from '@core/types/db';
import { CampaignRow } from '@core/types/db-rows';
import { RowDataPacket, ResultSetHeader } from '@core/types/mariadb-compat';
import { bigIntToNumber } from '@core/utils/bigint';

export type CampaignType = 'sponsored_listing' | 'featured_event' | 'featured_offer' | 'banner_ad' | 'email_blast';
export type CampaignStatus = 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';

export interface CampaignTargeting {
  categories?: number[];
  locations?: string[];
  tiers?: string[];
  engagement?: 'high' | 'medium' | 'low';
}

export interface CampaignCreatives {
  images?: string[];
  text?: string;
  cta?: string;
}

export interface Campaign {
  id: number;
  user_id: number;
  campaign_type: CampaignType;
  title: string;
  description?: string;
  target_audience?: CampaignTargeting;
  budget: number;
  daily_budget?: number;
  start_date: Date;
  end_date: Date;
  creatives?: CampaignCreatives;
  status: CampaignStatus;
  admin_notes?: string;
  rejection_reason?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  total_spent: number;
  created_at: Date;
  updated_at: Date;
  approved_by?: number;
}

export interface CreateCampaignInput {
  user_id: number;
  campaign_type: CampaignType;
  title: string;
  description?: string;
  target_audience?: CampaignTargeting;
  budget: number;
  daily_budget?: number;
  start_date: Date;
  end_date: Date;
  creatives?: CampaignCreatives;
}

export interface CampaignFilter {
  user_id?: number;
  campaign_type?: CampaignType;
  status?: CampaignStatus;
  start_date?: Date;
  end_date?: Date;
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export interface CampaignPerformance {
  id: number;
  title: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click-through rate
  conversion_rate: number;
  total_spent: number;
  cost_per_click: number;
  cost_per_conversion: number;
  roi: number; // Return on investment
}

export interface CampaignStatistics {
  totalCampaigns: number;
  activeCampaigns: number;
  pendingApproval: number;
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCTR: number;
  averageConversionRate: number;
}

export class CampaignService {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || getDatabaseService();
  }

  /**
   * Get all campaigns with optional filters and pagination
   *
   * @param filters - Optional filtering criteria
   * @param pagination - Pagination options
   * @returns Array of campaigns
   */
  async getAllCampaigns(filters?: CampaignFilter, pagination?: Pagination): Promise<Campaign[]> {
    let query = 'SELECT * FROM campaigns WHERE 1=1';
    const params: (string | number | Date)[] = [];

    if (filters) {
      if (filters.user_id) {
        query += ' AND user_id = ?';
        params.push(filters.user_id);
      }
      if (filters.campaign_type) {
        query += ' AND campaign_type = ?';
        params.push(filters.campaign_type);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.start_date) {
        query += ' AND start_date >= ?';
        params.push(filters.start_date);
      }
      if (filters.end_date) {
        query += ' AND end_date <= ?';
        params.push(filters.end_date);
      }
    }

    query += ' ORDER BY created_at DESC';

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const result: DbResult<CampaignRow> = await this.db.query(query, params);

    return result.rows.map((row) => this.mapRowToCampaign(row));
  }

  /**
   * Get a single campaign by ID
   *
   * @param id - Campaign ID
   * @returns Campaign or null if not found
   */
  async getCampaignById(id: number): Promise<Campaign | null> {
    const result: DbResult<CampaignRow> = await this.db.query(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToCampaign(row);
  }

  /**
   * Create a new campaign
   *
   * @param data - Campaign creation data
   * @returns Created campaign ID
   */
  async createCampaign(data: CreateCampaignInput): Promise<number> {
    const result = await this.db.query(
      `INSERT INTO campaigns (
        user_id, campaign_type, title, description, target_audience,
        budget, daily_budget, start_date, end_date, creatives, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        data.user_id,
        data.campaign_type,
        data.title,
        data.description || null,
        data.target_audience ? JSON.stringify(data.target_audience) : null,
        data.budget,
        data.daily_budget || null,
        data.start_date,
        data.end_date,
        data.creatives ? JSON.stringify(data.creatives) : null
      ]
    );

    return result.insertId || 0;
  }

  /**
   * Update an existing campaign
   *
   * @param id - Campaign ID
   * @param updates - Partial campaign data to update
   * @returns Number of affected rows
   */
  async updateCampaign(id: number, updates: Partial<CreateCampaignInput>): Promise<number> {
    const fields: string[] = [];
    const params: (string | number | Date)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.target_audience !== undefined) {
      fields.push('target_audience = ?');
      params.push(JSON.stringify(updates.target_audience));
    }
    if (updates.budget !== undefined) {
      fields.push('budget = ?');
      params.push(updates.budget);
    }
    if (updates.daily_budget !== undefined) {
      fields.push('daily_budget = ?');
      params.push(updates.daily_budget);
    }
    if (updates.start_date !== undefined) {
      fields.push('start_date = ?');
      params.push(updates.start_date);
    }
    if (updates.end_date !== undefined) {
      fields.push('end_date = ?');
      params.push(updates.end_date);
    }
    if (updates.creatives !== undefined) {
      fields.push('creatives = ?');
      params.push(JSON.stringify(updates.creatives));
    }

    if (fields.length === 0) return 0;

    params.push(id);

    const result = await this.db.query(
      `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return result.rowCount;
  }

  /**
   * Delete a campaign
   *
   * @param id - Campaign ID
   * @returns Number of affected rows
   */
  async deleteCampaign(id: number): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM campaigns WHERE id = ?',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Approve a campaign (admin action)
   *
   * @param id - Campaign ID
   * @param adminId - Admin user ID approving the campaign
   * @returns Number of affected rows
   */
  async approveCampaign(id: number, adminId: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET status = \'approved\', approved_by = ? WHERE id = ? AND status = \'pending\'',
      [adminId, id]
    );

    return result.rowCount;
  }

  /**
   * Reject a campaign (admin action)
   *
   * @param id - Campaign ID
   * @param reason - Reason for rejection
   * @returns Number of affected rows
   */
  async rejectCampaign(id: number, reason: string): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET status = \'rejected\', rejection_reason = ? WHERE id = ? AND status = \'pending\'',
      [reason, id]
    );

    return result.rowCount;
  }

  /**
   * Pause an active campaign
   *
   * @param id - Campaign ID
   * @returns Number of affected rows
   */
  async pauseCampaign(id: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET status = \'paused\' WHERE id = ? AND status = \'active\'',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Resume a paused campaign
   *
   * @param id - Campaign ID
   * @returns Number of affected rows
   */
  async resumeCampaign(id: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET status = \'active\' WHERE id = ? AND status = \'paused\'',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Submit campaign for approval
   *
   * @param id - Campaign ID
   * @returns Number of affected rows
   */
  async submitForApproval(id: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET status = \'pending\' WHERE id = ? AND status = \'draft\'',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Get campaign performance metrics
   *
   * @param id - Campaign ID
   * @returns Campaign performance data
   */
  async getCampaignPerformance(id: number): Promise<CampaignPerformance | null> {
    const result = await this.db.query(
      'SELECT id, title, impressions, clicks, conversions, total_spent FROM campaigns WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as { id: number; title: string; impressions: number; clicks: number; conversions: number; total_spent: number };
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    const conversions = Number(row.conversions) || 0;
    const totalSpent = Number(row.total_spent) || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const costPerClick = clicks > 0 ? totalSpent / clicks : 0;
    const costPerConversion = conversions > 0 ? totalSpent / conversions : 0;

    // Simplified ROI calculation (would need revenue data for accurate calculation)
    const roi = totalSpent > 0 ? ((conversions * 100) - totalSpent) / totalSpent * 100 : 0;

    return {
      id: row.id,
      title: row.title,
      impressions,
      clicks,
      conversions,
      ctr: Number(ctr.toFixed(2)),
      conversion_rate: Number(conversionRate.toFixed(2)),
      total_spent: totalSpent,
      cost_per_click: Number(costPerClick.toFixed(2)),
      cost_per_conversion: Number(costPerConversion.toFixed(2)),
      roi: Number(roi.toFixed(2))
    };
  }

  /**
   * Get campaign statistics
   *
   * @returns Aggregate campaign statistics
   */
  async getCampaignStatistics(): Promise<CampaignStatistics> {
    const result = await this.db.query(
      `SELECT
        COUNT(*) as totalCampaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCampaigns,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingApproval,
        SUM(total_spent) as totalSpent,
        SUM(impressions) as totalImpressions,
        SUM(clicks) as totalClicks,
        SUM(conversions) as totalConversions,
        AVG(CASE WHEN impressions > 0 THEN (clicks / impressions) * 100 ELSE 0 END) as averageCTR,
        AVG(CASE WHEN clicks > 0 THEN (conversions / clicks) * 100 ELSE 0 END) as averageConversionRate
      FROM campaigns`,
      []
    );

    interface CampaignStatsRow {
      totalCampaigns: number;
      activeCampaigns: number;
      pendingApproval: number;
      totalSpent: number;
      totalImpressions: number;
      totalClicks: number;
      totalConversions: number;
      averageCTR: number;
      averageConversionRate: number;
    }
    const stats = (result.rows[0] || {}) as Partial<CampaignStatsRow>;

    return {
      totalCampaigns: Number(stats.totalCampaigns) || 0,
      activeCampaigns: Number(stats.activeCampaigns) || 0,
      pendingApproval: Number(stats.pendingApproval) || 0,
      totalSpent: Number(stats.totalSpent) || 0,
      totalImpressions: Number(stats.totalImpressions) || 0,
      totalClicks: Number(stats.totalClicks) || 0,
      totalConversions: Number(stats.totalConversions) || 0,
      averageCTR: Number((stats.averageCTR || 0).toFixed(2)),
      averageConversionRate: Number((stats.averageConversionRate || 0).toFixed(2))
    };
  }

  /**
   * Estimate target audience size
   *
   * @param targeting - Campaign targeting criteria
   * @returns Estimated audience size
   */
  async getTargetAudienceSize(targeting: CampaignTargeting): Promise<number> {
    let query = 'SELECT COUNT(DISTINCT u.id) as audienceSize FROM users u';
    const joins: string[] = [];
    const conditions: string[] = ['1=1'];
    const params: (string | number | number[] | string[])[] = [];

    // Filter by tier
    if (targeting.tiers && targeting.tiers.length > 0) {
      conditions.push('u.membership_tier IN (?)');
      params.push(targeting.tiers);
    }

    // Filter by categories (users with listings in specific categories)
    if (targeting.categories && targeting.categories.length > 0) {
      joins.push('LEFT JOIN listings l ON l.user_id = u.id');
      conditions.push('l.category_id IN (?)');
      params.push(targeting.categories);
    }

    // Add joins
    if (joins.length > 0) {
      query += ' ' + joins.join(' ');
    }

    // Add conditions
    query += ' WHERE ' + conditions.join(' AND ');

    const result = await this.db.query(query, params);
    const row = result.rows[0] as { audienceSize?: number } | undefined;
    return row?.audienceSize || 0;
  }

  /**
   * Calculate campaign cost estimate
   *
   * @param data - Campaign data
   * @returns Estimated total cost
   */
  async calculateCampaignCost(data: CreateCampaignInput): Promise<number> {
    // Base costs per campaign type (simplified pricing model)
    const baseCosts: Record<CampaignType, number> = {
      'sponsored_listing': 50,
      'featured_event': 75,
      'featured_offer': 60,
      'banner_ad': 100,
      'email_blast': 150
    };

    const baseCost = baseCosts[data.campaign_type] || 50;

    // Calculate duration in days
    const durationMs = data.end_date.getTime() - data.start_date.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    // Estimate total cost (base cost * days, capped by budget)
    const estimatedCost = baseCost * durationDays;

    return Math.min(estimatedCost, data.budget);
  }

  /**
   * Track campaign impression
   *
   * @param id - Campaign ID
   * @returns Number of affected rows
   */
  async trackImpression(id: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET impressions = impressions + 1 WHERE id = ? AND status = \'active\'',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Track campaign click
   *
   * @param id - Campaign ID
   * @returns Number of affected rows
   */
  async trackClick(id: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET clicks = clicks + 1 WHERE id = ? AND status = \'active\'',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Track campaign conversion
   *
   * @param id - Campaign ID
   * @param amount - Conversion amount (for cost tracking)
   * @returns Number of affected rows
   */
  async trackConversion(id: number, amount: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE campaigns SET conversions = conversions + 1, total_spent = total_spent + ? WHERE id = ? AND status = \'active\'',
      [amount, id]
    );

    return result.rowCount;
  }

  /**
   * Get campaigns pending approval
   *
   * @param pagination - Pagination options
   * @returns Array of pending campaigns
   */
  async getPendingCampaigns(pagination?: Pagination): Promise<Campaign[]> {
    return this.getAllCampaigns({ status: 'pending' }, pagination);
  }

  /**
   * Map database row to Campaign object
   *
   * @param row - Database row
   * @returns Campaign object
   */
  private mapRowToCampaign(row: CampaignRow): Campaign {
    return {
      id: row.id,
      user_id: row.user_id,
      campaign_type: row.campaign_type,
      title: row.title,
      description: row.description || undefined,
      target_audience: row.target_audience ? JSON.parse(row.target_audience) : undefined,
      budget: row.budget,
      daily_budget: row.daily_budget || undefined,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      creatives: row.creatives ? JSON.parse(row.creatives) : undefined,
      status: row.status,
      admin_notes: row.admin_notes || undefined,
      rejection_reason: row.rejection_reason || undefined,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      conversions: row.conversions || 0,
      total_spent: row.total_spent || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      approved_by: row.approved_by || undefined
    };
  }
}
