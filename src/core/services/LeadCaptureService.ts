/**
 * LeadCaptureService - Unified lead capture with tier-based access control
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Uses BizError
 * - Build Map v2.1 ENHANCED patterns
 * - Tier enforcement at service layer
 * - bigIntToNumber for ALL COUNT(*) results
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @phase Phase 2B - Lead Capture System
 * @tier ADVANCED
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ListingService } from '@core/services/ListingService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// TYPES
// ============================================================================

export type LeadInteractionType =
  | 'general_inquiry'
  | 'quote_request'
  | 'message'
  | 'appointment'
  | 'bookmark'
  | 'contact_click'
  | 'directions_click';

export type LeadSource =
  | 'contact_form'
  | 'bizwire'
  | 'listing_detail'
  | 'search_results'
  | 'share_link'
  | 'direct'
  | 'social';

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'archived';

export interface ListingLead {
  id: number;
  listing_id: number;
  user_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  interaction_type: LeadInteractionType;
  source: LeadSource;
  source_url: string | null;
  message_preview: string | null;
  source_record_id: number | null;
  source_record_type: 'inquiry' | 'message' | null;
  tier_at_capture: string;
  status: LeadStatus;
  captured_at: string;
  updated_at: string;
}

export interface CaptureLeadParams {
  listingId: number;
  userId?: number;
  name: string;
  email: string;
  phone?: string;
  interactionType: LeadInteractionType;
  source?: LeadSource;
  sourceUrl?: string;
  messagePreview?: string;
  sourceRecordId?: number;
  sourceRecordType?: 'inquiry' | 'message';
  tierAtCapture?: string;
}

export interface GetLeadsParams {
  listingId: number;
  page?: number;
  limit?: number;
  interactionType?: LeadInteractionType;
  status?: LeadStatus;
  startDate?: string;
  endDate?: string;
}

export interface GetLeadsResult {
  leads: ListingLead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadSummary {
  total: number;
  thisMonth: number;
  byType: Array<{ type: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
}

export interface LeadExportEligibility {
  canExport: boolean;
  emailAccess: boolean;
  phoneAccess: boolean;
  monthlyLimit: number;
  remainingExports: number;
  tier: string;
}

export interface ExportLeadsCSVParams {
  listingId: number;
  userId: number;
  interactionType?: LeadInteractionType;
  status?: LeadStatus;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// TIER LIMITS
// ============================================================================

const LEAD_EXPORT_LIMITS = {
  essentials: { canExport: false, emailAccess: false, phoneAccess: false, monthlyLimit: 0 },
  plus:       { canExport: false, emailAccess: true,  phoneAccess: false, monthlyLimit: 50 },
  preferred:  { canExport: true,  emailAccess: true,  phoneAccess: true,  monthlyLimit: 500 },
  premium:    { canExport: true,  emailAccess: true,  phoneAccess: true,  monthlyLimit: -1 }
} as const;

// ============================================================================
// SERVICE
// ============================================================================

/**
 * LeadCaptureService
 *
 * Handles unified lead capture, retrieval, summary, and CSV export
 * with tier-based access control and usage tracking.
 *
 * @tier ADVANCED
 */
export class LeadCaptureService {
  private db: DatabaseService;
  private listingService: ListingService | null;

  constructor(db: DatabaseService, listingService?: ListingService | null) {
    this.db = db;
    this.listingService = listingService ?? null;
  }

  /**
   * Capture a lead into the unified listing_leads table.
   * Looks up listing tier internally if not provided.
   */
  async captureLead(params: CaptureLeadParams): Promise<number> {
    let tierAtCapture = params.tierAtCapture;

    // Look up tier if not provided
    if (!tierAtCapture) {
      if (this.listingService) {
        const listing = await this.listingService.getById(params.listingId);
        tierAtCapture = listing?.tier ?? 'essentials';
      } else {
        const tierResult = await this.db.query<{ tier: string }>(
          'SELECT tier FROM listings WHERE id = ?',
          [params.listingId]
        );
        tierAtCapture = tierResult.rows[0]?.tier ?? 'essentials';
      }
    }

    const result = await this.db.query(
      `INSERT INTO listing_leads (
        listing_id, user_id, name, email, phone,
        interaction_type, source, source_url, message_preview,
        source_record_id, source_record_type, tier_at_capture, status,
        captured_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW(), NOW())`,
      [
        params.listingId,
        params.userId ?? null,
        params.name,
        params.email,
        params.phone ?? null,
        params.interactionType,
        params.source ?? 'contact_form',
        params.sourceUrl ?? null,
        params.messagePreview ?? null,
        params.sourceRecordId ?? null,
        params.sourceRecordType ?? null,
        tierAtCapture
      ]
    );

    return Number(result.insertId);
  }

