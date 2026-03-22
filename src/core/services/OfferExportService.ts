/**
 * OfferExportService - Lead export and analytics export with tier-based access control
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Tier enforcement at service layer
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 3 Brain Plan - Export Service Implementation
 * @phase Phase 3 - Task 3.1: OfferExportService Implementation
 * @tier ADVANCED
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ListingService } from '@core/services/ListingService';
import { OfferService } from '@core/services/OfferService';
import { BizError } from '@core/errors/BizError';
import {
  ExportFilters,
  CSVExportResult,
  ExportEligibility
} from '@features/offers/types';

// Tier-based export limits
const TIER_EXPORT_LIMITS = {
  essentials: { canExport: false, emailAccess: false, monthlyLimit: 0 },
  plus: { canExport: false, emailAccess: true, monthlyLimit: 50 },
  preferred: { canExport: true, emailAccess: true, monthlyLimit: 500 },
  premium: { canExport: true, emailAccess: true, monthlyLimit: -1 } // unlimited
} as const;

/**
 * OfferExportService
 *
 * Handles CSV/Excel export of offer claims and analytics data
 * with tier-based access control and usage tracking.
 *
 * @tier ADVANCED
 */
export class OfferExportService {
  private db: DatabaseService;
  private listingService: ListingService;
  private offerService: OfferService;

  constructor(
    db: DatabaseService,
    listingService: ListingService,
    offerService: OfferService
  ) {
    this.db = db;
    this.listingService = listingService;
    this.offerService = offerService;
  }

  /**
   * Export claims for an offer to CSV
   * @param offerId - Offer ID
   * @param listingId - Listing ID for ownership verification
   * @param userId - User ID requesting export
   * @param filters - Optional export filters
   * @returns CSV export result
   */
  async exportClaims(
    offerId: number,
    listingId: number,
    userId: number,
    filters?: ExportFilters
  ): Promise<CSVExportResult> {
    // Verify user owns listing
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    if (listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to export this data');
    }

    // Check tier-based eligibility
    const eligibility = await this.checkExportEligibility(listingId, userId);
    if (!eligibility.canExport) {
      throw BizError.forbidden(
        'Your tier does not allow claim exports. Upgrade to Preferred or Premium tier.'
      );
    }

    if (eligibility.remainingExports === 0) {
      throw BizError.forbidden(
        `Monthly export limit reached (${eligibility.monthlyLimit}). Upgrade for more exports.`
      );
    }

    // Include email only if tier allows
    const finalFilters = {
      ...filters,
      includeEmail: eligibility.emailAccess && filters?.includeEmail
    };

    // Export claims via OfferService
    const result = await this.offerService.exportClaimsToCSV(offerId, finalFilters);

    // Track export usage (TD-P3-002)
    await this.trackExportUsage(userId, listingId, 'claims');

    return result;
  }

  /**
   * Export share click analytics for an offer to CSV
   * @param offerId - Offer ID
   * @param listingId - Listing ID for ownership verification
   * @param userId - User ID requesting export
   * @param filters - Optional export filters
   * @returns CSV export result
   */
  async exportShareClicks(
    offerId: number,
    listingId: number,
    userId: number,
    filters?: ExportFilters
  ): Promise<CSVExportResult> {
    // Verify user owns listing
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    if (listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to export this data');
    }

    // Check tier-based eligibility
    const eligibility = await this.checkExportEligibility(listingId, userId);
    if (!eligibility.canExport) {
      throw BizError.forbidden(
        'Your tier does not allow analytics exports. Upgrade to Preferred or Premium tier.'
      );
    }

    // Export analytics via OfferService
    const result = await this.offerService.exportAnalyticsToCSV(offerId, filters);

    // Track export usage (TD-P3-002)
    await this.trackExportUsage(userId, listingId, 'analytics');

    return result;
  }

  /**
   * Check export eligibility for a listing based on tier
   * @param listingId - Listing ID
   * @param userId - User ID
   * @returns Export eligibility result
   */
  async checkExportEligibility(
    listingId: number,
    userId: number
  ): Promise<ExportEligibility> {
    // Get listing tier
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    const tier = listing.tier as keyof typeof TIER_EXPORT_LIMITS;
    const limits = TIER_EXPORT_LIMITS[tier] || TIER_EXPORT_LIMITS.essentials;

    // Get actual usage count for current month (TD-P3-002)
    let usedThisMonth = 0;
    if (limits.monthlyLimit !== -1) {
      const usageResult = await this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM export_usage
         WHERE user_id = ? AND listing_id = ?
         AND exported_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
        [userId, listingId]
      );
      if (usageResult.rows.length > 0 && usageResult.rows[0]) {
        const { bigIntToNumber } = await import('@core/utils/bigint');
        usedThisMonth = bigIntToNumber(usageResult.rows[0].count);
      }
    }

    const remainingExports = limits.monthlyLimit === -1
      ? 999999 // Unlimited
      : Math.max(0, limits.monthlyLimit - usedThisMonth);

    return {
      canExport: limits.canExport,
      emailAccess: limits.emailAccess,
      monthlyLimit: limits.monthlyLimit,
      remainingExports,
      tier: listing.tier
    };
  }

  /**
   * Track export usage for tier limit enforcement
   * @param userId - User ID
   * @param listingId - Listing ID
   * @param exportType - Type of export
   * @private
   * @phase TD-P3-002 - Implemented
   */
  private async trackExportUsage(
    userId: number,
    listingId: number,
    exportType: 'claims' | 'analytics'
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO export_usage (user_id, listing_id, export_type, exported_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, listingId, exportType]
    );
  }
}
