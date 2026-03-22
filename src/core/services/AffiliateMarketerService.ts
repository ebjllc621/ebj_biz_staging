/**
 * AffiliateMarketerService - Affiliate Marketer Profile Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (ContentAffiliateMarketerRow, etc.)
 * - MariaDB patterns: ? placeholders, bigIntToNumber, JSON parse guard, TINYINT boolean
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 1
 * @reference src/core/services/GuideService.ts - Exact patterns replicated
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type { DbResult } from '@core/types/db';
import type {
  ContentAffiliateMarketerRow,
  AffiliateMarketerPortfolioRow,
  AffiliateMarketerReviewRow
} from '@core/types/db-rows';
import type {
  AffiliateMarketerProfile,
  PortfolioItem,
  AffiliateMarketerReview,
  AffiliateMarketerFilters,
  AffiliateMarketerSortOption,
  CreateAffiliateMarketerInput,
  UpdateAffiliateMarketerInput,
  CreatePortfolioItemInput,
  UpdatePortfolioItemInput
} from '@core/types/affiliate-marketer';
import type { CreateContactProposalInput } from '@core/types/content-contact-proposal';
import { AffiliateMarketerStatus } from '@core/types/affiliate-marketer';

// ============================================================================
// Local Pagination Types (matches GuideService pattern)
// ============================================================================

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class AffiliateMarketerNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'AFFILIATE_MARKETER_NOT_FOUND',
      message: `Affiliate marketer not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested affiliate marketer profile was not found'
    });
  }
}

export class DuplicateAffiliateMarketerSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_AFFILIATE_MARKETER_SLUG',
      message: `Affiliate marketer slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'An affiliate marketer profile with this URL slug already exists'
    });
  }
}

export class PortfolioItemNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'PORTFOLIO_ITEM_NOT_FOUND',
      message: `Portfolio item not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested portfolio item was not found'
    });
  }
}

export class DuplicateProfileReviewError extends BizError {
  constructor() {
    super({
      code: 'DUPLICATE_PROFILE_REVIEW',
      message: 'You have already reviewed this profile',
      context: {},
      userMessage: 'You have already reviewed this profile'
    });
  }
}

// ============================================================================
// AffiliateMarketerService Implementation
// ============================================================================

export class AffiliateMarketerService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get affiliate marketer profiles with optional filters, pagination, and sorting
   */
  async getMarketers(
    filters?: AffiliateMarketerFilters,
    pagination?: PaginationParams,
    sort?: AffiliateMarketerSortOption
  ): Promise<PaginatedResult<AffiliateMarketerProfile>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT cam.* FROM content_affiliate_marketers cam';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.status !== undefined) {
      conditions.push('cam.status = ?');
      params.push(filters.status);
    }

    if (filters?.location !== undefined) {
      conditions.push('cam.location LIKE ?');
      params.push(`%${filters.location}%`);
    }

    if (filters?.niches !== undefined && filters.niches.length > 0) {
      conditions.push('JSON_CONTAINS(cam.niches, ?)');
      params.push(JSON.stringify(filters.niches));
    }

    if (filters?.platforms !== undefined && filters.platforms.length > 0) {
      conditions.push('JSON_CONTAINS(cam.platforms, ?)');
      params.push(JSON.stringify(filters.platforms));
    }

    if (filters?.is_verified !== undefined) {
      conditions.push('cam.is_verified = ?');
      params.push(filters.is_verified ? 1 : 0);
    }

    if (filters?.is_featured !== undefined) {
      conditions.push('cam.is_featured = ?');
      params.push(filters.is_featured ? 1 : 0);
    }

    if (filters?.minRating !== undefined) {
      conditions.push('cam.rating_average >= ?');
      params.push(filters.minRating);
    }

    if (filters?.searchQuery) {
      conditions.push('(cam.display_name LIKE ? OR cam.headline LIKE ? OR cam.bio LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_affiliate_marketers cam${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentAffiliateMarketerRow> = await this.db.query<ContentAffiliateMarketerRow>(sql, params);

    return {
      data: result.rows.map(row => this.mapRowToProfile(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get affiliate marketer profile by ID
   */
  async getMarketerById(id: number): Promise<AffiliateMarketerProfile | null> {
    const result: DbResult<ContentAffiliateMarketerRow> = await this.db.query<ContentAffiliateMarketerRow>(
      'SELECT * FROM content_affiliate_marketers WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToProfile(row);
  }

  /**
   * Get affiliate marketer profile by slug
   */
  async getMarketerBySlug(slug: string): Promise<AffiliateMarketerProfile | null> {
    const result: DbResult<ContentAffiliateMarketerRow> = await this.db.query<ContentAffiliateMarketerRow>(
      'SELECT * FROM content_affiliate_marketers WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToProfile(row);
  }

  /**
   * Get affiliate marketer profile by user ID
   */
  async getProfileByUserId(userId: number): Promise<AffiliateMarketerProfile | null> {
    const result: DbResult<ContentAffiliateMarketerRow> = await this.db.query<ContentAffiliateMarketerRow>(
      'SELECT * FROM content_affiliate_marketers WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToProfile(row);
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new affiliate marketer profile
   */
  async createProfile(userId: number, data: CreateAffiliateMarketerInput): Promise<AffiliateMarketerProfile> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.display_name);

    // Check for duplicate slug
    const existing = await this.getMarketerBySlug(slug);
    if (existing) {
      throw new DuplicateAffiliateMarketerSlugError(slug);
    }

    const result: DbResult<ContentAffiliateMarketerRow> = await this.db.query<ContentAffiliateMarketerRow>(
      `INSERT INTO content_affiliate_marketers
       (user_id, listing_id, display_name, slug, profile_image, cover_image,
        headline, bio, location, niches, specializations, affiliate_networks,
        commission_range_min, commission_range_max, flat_fee_min, flat_fee_max,
        audience_size, audience_demographics, platforms, website_url, social_links,
        is_featured, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        data.listing_id || null,
        data.display_name,
        slug,
        data.profile_image || null,
        data.cover_image || null,
        data.headline || null,
        data.bio || null,
        data.location || null,
        JSON.stringify(data.niches || []),
        JSON.stringify(data.specializations || []),
        JSON.stringify(data.affiliate_networks || []),
        data.commission_range_min ?? null,
        data.commission_range_max ?? null,
        data.flat_fee_min ?? null,
        data.flat_fee_max ?? null,
        data.audience_size || 0,
        data.audience_demographics ? JSON.stringify(data.audience_demographics) : null,
        JSON.stringify(data.platforms || []),
        data.website_url || null,
        data.social_links ? JSON.stringify(data.social_links) : null,
        data.is_featured ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create affiliate marketer profile', new Error('No insert ID returned'));
    }

    const created = await this.getMarketerById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create affiliate marketer profile', new Error('Failed to retrieve created profile'));
    }

    return created;
  }

  /**
   * Update an affiliate marketer profile
   */
  async updateProfile(id: number, data: UpdateAffiliateMarketerInput): Promise<AffiliateMarketerProfile> {
    // Check profile exists
    const existing = await this.getMarketerById(id);
    if (!existing) {
      throw new AffiliateMarketerNotFoundError(id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getMarketerBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateAffiliateMarketerSlugError(data.slug);
      }
    }

    // Build dynamic SET columns
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(data.display_name);
    }

    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }

    if (data.listing_id !== undefined) {
      updates.push('listing_id = ?');
      params.push(data.listing_id);
    }

    if (data.profile_image !== undefined) {
      updates.push('profile_image = ?');
      params.push(data.profile_image);
    }

    if (data.cover_image !== undefined) {
      updates.push('cover_image = ?');
      params.push(data.cover_image);
    }

    if (data.headline !== undefined) {
      updates.push('headline = ?');
      params.push(data.headline);
    }

    if (data.bio !== undefined) {
      updates.push('bio = ?');
      params.push(data.bio);
    }

    if (data.location !== undefined) {
      updates.push('location = ?');
      params.push(data.location);
    }

    if (data.niches !== undefined) {
      updates.push('niches = ?');
      params.push(JSON.stringify(data.niches));
    }

    if (data.specializations !== undefined) {
      updates.push('specializations = ?');
      params.push(JSON.stringify(data.specializations));
    }

    if (data.affiliate_networks !== undefined) {
      updates.push('affiliate_networks = ?');
      params.push(JSON.stringify(data.affiliate_networks));
    }

    if (data.commission_range_min !== undefined) {
      updates.push('commission_range_min = ?');
      params.push(data.commission_range_min);
    }

    if (data.commission_range_max !== undefined) {
      updates.push('commission_range_max = ?');
      params.push(data.commission_range_max);
    }

    if (data.flat_fee_min !== undefined) {
      updates.push('flat_fee_min = ?');
      params.push(data.flat_fee_min);
    }

    if (data.flat_fee_max !== undefined) {
      updates.push('flat_fee_max = ?');
      params.push(data.flat_fee_max);
    }

    if (data.audience_size !== undefined) {
      updates.push('audience_size = ?');
      params.push(data.audience_size);
    }

    if (data.audience_demographics !== undefined) {
      updates.push('audience_demographics = ?');
      params.push(data.audience_demographics ? JSON.stringify(data.audience_demographics) : null);
    }

    if (data.platforms !== undefined) {
      updates.push('platforms = ?');
      params.push(JSON.stringify(data.platforms));
    }

    if (data.website_url !== undefined) {
      updates.push('website_url = ?');
      params.push(data.website_url);
    }

    if (data.social_links !== undefined) {
      updates.push('social_links = ?');
      params.push(data.social_links ? JSON.stringify(data.social_links) : null);
    }

    if (data.is_verified !== undefined) {
      updates.push('is_verified = ?');
      params.push(data.is_verified ? 1 : 0);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.published_at !== undefined) {
      updates.push('published_at = ?');
      params.push(data.published_at);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE content_affiliate_marketers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getMarketerById(id);
    if (!updated) {
      throw BizError.databaseError('update affiliate marketer profile', new Error('Failed to retrieve updated profile'));
    }

    return updated;
  }

  /**
   * Increment view count (fire-and-forget)
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_affiliate_marketers SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // PORTFOLIO OPERATIONS
  // ==========================================================================

  /**
   * Get portfolio items for an affiliate marketer
   */
  async getPortfolio(marketerId: number): Promise<PortfolioItem[]> {
    const result: DbResult<AffiliateMarketerPortfolioRow> = await this.db.query<AffiliateMarketerPortfolioRow>(
      'SELECT * FROM affiliate_marketer_portfolio WHERE marketer_id = ? ORDER BY sort_order ASC',
      [marketerId]
    );

    return result.rows.map(row => this.mapPortfolioRow(row));
  }

  /**
   * Add a portfolio item to an affiliate marketer profile
   */
  async addPortfolioItem(marketerId: number, data: CreatePortfolioItemInput): Promise<PortfolioItem> {
    // Verify marketer exists
    const marketer = await this.getMarketerById(marketerId);
    if (!marketer) {
      throw new AffiliateMarketerNotFoundError(marketerId);
    }

    // Calculate next sort_order
    const sortResult: DbResult<{ max_sort: number | null }> = await this.db.query<{ max_sort: number | null }>(
      'SELECT MAX(sort_order) as max_sort FROM affiliate_marketer_portfolio WHERE marketer_id = ?',
      [marketerId]
    );
    const sortOrder = (sortResult.rows[0]?.max_sort ?? 0) + 1;

    const result: DbResult<AffiliateMarketerPortfolioRow> = await this.db.query<AffiliateMarketerPortfolioRow>(
      `INSERT INTO affiliate_marketer_portfolio
       (marketer_id, brand_name, brand_logo, campaign_title, description,
        results_summary, conversion_rate, content_url, campaign_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        marketerId,
        data.brand_name || null,
        data.brand_logo || null,
        data.campaign_title || null,
        data.description || null,
        data.results_summary || null,
        data.conversion_rate ?? null,
        data.content_url || null,
        data.campaign_date || null,
        sortOrder
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('add portfolio item', new Error('No insert ID returned'));
    }

    const created = await this.getPortfolioItemById(result.insertId);
    if (!created) {
      throw BizError.databaseError('add portfolio item', new Error('Failed to retrieve created portfolio item'));
    }

    return created;
  }

  /**
   * Update a portfolio item
   */
  async updatePortfolioItem(id: number, data: UpdatePortfolioItemInput): Promise<PortfolioItem> {
    const existing = await this.getPortfolioItemById(id);
    if (!existing) {
      throw new PortfolioItemNotFoundError(id);
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.brand_name !== undefined) {
      updates.push('brand_name = ?');
      params.push(data.brand_name);
    }

    if (data.brand_logo !== undefined) {
      updates.push('brand_logo = ?');
      params.push(data.brand_logo);
    }

    if (data.campaign_title !== undefined) {
      updates.push('campaign_title = ?');
      params.push(data.campaign_title);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.results_summary !== undefined) {
      updates.push('results_summary = ?');
      params.push(data.results_summary);
    }

    if (data.conversion_rate !== undefined) {
      updates.push('conversion_rate = ?');
      params.push(data.conversion_rate);
    }

    if (data.content_url !== undefined) {
      updates.push('content_url = ?');
      params.push(data.content_url);
    }

    if (data.campaign_date !== undefined) {
      updates.push('campaign_date = ?');
      params.push(data.campaign_date);
    }

    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sort_order);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE affiliate_marketer_portfolio SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getPortfolioItemById(id);
    if (!updated) {
      throw BizError.databaseError('update portfolio item', new Error('Failed to retrieve updated portfolio item'));
    }

    return updated;
  }

  /**
   * Delete a portfolio item
   */
  async deletePortfolioItem(id: number): Promise<void> {
    const item = await this.getPortfolioItemById(id);
    if (!item) {
      throw new PortfolioItemNotFoundError(id);
    }

    await this.db.query('DELETE FROM affiliate_marketer_portfolio WHERE id = ?', [id]);
  }

  /**
   * Reorder portfolio items for an affiliate marketer
   * Updates sort_order for each item ID in the provided order
   * @phase Tier 3 Creator Profiles - Phase 8B
   * @reference src/core/services/GuideService.ts:589 — reorderSections()
   */
  async reorderPortfolio(marketerId: number, itemIds: number[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const sortOrder = i + 1;
      await this.db.query(
        'UPDATE affiliate_marketer_portfolio SET sort_order = ? WHERE id = ? AND marketer_id = ?',
        [sortOrder, itemId, marketerId]
      );
    }
  }

  // ==========================================================================
  // REVIEW OPERATIONS
  // ==========================================================================

  /**
   * Get reviews for an affiliate marketer with pagination
   */
  async getReviews(
    marketerId: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AffiliateMarketerReview>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM affiliate_marketer_reviews WHERE marketer_id = ?',
      [marketerId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result: DbResult<AffiliateMarketerReviewRow> = await this.db.query<AffiliateMarketerReviewRow>(
      'SELECT * FROM affiliate_marketer_reviews WHERE marketer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [marketerId, pageSize, offset]
    );

    return {
      data: result.rows.map(row => this.mapReviewRow(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Check if user has already reviewed this marketer
   */
  async hasUserReviewed(marketerId: number, userId: number): Promise<boolean> {
    const result: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM affiliate_marketer_reviews WHERE marketer_id = ? AND reviewer_user_id = ?',
      [marketerId, userId]
    );
    return bigIntToNumber(result.rows[0]?.total) > 0;
  }

  /**
   * Create a new review (starts as 'pending')
   */
  async createReview(
    marketerId: number,
    reviewerUserId: number,
    data: { rating: number; review_text?: string; campaign_type?: string; reviewer_listing_id?: number; images?: string[] }
  ): Promise<AffiliateMarketerReview> {
    const imagesJson = data.images && data.images.length > 0 ? JSON.stringify(data.images) : null;
    const result: DbResult<AffiliateMarketerReviewRow> = await this.db.query<AffiliateMarketerReviewRow>(
      `INSERT INTO affiliate_marketer_reviews (marketer_id, reviewer_user_id, reviewer_listing_id, rating, review_text, campaign_type, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        marketerId,
        reviewerUserId,
        data.reviewer_listing_id || null,
        data.rating,
        data.review_text || null,
        data.campaign_type || null,
        imagesJson
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create review', new Error('No insert ID returned'));
    }

    // Update rating aggregates
    await this.updateRatingAggregates(marketerId);

    // Fetch and return the created review
    const reviewResult: DbResult<AffiliateMarketerReviewRow> = await this.db.query<AffiliateMarketerReviewRow>(
      'SELECT * FROM affiliate_marketer_reviews WHERE id = ?',
      [result.insertId]
    );
    const row = reviewResult.rows[0];
    if (!row) {
      throw BizError.databaseError('create review', new Error('Failed to retrieve created review'));
    }
    return this.mapReviewRow(row);
  }

  /**
   * Get rating distribution (counts per star level)
   */
  async getRatingDistribution(marketerId: number): Promise<{ star: number; count: number }[]> {
    const result: DbResult<{ star: number; count: bigint | number }> = await this.db.query<{ star: number; count: bigint | number }>(
      `SELECT rating AS star, COUNT(*) AS count FROM affiliate_marketer_reviews
       WHERE marketer_id = ? AND status != 'rejected'
       GROUP BY rating ORDER BY rating DESC`,
      [marketerId]
    );
    return result.rows.map(row => ({ star: row.star, count: bigIntToNumber(row.count) }));
  }

  /**
   * Approve a review (admin action - used in Phase 7)
   */
  async approveReview(reviewId: number): Promise<void> {
    const reviewResult: DbResult<AffiliateMarketerReviewRow> = await this.db.query<AffiliateMarketerReviewRow>(
      'SELECT * FROM affiliate_marketer_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw BizError.notFound('Review not found');

    await this.db.query(
      "UPDATE affiliate_marketer_reviews SET status = 'approved' WHERE id = ?",
      [reviewId]
    );
    await this.updateRatingAggregates(review.marketer_id);
  }

  /**
   * Reject a review (admin action - used in Phase 7)
   */
  async rejectReview(reviewId: number): Promise<void> {
    const reviewResult: DbResult<AffiliateMarketerReviewRow> = await this.db.query<AffiliateMarketerReviewRow>(
      'SELECT * FROM affiliate_marketer_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw BizError.notFound('Review not found');

    await this.db.query(
      "UPDATE affiliate_marketer_reviews SET status = 'rejected' WHERE id = ?",
      [reviewId]
    );
    await this.updateRatingAggregates(review.marketer_id);
  }

  // ==========================================================================
  // ADMIN OPERATIONS (Phase 7)
  // ==========================================================================

  /**
   * Get profiles for admin (no default status filter - all statuses)
   * @phase Tier 3 Creator Profiles - Phase 7
   */
  async getProfilesAdmin(
    filters?: AffiliateMarketerFilters,
    pagination?: PaginationParams,
    sort?: AffiliateMarketerSortOption
  ): Promise<PaginatedResult<AffiliateMarketerProfile>> {
    // Delegate to getMarketers with explicit all-status behavior
    // getMarketers only applies status filter if filters.status is set
    return this.getMarketers(filters, pagination, sort);
  }

  /**
   * Get admin stats for affiliate marketer profiles
   * @phase Tier 3 Creator Profiles - Phase 7
   */
  async getAdminStats(): Promise<{
    totalProfiles: number;
    activeCount: number;
    pendingCount: number;
    suspendedCount: number;
    inactiveCount: number;
    verifiedCount: number;
    featuredCount: number;
    pendingReviewCount: number;
  }> {
    // Status breakdown
    const statusResult: DbResult<{ status: string; cnt: bigint | number }> = await this.db.query<{ status: string; cnt: bigint | number }>(
      'SELECT status, COUNT(*) as cnt FROM content_affiliate_marketers GROUP BY status'
    );

    let totalProfiles = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let suspendedCount = 0;
    let inactiveCount = 0;

    for (const row of statusResult.rows) {
      const cnt = bigIntToNumber(row.cnt);
      totalProfiles += cnt;
      if (row.status === 'active') activeCount = cnt;
      else if (row.status === 'pending') pendingCount = cnt;
      else if (row.status === 'suspended') suspendedCount = cnt;
      else if (row.status === 'inactive') inactiveCount = cnt;
    }

    // Verified count
    const verifiedResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM content_affiliate_marketers WHERE is_verified = 1'
    );
    const verifiedCount = bigIntToNumber(verifiedResult.rows[0]?.cnt);

    // Featured count
    const featuredResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM content_affiliate_marketers WHERE is_featured = 1'
    );
    const featuredCount = bigIntToNumber(featuredResult.rows[0]?.cnt);

    // Pending review count
    const pendingReviewResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      "SELECT COUNT(*) as cnt FROM affiliate_marketer_reviews WHERE status = 'pending'"
    );
    const pendingReviewCount = bigIntToNumber(pendingReviewResult.rows[0]?.cnt);

    return {
      totalProfiles,
      activeCount,
      pendingCount,
      suspendedCount,
      inactiveCount,
      verifiedCount,
      featuredCount,
      pendingReviewCount
    };
  }

  /**
   * Get pending reviews for admin moderation
   * @phase Tier 3 Creator Profiles - Phase 7
   */
  async getPendingReviewsAdmin(
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AffiliateMarketerReview & { reviewer_display_name?: string }>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      "SELECT COUNT(*) as total FROM affiliate_marketer_reviews WHERE status = 'pending'"
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result: DbResult<AffiliateMarketerReviewRow & { reviewer_display_name?: string }> =
      await this.db.query<AffiliateMarketerReviewRow & { reviewer_display_name?: string }>(
        `SELECT r.*, u.display_name as reviewer_display_name
         FROM affiliate_marketer_reviews r
         LEFT JOIN users u ON u.id = r.reviewer_user_id
         WHERE r.status = 'pending'
         ORDER BY r.created_at ASC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

    return {
      data: result.rows.map(row => ({
        ...this.mapReviewRow(row),
        reviewer_display_name: row.reviewer_display_name
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1
      }
    };
  }

  // ==========================================================================
  // CONTACT PROPOSAL OPERATIONS
  // ==========================================================================

  /**
   * Create a contact proposal for an affiliate marketer profile
   * Inserts into content_contact_proposals and increments contact_count
   *
   * @phase Tier 3 Creator Profiles - Phase 5
   */
  async createContactProposal(
    profileSlug: string,
    senderUserId: number,
    senderName: string,
    senderEmail: string,
    input: CreateContactProposalInput
  ): Promise<{ proposalId: number; profileOwnerId: number }> {
    // Look up profile by slug
    const profile = await this.getMarketerBySlug(profileSlug);
    if (!profile) {
      throw new AffiliateMarketerNotFoundError(profileSlug);
    }
    if (profile.status !== 'active') {
      throw new AffiliateMarketerNotFoundError(profileSlug);
    }

    // Insert proposal
    const result: DbResult = await this.db.query(
      `INSERT INTO content_contact_proposals
       (profile_type, profile_id, profile_owner_user_id, sender_user_id, sender_name, sender_email, proposal_type, subject, message, budget_range, timeline, company_name)
       VALUES ('affiliate_marketer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.user_id,
        senderUserId,
        senderName,
        senderEmail,
        input.proposal_type,
        input.subject,
        input.message,
        input.budget_range || null,
        input.timeline || null,
        input.company_name || null
      ]
    );

    const proposalId = bigIntToNumber((result as unknown as { insertId: bigint | number }).insertId ?? 0);

    // Increment contact_count (fire-and-forget friendly)
    await this.db.query(
      'UPDATE content_affiliate_marketers SET contact_count = contact_count + 1 WHERE id = ?',
      [profile.id]
    );

    return { proposalId, profileOwnerId: profile.user_id };
  }

  // ==========================================================================
  // ANALYTICS OPERATIONS (Phase 8C)
  // ==========================================================================

  /**
   * Get profile analytics data for dashboard
   * @phase Tier 3 Creator Profiles - Phase 8C
   */
  async getProfileAnalytics(
    profileId: number,
    dateRange: { start: string; end: string }
  ): Promise<{
    kpis: { viewCount: number; contactCount: number; ratingAverage: number; ratingCount: number; recommendationCount: number; responseRate: number };
    contactFunnel: Array<{ stage: string; count: number; conversionRate: number | null }>;
    viewTrend: Array<{ date: string; views: number }>;
    contactTrend: Array<{ date: string; contacts: number }>;
  }> {
    // 1. Profile KPIs
    const profileResult = await this.db.query<{ view_count: number; contact_count: number; rating_average: number; rating_count: number }>(
      'SELECT view_count, contact_count, rating_average, rating_count FROM content_affiliate_marketers WHERE id = ?',
      [profileId]
    );
    const profile = profileResult.rows[0];

    // 2. Contact funnel from content_contact_proposals
    const funnelResult = await this.db.query<{ total: bigint | number; read_count: bigint | number; replied_count: bigint | number }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
         SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) as replied_count
       FROM content_contact_proposals
       WHERE profile_type = 'affiliate_marketer' AND profile_id = ?
         AND created_at BETWEEN ? AND ?`,
      [profileId, dateRange.start, dateRange.end + ' 23:59:59']
    );
    const funnel = funnelResult.rows[0];
    const totalProposals = bigIntToNumber(funnel?.total);
    const readCount = bigIntToNumber(funnel?.read_count);
    const repliedCount = bigIntToNumber(funnel?.replied_count);

    // 3. View trend from analytics_page_views
    const viewTrendResult = await this.db.query<{ date: string; views: bigint | number }>(
      `SELECT DATE(created_at) as date, COUNT(*) as views
       FROM analytics_page_views
       WHERE url LIKE ? AND created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at) ORDER BY date`,
      [`%/affiliate-marketers/%`, dateRange.start, dateRange.end + ' 23:59:59']
    );

    // 4. Contact trend from content_contact_proposals
    const contactTrendResult = await this.db.query<{ date: string; contacts: bigint | number }>(
      `SELECT DATE(created_at) as date, COUNT(*) as contacts
       FROM content_contact_proposals
       WHERE profile_type = 'affiliate_marketer' AND profile_id = ?
         AND created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at) ORDER BY date`,
      [profileId, dateRange.start, dateRange.end + ' 23:59:59']
    );

    // 5. Recommendation count from user_referrals
    const recResult = await this.db.query<{ cnt: bigint | number }>(
      `SELECT COUNT(*) as cnt FROM user_referrals WHERE entity_type = 'affiliate_marketer' AND entity_id = ?`,
      [profileId]
    );
    const recommendationCount = bigIntToNumber(recResult.rows[0]?.cnt);

    // Build contact funnel stages
    const contactFunnel = [
      { stage: 'Sent', count: totalProposals, conversionRate: null },
      { stage: 'Read', count: readCount, conversionRate: totalProposals > 0 ? Math.round((readCount / totalProposals) * 100) : null },
      { stage: 'Replied', count: repliedCount, conversionRate: totalProposals > 0 ? Math.round((repliedCount / totalProposals) * 100) : null },
    ];

    // Response rate
    const responseRate = totalProposals > 0 ? Math.round((repliedCount / totalProposals) * 1000) / 10 : 0;

    return {
      kpis: {
        viewCount: profile?.view_count ?? 0,
        contactCount: profile?.contact_count ?? 0,
        ratingAverage: profile?.rating_average ?? 0,
        ratingCount: profile?.rating_count ?? 0,
        recommendationCount,
        responseRate,
      },
      contactFunnel,
      viewTrend: viewTrendResult.rows.map(r => ({ date: String(r.date), views: bigIntToNumber(r.views) })),
      contactTrend: contactTrendResult.rows.map(r => ({ date: String(r.date), contacts: bigIntToNumber(r.contacts) })),
    };
  }

  // ==========================================================================
  // CAMPAIGN ANALYTICS (Phase 9A)
  // ==========================================================================

  /**
   * getCampaignAnalytics - Campaign-level analytics with aggregation
   */
  async getCampaignAnalytics(
    marketerId: number,
    dateRange: { start: string; end: string }
  ): Promise<{
    campaignKpis: {
      totalImpressions: number;
      totalClicks: number;
      totalConversions: number;
      totalRevenue: number;
      avgConversionRate: number;
      avgROI: number;
      activeCampaigns: number;
    };
    campaigns: Array<{
      id: number;
      campaignName: string;
      network: string | null;
      impressions: number;
      clicks: number;
      conversions: number;
      revenue: number;
      conversionRate: number;
      periodStart: string | null;
      periodEnd: string | null;
    }>;
    conversionTrend: Array<{ date: string; conversions: number; revenue: number }>;
    networkBreakdown: Array<{ network: string; campaigns: number; conversions: number; revenue: number }>;
    trafficSources: Array<{ source: string; count: number; percentage: number }>;
    categoryBenchmark: {
      avgConversionRate: number;
      avgRating: number;
      avgContactCount: number;
      marketerRank: number;
      totalInCategory: number;
    };
  }> {
    // 1. Campaign KPIs
    const kpiResult = await this.db.query<{
      total_impressions: bigint | number;
      total_clicks: bigint | number;
      total_conversions: bigint | number;
      total_revenue: number;
      active_campaigns: bigint | number;
    }>(
      `SELECT
         COALESCE(SUM(impressions), 0) as total_impressions,
         COALESCE(SUM(clicks), 0) as total_clicks,
         COALESCE(SUM(conversions), 0) as total_conversions,
         COALESCE(SUM(revenue), 0) as total_revenue,
         COUNT(*) as active_campaigns
       FROM affiliate_campaign_metrics
       WHERE marketer_id = ?
         AND (period_start >= ? OR period_start IS NULL)
         AND (period_end <= ? OR period_end IS NULL)`,
      [marketerId, dateRange.start, dateRange.end]
    );
    const kpiRow = kpiResult.rows[0];
    const totalImpressions = bigIntToNumber(kpiRow?.total_impressions);
    const totalClicks = bigIntToNumber(kpiRow?.total_clicks);
    const totalConversions = bigIntToNumber(kpiRow?.total_conversions);
    const totalRevenue = Number(kpiRow?.total_revenue ?? 0);
    const activeCampaigns = bigIntToNumber(kpiRow?.active_campaigns);
    const avgConversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0;
    const avgROI = totalRevenue > 0 && totalClicks > 0 ? Math.round((totalRevenue / totalClicks) * 100) / 100 : 0;

    // 2. Per-campaign list
    const campaignsResult = await this.db.query<{
      id: number;
      campaign_name: string;
      network: string | null;
      impressions: number;
      clicks: number;
      conversions: number;
      revenue: number;
      period_start: string | null;
      period_end: string | null;
    }>(
      `SELECT id, campaign_name, network, impressions, clicks, conversions, revenue, period_start, period_end
       FROM affiliate_campaign_metrics
       WHERE marketer_id = ?
         AND (period_start >= ? OR period_start IS NULL)
       ORDER BY revenue DESC`,
      [marketerId, dateRange.start]
    );

    const campaigns = campaignsResult.rows.map(r => ({
      id: r.id,
      campaignName: r.campaign_name,
      network: r.network,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
      revenue: Number(r.revenue),
      conversionRate: r.clicks > 0 ? Math.round((r.conversions / r.clicks) * 10000) / 100 : 0,
      periodStart: r.period_start ? String(r.period_start) : null,
      periodEnd: r.period_end ? String(r.period_end) : null,
    }));

    // 3. Conversion trend
    const trendResult = await this.db.query<{ date: string; conversions: bigint | number; revenue: number }>(
      `SELECT DATE(period_start) as date, SUM(conversions) as conversions, SUM(revenue) as revenue
       FROM affiliate_campaign_metrics
       WHERE marketer_id = ? AND period_start IS NOT NULL
         AND period_start >= ? AND period_start <= ?
       GROUP BY DATE(period_start) ORDER BY date`,
      [marketerId, dateRange.start, dateRange.end]
    );

    const conversionTrend = trendResult.rows.map(r => ({
      date: String(r.date),
      conversions: bigIntToNumber(r.conversions),
      revenue: Number(r.revenue),
    }));

    // 4. Network breakdown
    const networkResult = await this.db.query<{
      network: string;
      campaigns: bigint | number;
      conversions: bigint | number;
      revenue: number;
    }>(
      `SELECT network, COUNT(*) as campaigns, SUM(conversions) as conversions, SUM(revenue) as revenue
       FROM affiliate_campaign_metrics
       WHERE marketer_id = ? AND network IS NOT NULL
       GROUP BY network ORDER BY revenue DESC`,
      [marketerId]
    );

    const networkBreakdown = networkResult.rows.map(r => ({
      network: r.network,
      campaigns: bigIntToNumber(r.campaigns),
      conversions: bigIntToNumber(r.conversions),
      revenue: Number(r.revenue),
    }));

    // 5. Traffic sources from engagement_funnel_events
    const trafficResult = await this.db.query<{ source: string; cnt: bigint | number }>(
      `SELECT source, COUNT(*) as cnt
       FROM engagement_funnel_events
       WHERE entity_type = 'affiliate_marketer' AND entity_id = ?
         AND source IS NOT NULL
       GROUP BY source ORDER BY cnt DESC`,
      [marketerId]
    );

    const totalTraffic = trafficResult.rows.reduce((sum, r) => sum + bigIntToNumber(r.cnt), 0);
    const trafficSources = trafficResult.rows.map(r => {
      const count = bigIntToNumber(r.cnt);
      return {
        source: r.source,
        count,
        percentage: totalTraffic > 0 ? Math.round((count / totalTraffic) * 1000) / 10 : 0,
      };
    });

    // 6. Category benchmark
    const benchmarkResult = await this.db.query<{
      avg_conversion: number | null;
      avg_rating: number | null;
      avg_contacts: number | null;
      total_count: bigint | number;
    }>(
      `SELECT
         AVG(CASE WHEN view_count > 0 THEN contact_count / view_count * 100 ELSE 0 END) as avg_conversion,
         AVG(rating_average) as avg_rating,
         AVG(contact_count) as avg_contacts,
         COUNT(*) as total_count
       FROM content_affiliate_marketers WHERE status = 'active'`,
      []
    );
    const bench = benchmarkResult.rows[0];

    // Get marketer rank by rating
    const rankResult = await this.db.query<{ rank_pos: bigint | number }>(
      `SELECT COUNT(*) + 1 as rank_pos FROM content_affiliate_marketers
       WHERE status = 'active' AND rating_average > (
         SELECT rating_average FROM content_affiliate_marketers WHERE id = ?
       )`,
      [marketerId]
    );

    const categoryBenchmark = {
      avgConversionRate: Math.round((bench?.avg_conversion ?? 0) * 100) / 100,
      avgRating: Math.round((bench?.avg_rating ?? 0) * 10) / 10,
      avgContactCount: Math.round(bench?.avg_contacts ?? 0),
      marketerRank: bigIntToNumber(rankResult.rows[0]?.rank_pos),
      totalInCategory: bigIntToNumber(bench?.total_count),
    };

    return {
      campaignKpis: {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalRevenue,
        avgConversionRate,
        avgROI,
        activeCampaigns,
      },
      campaigns,
      conversionTrend,
      networkBreakdown,
      trafficSources,
      categoryBenchmark,
    };
  }

  /**
   * addCampaignMetrics - Insert a new campaign metrics record
   */
  async addCampaignMetrics(marketerId: number, data: {
    campaignName: string;
    network?: string;
    portfolioItemId?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    commissionRate?: number;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<number> {
    const result = await this.db.query(
      `INSERT INTO affiliate_campaign_metrics (marketer_id, portfolio_item_id, campaign_name, network, impressions, clicks, conversions, revenue, commission_rate, period_start, period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        marketerId,
        data.portfolioItemId ?? null,
        data.campaignName,
        data.network ?? null,
        data.impressions ?? 0,
        data.clicks ?? 0,
        data.conversions ?? 0,
        data.revenue ?? 0,
        data.commissionRate ?? null,
        data.periodStart ?? null,
        data.periodEnd ?? null,
      ]
    );
    return (result as unknown as { insertId: number }).insertId;
  }

  /**
   * updateCampaignMetrics - Update an existing campaign metrics record
   */
  async updateCampaignMetrics(id: number, data: {
    campaignName?: string;
    network?: string;
    portfolioItemId?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    commissionRate?: number;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.campaignName !== undefined) { fields.push('campaign_name = ?'); values.push(data.campaignName); }
    if (data.network !== undefined) { fields.push('network = ?'); values.push(data.network); }
    if (data.portfolioItemId !== undefined) { fields.push('portfolio_item_id = ?'); values.push(data.portfolioItemId); }
    if (data.impressions !== undefined) { fields.push('impressions = ?'); values.push(data.impressions); }
    if (data.clicks !== undefined) { fields.push('clicks = ?'); values.push(data.clicks); }
    if (data.conversions !== undefined) { fields.push('conversions = ?'); values.push(data.conversions); }
    if (data.revenue !== undefined) { fields.push('revenue = ?'); values.push(data.revenue); }
    if (data.commissionRate !== undefined) { fields.push('commission_rate = ?'); values.push(data.commissionRate); }
    if (data.periodStart !== undefined) { fields.push('period_start = ?'); values.push(data.periodStart); }
    if (data.periodEnd !== undefined) { fields.push('period_end = ?'); values.push(data.periodEnd); }

    if (fields.length === 0) return;

    values.push(id);
    await this.db.query(
      `UPDATE affiliate_campaign_metrics SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * deleteCampaignMetrics - Delete a campaign metrics record
   */
  async deleteCampaignMetrics(id: number): Promise<void> {
    await this.db.query('DELETE FROM affiliate_campaign_metrics WHERE id = ?', [id]);
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Private: Recalculate and update rating_average + rating_count on profile table
   */
  private async updateRatingAggregates(marketerId: number): Promise<void> {
    const result: DbResult<{ avg_rating: number | null; review_count: bigint | number }> = await this.db.query<{ avg_rating: number | null; review_count: bigint | number }>(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
       FROM affiliate_marketer_reviews WHERE marketer_id = ? AND status != 'rejected'`,
      [marketerId]
    );
    const row = result.rows[0];
    const avgRating = row?.avg_rating ?? 0;
    const reviewCount = bigIntToNumber(row?.review_count);

    await this.db.query(
      'UPDATE content_affiliate_marketers SET rating_average = ?, rating_count = ? WHERE id = ?',
      [avgRating, reviewCount, marketerId]
    );
  }

  /**
   * Get portfolio item by ID (internal helper)
   */
  private async getPortfolioItemById(id: number): Promise<PortfolioItem | null> {
    const result: DbResult<AffiliateMarketerPortfolioRow> = await this.db.query<AffiliateMarketerPortfolioRow>(
      'SELECT * FROM affiliate_marketer_portfolio WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapPortfolioRow(row);
  }

  /**
   * Generate a unique slug from display name
   */
  private async generateSlug(displayName: string): Promise<string> {
    const slug = displayName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let counter = 1;
    let uniqueSlug = slug;

    for (;;) {
      const existing = await this.getMarketerBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      if (counter > 1000) {
        throw BizError.internalServerError(
          'AffiliateMarketerService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Build SQL sort clause from sort option
   */
  private buildSortClause(sort?: AffiliateMarketerSortOption): string {
    switch (sort) {
      case 'recent':
        return 'ORDER BY cam.created_at DESC';
      case 'popular':
        return 'ORDER BY cam.view_count DESC';
      case 'rating':
        return 'ORDER BY cam.rating_average DESC';
      case 'alphabetical':
        return 'ORDER BY cam.display_name ASC';
      default:
        return 'ORDER BY cam.created_at DESC';
    }
  }

  /**
   * Map database row to AffiliateMarketerProfile application entity
   * GOVERNANCE: mariadb auto-parses JSON columns - check if already array
   * GOVERNANCE: TINYINT(1) -> boolean via !! operator
   */
  private mapRowToProfile(row: ContentAffiliateMarketerRow): AffiliateMarketerProfile {
    return {
      id: row.id,
      user_id: row.user_id,
      listing_id: row.listing_id,
      display_name: row.display_name,
      slug: row.slug,
      profile_image: row.profile_image,
      cover_image: row.cover_image,
      headline: row.headline,
      bio: row.bio,
      location: row.location,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      niches: row.niches ? (Array.isArray(row.niches) ? row.niches : safeJsonParse<string[]>(row.niches) ?? []) : [],
      specializations: row.specializations ? (Array.isArray(row.specializations) ? row.specializations : safeJsonParse<string[]>(row.specializations) ?? []) : [],
      affiliate_networks: row.affiliate_networks ? (Array.isArray(row.affiliate_networks) ? row.affiliate_networks : safeJsonParse<string[]>(row.affiliate_networks) ?? []) : [],
      commission_range_min: row.commission_range_min,
      commission_range_max: row.commission_range_max,
      flat_fee_min: row.flat_fee_min,
      flat_fee_max: row.flat_fee_max,
      audience_size: row.audience_size,
      audience_demographics: row.audience_demographics ? (typeof row.audience_demographics === 'object' ? row.audience_demographics as Record<string, unknown> : safeJsonParse<Record<string, unknown>>(row.audience_demographics)) : null,
      platforms: row.platforms ? (Array.isArray(row.platforms) ? row.platforms : safeJsonParse<string[]>(row.platforms) ?? []) : [],
      website_url: row.website_url,
      social_links: row.social_links ? (typeof row.social_links === 'object' ? row.social_links as Record<string, string> : safeJsonParse<Record<string, string>>(row.social_links)) : null,
      is_verified: !!row.is_verified,
      is_featured: !!row.is_featured,
      status: row.status as AffiliateMarketerStatus,
      campaign_count: row.campaign_count,
      businesses_helped: row.businesses_helped,
      avg_conversion_rate: row.avg_conversion_rate,
      view_count: row.view_count,
      contact_count: row.contact_count,
      rating_average: row.rating_average,
      rating_count: row.rating_count,
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  /**
   * Map database row to PortfolioItem application entity
   */
  private mapPortfolioRow(row: AffiliateMarketerPortfolioRow): PortfolioItem {
    return {
      id: row.id,
      marketer_id: row.marketer_id,
      brand_name: row.brand_name,
      brand_logo: row.brand_logo,
      campaign_title: row.campaign_title,
      description: row.description,
      results_summary: row.results_summary,
      conversion_rate: row.conversion_rate,
      content_url: row.content_url,
      campaign_date: row.campaign_date ? new Date(row.campaign_date) : null,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Map database row to AffiliateMarketerReview application entity
   */
  private mapReviewRow(row: AffiliateMarketerReviewRow): AffiliateMarketerReview {
    return {
      id: row.id,
      marketer_id: row.marketer_id,
      reviewer_user_id: row.reviewer_user_id,
      reviewer_listing_id: row.reviewer_listing_id,
      rating: row.rating,
      review_text: row.review_text,
      campaign_type: row.campaign_type,
      status: row.status,
      created_at: new Date(row.created_at)
    };
  }
}