  /**
   * Get paginated leads for a listing with optional filters.
   */
  async getLeads(params: GetLeadsParams): Promise<GetLeadsResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['listing_id = ?'];
    const values: unknown[] = [params.listingId];

    if (params.interactionType) {
      conditions.push('interaction_type = ?');
      values.push(params.interactionType);
    }

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }

    if (params.startDate) {
      conditions.push('captured_at >= ?');
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push('captured_at <= ?');
      values.push(params.endDate + ' 23:59:59');
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countResult = await this.db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM listing_leads WHERE ${whereClause}`,
      values
    );
    const total = bigIntToNumber(countResult.rows[0]?.count ?? 0n);
    const totalPages = Math.ceil(total / limit);

    // Fetch rows
    const leadsResult = await this.db.query<ListingLead>(
      `SELECT id, listing_id, user_id, name, email, phone,
              interaction_type, source, source_url, message_preview,
              source_record_id, source_record_type, tier_at_capture, status,
              captured_at, updated_at
       FROM listing_leads
       WHERE ${whereClause}
       ORDER BY captured_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return {
      leads: leadsResult.rows,
      pagination: { page, limit, total, totalPages }
    };
  }

  /**
   * Get lead summary totals for a listing.
   */
  async getLeadSummary(
    listingId: number,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<LeadSummary> {
    // Total
    const totalResult = await this.db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM listing_leads WHERE listing_id = ?',
      [listingId]
    );
    const total = bigIntToNumber(totalResult.rows[0]?.count ?? 0n);

    // This month
    const thisMonthResult = await this.db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM listing_leads
       WHERE listing_id = ? AND captured_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [listingId]
    );
    const thisMonth = bigIntToNumber(thisMonthResult.rows[0]?.count ?? 0n);

    // By type
    let byTypeSql = `SELECT interaction_type as type, COUNT(*) as count
                     FROM listing_leads WHERE listing_id = ?`;
    const byTypeValues: unknown[] = [listingId];

    if (dateRange?.startDate) {
      byTypeSql += ' AND captured_at >= ?';
      byTypeValues.push(dateRange.startDate);
    }
    if (dateRange?.endDate) {
      byTypeSql += ' AND captured_at <= ?';
      byTypeValues.push(dateRange.endDate + ' 23:59:59');
    }
    byTypeSql += ' GROUP BY interaction_type ORDER BY count DESC';

    const byTypeResult = await this.db.query<{ type: string; count: bigint }>(
      byTypeSql,
      byTypeValues
    );
    const byType = byTypeResult.rows.map(row => ({
      type: row.type,
      count: bigIntToNumber(row.count)
    }));

    // By source
    let bySourceSql = `SELECT source, COUNT(*) as count
                       FROM listing_leads WHERE listing_id = ?`;
    const bySourceValues: unknown[] = [listingId];

    if (dateRange?.startDate) {
      bySourceSql += ' AND captured_at >= ?';
      bySourceValues.push(dateRange.startDate);
    }
    if (dateRange?.endDate) {
      bySourceSql += ' AND captured_at <= ?';
      bySourceValues.push(dateRange.endDate + ' 23:59:59');
    }
    bySourceSql += ' GROUP BY source ORDER BY count DESC';

    const bySourceResult = await this.db.query<{ source: string; count: bigint }>(
      bySourceSql,
      bySourceValues
    );
    const bySource = bySourceResult.rows.map(row => ({
      source: row.source,
      count: bigIntToNumber(row.count)
    }));

    return { total, thisMonth, byType, bySource };
  }

  /**
   * Check export eligibility for a listing based on tier.
   * Mirrors OfferExportService.checkExportEligibility with phoneAccess added.
   */
  async checkExportEligibility(
    listingId: number,
    userId: number
  ): Promise<LeadExportEligibility> {
    let tier: string;

    if (this.listingService) {
      const listing = await this.listingService.getById(listingId);
      if (!listing) throw BizError.notFound('Listing', listingId);
      tier = listing.tier;
    } else {
      const tierResult = await this.db.query<{ tier: string }>(
        'SELECT tier FROM listings WHERE id = ?',
        [listingId]
      );
      if (tierResult.rows.length === 0) throw BizError.notFound('Listing', listingId);
      tier = tierResult.rows[0]?.tier ?? 'essentials';
    }

    const limits =
      LEAD_EXPORT_LIMITS[tier as keyof typeof LEAD_EXPORT_LIMITS] ??
      LEAD_EXPORT_LIMITS.essentials;

    let usedThisMonth = 0;
    if (limits.monthlyLimit !== -1) {
      const usageResult = await this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM export_usage
         WHERE user_id = ? AND listing_id = ? AND export_type = 'leads'
         AND exported_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
        [userId, listingId]
      );
      if (usageResult.rows.length > 0 && usageResult.rows[0]) {
        usedThisMonth = bigIntToNumber(usageResult.rows[0].count);
      }
    }

    const remainingExports =
      limits.monthlyLimit === -1
        ? 999999
        : Math.max(0, limits.monthlyLimit - usedThisMonth);

    return {
      canExport: limits.canExport,
      emailAccess: limits.emailAccess,
      phoneAccess: limits.phoneAccess,
      monthlyLimit: limits.monthlyLimit,
      remainingExports,
      tier
    };
  }

  /**
   * Export leads to CSV with tier-based field access control.
   */
  async exportLeadsCSV(params: ExportLeadsCSVParams): Promise<string> {
    const eligibility = await this.checkExportEligibility(params.listingId, params.userId);

    if (!eligibility.canExport) {
      throw BizError.forbidden(
        'Your tier does not allow lead exports. Upgrade to Preferred or Premium tier.'
      );
    }

    if (eligibility.remainingExports === 0) {
      throw BizError.forbidden(
        `Monthly export limit reached (${eligibility.monthlyLimit}). Upgrade for more exports.`
      );
    }

    // Fetch all leads matching filters (no pagination for export)
    const conditions: string[] = ['listing_id = ?'];
    const values: unknown[] = [params.listingId];

    if (params.interactionType) {
      conditions.push('interaction_type = ?');
      values.push(params.interactionType);
    }
    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.startDate) {
      conditions.push('captured_at >= ?');
      values.push(params.startDate);
    }
    if (params.endDate) {
      conditions.push('captured_at <= ?');
      values.push(params.endDate + ' 23:59:59');
    }

    const whereClause = conditions.join(' AND ');

    const leadsResult = await this.db.query<ListingLead>(
      `SELECT id, listing_id, user_id, name, email, phone,
              interaction_type, source, source_url, message_preview,
              source_record_id, source_record_type, tier_at_capture, status,
              captured_at, updated_at
       FROM listing_leads
       WHERE ${whereClause}
       ORDER BY captured_at DESC`,
      values
    );

    // Track export usage
    await this.db.query(
      `INSERT INTO export_usage (user_id, listing_id, export_type, exported_at)
       VALUES (?, ?, 'leads', NOW())`,
      [params.userId, params.listingId]
    );

    // Build CSV with UTF-8 BOM
    const BOM = '\uFEFF';

    // Build header row based on tier access
    const headers: string[] = ['Name'];
    if (eligibility.emailAccess) headers.push('Email');
    if (eligibility.phoneAccess) headers.push('Phone');
    headers.push('Type', 'Source', 'Message Preview', 'Status', 'Date');

    const headerRow = headers.map(h => escapeCSVValue(h)).join(',');

    const dataRows = leadsResult.rows.map(lead => {
      const row: string[] = [escapeCSVValue(lead.name)];
      if (eligibility.emailAccess) row.push(escapeCSVValue(lead.email));
      if (eligibility.phoneAccess) row.push(escapeCSVValue(lead.phone ?? ''));
      row.push(
        escapeCSVValue(lead.interaction_type),
        escapeCSVValue(lead.source),
        escapeCSVValue(lead.message_preview ?? ''),
        escapeCSVValue(lead.status),
        escapeCSVValue(lead.captured_at)
      );
      return row.join(',');
    });

    return BOM + [headerRow, ...dataRows].join('\r\n');
  }
}

// ============================================================================
// CSV HELPER (local — not exported from csvExport.ts due to Category coupling)
// ============================================================================

function escapeCSVValue(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let leadCaptureServiceInstance: LeadCaptureService | null = null;

export function getLeadCaptureService(): LeadCaptureService {
  if (!leadCaptureServiceInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    leadCaptureServiceInstance = new LeadCaptureService(getDatabaseService(), null);
  }
  return leadCaptureServiceInstance;
}
