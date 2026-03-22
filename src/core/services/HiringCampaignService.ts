/**
 * HiringCampaignService - Hiring Campaign Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/core/services/CampaignService.ts - Campaign pattern
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import type { HiringCampaignRow } from '@core/types/db-rows';
import type {
  HiringCampaign,
  CreateHiringCampaignInput,
  UpdateHiringCampaignInput,
  CampaignFilters,
  CampaignMetrics,
  PaginatedResult
} from '@features/jobs/types';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HiringCampaignService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // CAMPAIGN RETRIEVAL
  // ==========================================================================

  /**
   * Get hiring campaign by ID
   */
  async getCampaignById(campaignId: number): Promise<HiringCampaign | null> {
    const query = `
      SELECT *
      FROM hiring_campaigns
      WHERE id = ?
      LIMIT 1
    `;

    const result: DbResult<HiringCampaignRow> = await this.db.query(query, [campaignId]);
    const row = result.rows[0];

    return row ? this.mapRowToCampaign(row) : null;
  }

  /**
   * Get campaigns for a listing
   */
  async getCampaignsByListing(
    listingId: number,
    filters?: CampaignFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<HiringCampaign>> {
    const conditions: string[] = ['listing_id = ?'];
    const params: unknown[] = [listingId];

    if (filters?.campaign_type) {
      conditions.push('campaign_type = ?');
      params.push(filters.campaign_type);
    }

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.season) {
      conditions.push('season = ?');
      params.push(filters.season);
    }

    if (filters?.active_on_date) {
      conditions.push('start_date <= ? AND end_date >= ?');
      params.push(filters.active_on_date, filters.active_on_date);
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM hiring_campaigns
      WHERE ${conditions.join(' AND ')}
    `;

    const countResult: DbResult<{ total: bigint }> = await this.db.query(countQuery, params);
    const total = bigIntToNumber(countResult.rows[0]?.total || 0n);

    // Get campaigns
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT *
      FROM hiring_campaigns
      WHERE ${conditions.join(' AND ')}
      ORDER BY start_date DESC
      LIMIT ? OFFSET ?
    `;

    const result: DbResult<HiringCampaignRow> = await this.db.query(query, params);
    const campaigns = result.rows.map(row => this.mapRowToCampaign(row));

    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(date: Date = new Date()): Promise<HiringCampaign[]> {
    const query = `
      SELECT *
      FROM hiring_campaigns
      WHERE status = 'active'
        AND start_date <= ?
        AND end_date >= ?
      ORDER BY start_date DESC
    `;

    const result: DbResult<HiringCampaignRow> = await this.db.query(query, [date, date]);
    return result.rows.map(row => this.mapRowToCampaign(row));
  }

  /**
   * Get seasonal campaigns
   */
  async getSeasonalCampaigns(season: string): Promise<HiringCampaign[]> {
    const query = `
      SELECT *
      FROM hiring_campaigns
      WHERE season = ?
        AND status IN ('active', 'pending_approval', 'approved')
      ORDER BY start_date ASC
    `;

    const result: DbResult<HiringCampaignRow> = await this.db.query(query, [season]);
    return result.rows.map(row => this.mapRowToCampaign(row));
  }

  // ==========================================================================
  // CAMPAIGN MUTATIONS
  // ==========================================================================

  /**
   * Create hiring campaign
   */
  async createCampaign(input: CreateHiringCampaignInput): Promise<HiringCampaign> {
    // Validate dates
    const startDate = typeof input.start_date === 'string' ? new Date(input.start_date) : input.start_date;
    const endDate = typeof input.end_date === 'string' ? new Date(input.end_date) : input.end_date;

    if (endDate <= startDate) {
      throw new BizError({
        code: 'INVALID_CAMPAIGN_DATES',
        message: 'Campaign end date must be after start date',
      });
    }

    const query = `
      INSERT INTO hiring_campaigns (
        listing_id, campaign_name, campaign_type, hiring_goal,
        target_roles, target_categories, season, start_date,
        end_date, budget, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW(), NOW())
    `;

    const params = [
      input.listing_id,
      input.campaign_name,
      input.campaign_type,
      input.hiring_goal || null,
      input.target_roles ? JSON.stringify(input.target_roles) : null,
      input.target_categories ? JSON.stringify(input.target_categories) : null,
      input.season || null,
      startDate,
      endDate,
      input.budget || null,
      input.notes || null
    ];

    const result = await this.db.query(query, params);
    const insertId = bigIntToNumber(result.insertId);

    const campaign = await this.getCampaignById(insertId);
    if (!campaign) {
      throw new BizError({
        code: 'CAMPAIGN_CREATION_FAILED',
        message: 'Failed to retrieve created campaign'
      });
    }

    return campaign;
  }

  /**
   * Update hiring campaign
   */
  async updateCampaign(campaignId: number, input: UpdateHiringCampaignInput): Promise<HiringCampaign> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new BizError({
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'Hiring campaign not found',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.campaign_name !== undefined) {
      updates.push('campaign_name = ?');
      params.push(input.campaign_name);
    }

    if (input.campaign_type !== undefined) {
      updates.push('campaign_type = ?');
      params.push(input.campaign_type);
    }

    if (input.hiring_goal !== undefined) {
      updates.push('hiring_goal = ?');
      params.push(input.hiring_goal);
    }

    if (input.target_roles !== undefined) {
      updates.push('target_roles = ?');
      params.push(input.target_roles ? JSON.stringify(input.target_roles) : null);
    }

    if (input.target_categories !== undefined) {
      updates.push('target_categories = ?');
      params.push(input.target_categories ? JSON.stringify(input.target_categories) : null);
    }

    if (input.season !== undefined) {
      updates.push('season = ?');
      params.push(input.season);
    }

    if (input.start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(input.start_date);
    }

    if (input.end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(input.end_date);
    }

    if (input.budget !== undefined) {
      updates.push('budget = ?');
      params.push(input.budget);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.performance_metrics !== undefined) {
      updates.push('performance_metrics = ?');
      params.push(input.performance_metrics ? JSON.stringify(input.performance_metrics) : null);
    }

    if (input.notes !== undefined) {
      updates.push('notes = ?');
      params.push(input.notes);
    }

    if (updates.length === 0) {
      return campaign;
    }

    updates.push('updated_at = NOW()');
    params.push(campaignId);

    const query = `
      UPDATE hiring_campaigns
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await this.db.query(query, params);

    const updatedCampaign = await this.getCampaignById(campaignId);
    if (!updatedCampaign) {
      throw new BizError({
        code: 'CAMPAIGN_UPDATE_FAILED',
        message: 'Failed to retrieve updated campaign'
      });
    }

    return updatedCampaign;
  }

  /**
   * Approve campaign (admin action)
   */
  async approveCampaign(campaignId: number, adminUserId: number): Promise<HiringCampaign> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new BizError({
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'Hiring campaign not found',
      });
    }

    if (campaign.status !== 'pending_approval') {
      throw new BizError({
        code: 'INVALID_CAMPAIGN_STATUS',
        message: 'Campaign must be in pending_approval status',
      });
    }

    const query = `
      UPDATE hiring_campaigns
      SET status = 'approved',
          approved_by_user_id = ?,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `;

    await this.db.query(query, [adminUserId, campaignId]);

    const approvedCampaign = await this.getCampaignById(campaignId);
    if (!approvedCampaign) {
      throw new BizError({
        code: 'CAMPAIGN_APPROVAL_FAILED',
        message: 'Failed to retrieve approved campaign'
      });
    }

    return approvedCampaign;
  }

  /**
   * Update campaign performance metrics
   */
  async updatePerformanceMetrics(campaignId: number, metrics: CampaignMetrics): Promise<void> {
    const query = `
      UPDATE hiring_campaigns
      SET performance_metrics = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await this.db.query(query, [JSON.stringify(metrics), campaignId]);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new BizError({
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'Hiring campaign not found',
      });
    }

    // Only allow deletion of draft campaigns
    if (campaign.status !== 'draft') {
      throw new BizError({
        code: 'CANNOT_DELETE_ACTIVE_CAMPAIGN',
        message: 'Only draft campaigns can be deleted. Archive instead.',
      });
    }

    const query = 'DELETE FROM hiring_campaigns WHERE id = ?';
    await this.db.query(query, [campaignId]);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Map database row to HiringCampaign interface
   */
  private mapRowToCampaign(row: HiringCampaignRow): HiringCampaign {
    return {
      id: row.id,
      listing_id: row.listing_id,
      campaign_name: row.campaign_name,
      campaign_type: row.campaign_type,
      hiring_goal: row.hiring_goal,
      target_roles: row.target_roles ? safeJsonParse<string[]>(row.target_roles, []) : null,
      target_categories: row.target_categories ? safeJsonParse<number[]>(row.target_categories, []) : null,
      season: row.season,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      budget: row.budget ? parseFloat(row.budget) : null,
      status: row.status,
      approved_by_user_id: row.approved_by_user_id,
      approved_at: row.approved_at ? new Date(row.approved_at) : null,
      performance_metrics: row.performance_metrics
        ? safeJsonParse<CampaignMetrics | null>(row.performance_metrics, null)
        : null,
      notes: row.notes,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

let serviceInstance: HiringCampaignService | null = null;

export function getHiringCampaignService(): HiringCampaignService {
  if (!serviceInstance) {
    const db = getDatabaseService();
    serviceInstance = new HiringCampaignService(db);
  }
  return serviceInstance;
}
