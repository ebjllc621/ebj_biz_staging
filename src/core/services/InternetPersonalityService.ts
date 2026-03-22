/**
 * InternetPersonalityService - Internet Personality Profile Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (ContentInternetPersonalityRow, etc.)
 * - MariaDB patterns: ? placeholders, bigIntToNumber, JSON parse guard, TINYINT boolean
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 1
 * @reference src/core/services/AffiliateMarketerService.ts - Exact patterns replicated
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type { DbResult } from '@core/types/db';
import type {
  ContentInternetPersonalityRow,
  InternetPersonalityCollaborationRow,
  InternetPersonalityReviewRow
} from '@core/types/db-rows';
import type {
  InternetPersonalityProfile,
  Collaboration,
  InternetPersonalityReview,
  InternetPersonalityFilters,
  InternetPersonalitySortOption,
  CreateInternetPersonalityInput,
  UpdateInternetPersonalityInput,
  CreateCollaborationInput,
  UpdateCollaborationInput
} from '@core/types/internet-personality';
import type { CreateContactProposalInput } from '@core/types/content-contact-proposal';
import { InternetPersonalityStatus } from '@core/types/internet-personality';

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

export class InternetPersonalityNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'INTERNET_PERSONALITY_NOT_FOUND',
      message: `Internet personality not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested internet personality profile was not found'
    });
  }
}

export class DuplicateInternetPersonalitySlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_INTERNET_PERSONALITY_SLUG',
      message: `Internet personality slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'An internet personality profile with this URL slug already exists'
    });
  }
}

export class CollaborationNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'COLLABORATION_NOT_FOUND',
      message: `Collaboration not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested collaboration was not found'
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
// InternetPersonalityService Implementation
// ============================================================================

export class InternetPersonalityService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get internet personality profiles with optional filters, pagination, and sorting
   */
  async getPersonalities(
    filters?: InternetPersonalityFilters,
    pagination?: PaginationParams,
    sort?: InternetPersonalitySortOption
  ): Promise<PaginatedResult<InternetPersonalityProfile>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT cip.* FROM content_internet_personalities cip';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.status !== undefined) {
      conditions.push('cip.status = ?');
      params.push(filters.status);
    }

    if (filters?.location !== undefined) {
      conditions.push('cip.location LIKE ?');
      params.push(`%${filters.location}%`);
    }

    if (filters?.content_categories !== undefined && filters.content_categories.length > 0) {
      conditions.push('JSON_CONTAINS(cip.content_categories, ?)');
      params.push(JSON.stringify(filters.content_categories));
    }

    if (filters?.platforms !== undefined && filters.platforms.length > 0) {
      conditions.push('JSON_CONTAINS(cip.platforms, ?)');
      params.push(JSON.stringify(filters.platforms));
    }

    if (filters?.collaboration_types !== undefined && filters.collaboration_types.length > 0) {
      conditions.push('JSON_CONTAINS(cip.collaboration_types, ?)');
      params.push(JSON.stringify(filters.collaboration_types));
    }

    if (filters?.is_verified !== undefined) {
      conditions.push('cip.is_verified = ?');
      params.push(filters.is_verified ? 1 : 0);
    }

    if (filters?.is_featured !== undefined) {
      conditions.push('cip.is_featured = ?');
      params.push(filters.is_featured ? 1 : 0);
    }

    if (filters?.minRating !== undefined) {
      conditions.push('cip.rating_average >= ?');
      params.push(filters.minRating);
    }

    if (filters?.searchQuery) {
      conditions.push('(cip.display_name LIKE ? OR cip.headline LIKE ? OR cip.bio LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_internet_personalities cip${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentInternetPersonalityRow> = await this.db.query<ContentInternetPersonalityRow>(sql, params);

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
   * Get internet personality profile by ID
   */
  async getPersonalityById(id: number): Promise<InternetPersonalityProfile | null> {
    const result: DbResult<ContentInternetPersonalityRow> = await this.db.query<ContentInternetPersonalityRow>(
      'SELECT * FROM content_internet_personalities WHERE id = ?',
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
   * Get internet personality profile by slug
   */
  async getPersonalityBySlug(slug: string): Promise<InternetPersonalityProfile | null> {
    const result: DbResult<ContentInternetPersonalityRow> = await this.db.query<ContentInternetPersonalityRow>(
      'SELECT * FROM content_internet_personalities WHERE slug = ?',
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
   * Get internet personality profile by user ID
   */
  async getProfileByUserId(userId: number): Promise<InternetPersonalityProfile | null> {
    const result: DbResult<ContentInternetPersonalityRow> = await this.db.query<ContentInternetPersonalityRow>(
      'SELECT * FROM content_internet_personalities WHERE user_id = ? LIMIT 1',
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
   * Create a new internet personality profile
   */
  async createProfile(userId: number, data: CreateInternetPersonalityInput): Promise<InternetPersonalityProfile> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.display_name);

    // Check for duplicate slug
    const existing = await this.getPersonalityBySlug(slug);
    if (existing) {
      throw new DuplicateInternetPersonalitySlugError(slug);
    }

    const result: DbResult<ContentInternetPersonalityRow> = await this.db.query<ContentInternetPersonalityRow>(
      `INSERT INTO content_internet_personalities
       (user_id, listing_id, display_name, slug, profile_image, cover_image,
        headline, bio, location, creating_since, content_categories, platforms,
        total_reach, avg_engagement_rate, collaboration_types, rate_card,
        media_kit_url, management_contact, website_url, social_links,
        is_featured, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
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
        data.creating_since || null,
        JSON.stringify(data.content_categories || []),
        JSON.stringify(data.platforms || []),
        data.total_reach || 0,
        data.avg_engagement_rate ?? null,
        JSON.stringify(data.collaboration_types || []),
        data.rate_card ? JSON.stringify(data.rate_card) : null,
        data.media_kit_url || null,
        data.management_contact || null,
        data.website_url || null,
        data.social_links ? JSON.stringify(data.social_links) : null,
        data.is_featured ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create internet personality profile', new Error('No insert ID returned'));
    }

    const created = await this.getPersonalityById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create internet personality profile', new Error('Failed to retrieve created profile'));
    }

    return created;
  }

  /**
   * Update an internet personality profile
   */
  async updateProfile(id: number, data: UpdateInternetPersonalityInput): Promise<InternetPersonalityProfile> {
    // Check profile exists
    const existing = await this.getPersonalityById(id);
    if (!existing) {
      throw new InternetPersonalityNotFoundError(id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getPersonalityBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateInternetPersonalitySlugError(data.slug);
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

    if (data.creating_since !== undefined) {
      updates.push('creating_since = ?');
      params.push(data.creating_since);
    }

    if (data.content_categories !== undefined) {
      updates.push('content_categories = ?');
      params.push(JSON.stringify(data.content_categories));
    }

    if (data.platforms !== undefined) {
      updates.push('platforms = ?');
      params.push(JSON.stringify(data.platforms));
    }

    if (data.total_reach !== undefined) {
      updates.push('total_reach = ?');
      params.push(data.total_reach);
    }

    if (data.avg_engagement_rate !== undefined) {
      updates.push('avg_engagement_rate = ?');
      params.push(data.avg_engagement_rate);
    }

    if (data.collaboration_types !== undefined) {
      updates.push('collaboration_types = ?');
      params.push(JSON.stringify(data.collaboration_types));
    }

    if (data.rate_card !== undefined) {
      updates.push('rate_card = ?');
      params.push(data.rate_card ? JSON.stringify(data.rate_card) : null);
    }

    if (data.media_kit_url !== undefined) {
      updates.push('media_kit_url = ?');
      params.push(data.media_kit_url);
    }

    if (data.management_contact !== undefined) {
      updates.push('management_contact = ?');
      params.push(data.management_contact);
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
      `UPDATE content_internet_personalities SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getPersonalityById(id);
    if (!updated) {
      throw BizError.databaseError('update internet personality profile', new Error('Failed to retrieve updated profile'));
    }

    return updated;
  }

  /**
   * Increment view count (fire-and-forget)
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_internet_personalities SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // COLLABORATION OPERATIONS
  // ==========================================================================

  /**
   * Get collaborations for an internet personality
   */
  async getCollaborations(personalityId: number): Promise<Collaboration[]> {
    const result: DbResult<InternetPersonalityCollaborationRow> = await this.db.query<InternetPersonalityCollaborationRow>(
      'SELECT * FROM internet_personality_collaborations WHERE personality_id = ? ORDER BY sort_order ASC',
      [personalityId]
    );

    return result.rows.map(row => this.mapCollaborationRow(row));
  }

  /**
   * Add a collaboration to an internet personality profile
   */
  async addCollaboration(personalityId: number, data: CreateCollaborationInput): Promise<Collaboration> {
    // Verify personality exists
    const personality = await this.getPersonalityById(personalityId);
    if (!personality) {
      throw new InternetPersonalityNotFoundError(personalityId);
    }

    // Calculate next sort_order
    const sortResult: DbResult<{ max_sort: number | null }> = await this.db.query<{ max_sort: number | null }>(
      'SELECT MAX(sort_order) as max_sort FROM internet_personality_collaborations WHERE personality_id = ?',
      [personalityId]
    );
    const sortOrder = (sortResult.rows[0]?.max_sort ?? 0) + 1;

    const result: DbResult<InternetPersonalityCollaborationRow> = await this.db.query<InternetPersonalityCollaborationRow>(
      `INSERT INTO internet_personality_collaborations
       (personality_id, brand_name, brand_logo, listing_id, collaboration_type,
        description, content_url, collaboration_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        personalityId,
        data.brand_name || null,
        data.brand_logo || null,
        data.listing_id || null,
        data.collaboration_type || null,
        data.description || null,
        data.content_url || null,
        data.collaboration_date || null,
        sortOrder
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('add collaboration', new Error('No insert ID returned'));
    }

    const created = await this.getCollaborationById(result.insertId);
    if (!created) {
      throw BizError.databaseError('add collaboration', new Error('Failed to retrieve created collaboration'));
    }

    return created;
  }

  /**
   * Update a collaboration
   */
  async updateCollaboration(id: number, data: UpdateCollaborationInput): Promise<Collaboration> {
    const existing = await this.getCollaborationById(id);
    if (!existing) {
      throw new CollaborationNotFoundError(id);
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

    if (data.listing_id !== undefined) {
      updates.push('listing_id = ?');
      params.push(data.listing_id);
    }

    if (data.collaboration_type !== undefined) {
      updates.push('collaboration_type = ?');
      params.push(data.collaboration_type);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.content_url !== undefined) {
      updates.push('content_url = ?');
      params.push(data.content_url);
    }

    if (data.collaboration_date !== undefined) {
      updates.push('collaboration_date = ?');
      params.push(data.collaboration_date);
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
      `UPDATE internet_personality_collaborations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getCollaborationById(id);
    if (!updated) {
      throw BizError.databaseError('update collaboration', new Error('Failed to retrieve updated collaboration'));
    }

    return updated;
  }

  /**
   * Delete a collaboration
   */
  async deleteCollaboration(id: number): Promise<void> {
    const item = await this.getCollaborationById(id);
    if (!item) {
      throw new CollaborationNotFoundError(id);
    }

    await this.db.query('DELETE FROM internet_personality_collaborations WHERE id = ?', [id]);
  }

  /**
   * Reorder collaborations for an internet personality
   * Updates sort_order for each item ID in the provided order
   * @phase Tier 3 Creator Profiles - Phase 8B
   * @reference src/core/services/GuideService.ts:589 — reorderSections()
   */
  async reorderCollaborations(personalityId: number, itemIds: number[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const sortOrder = i + 1;
      await this.db.query(
        'UPDATE internet_personality_collaborations SET sort_order = ? WHERE id = ? AND personality_id = ?',
        [sortOrder, itemId, personalityId]
      );
    }
  }

  // ==========================================================================
  // REVIEW OPERATIONS
  // ==========================================================================

  /**
   * Get reviews for an internet personality with pagination
   */
  async getReviews(
    personalityId: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<InternetPersonalityReview>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM internet_personality_reviews WHERE personality_id = ?',
      [personalityId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result: DbResult<InternetPersonalityReviewRow> = await this.db.query<InternetPersonalityReviewRow>(
      'SELECT * FROM internet_personality_reviews WHERE personality_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [personalityId, pageSize, offset]
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
   * Check if user has already reviewed this personality
   */
  async hasUserReviewed(personalityId: number, userId: number): Promise<boolean> {
    const result: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM internet_personality_reviews WHERE personality_id = ? AND reviewer_user_id = ?',
      [personalityId, userId]
    );
    return bigIntToNumber(result.rows[0]?.total) > 0;
  }

  /**
   * Create a new review (starts as 'pending')
   */
  async createReview(
    personalityId: number,
    reviewerUserId: number,
    data: { rating: number; review_text?: string; collaboration_type?: string; reviewer_listing_id?: number; images?: string[] }
  ): Promise<InternetPersonalityReview> {
    const imagesJson = data.images && data.images.length > 0 ? JSON.stringify(data.images) : null;
    const result: DbResult<InternetPersonalityReviewRow> = await this.db.query<InternetPersonalityReviewRow>(
      `INSERT INTO internet_personality_reviews (personality_id, reviewer_user_id, reviewer_listing_id, rating, review_text, collaboration_type, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        personalityId,
        reviewerUserId,
        data.reviewer_listing_id || null,
        data.rating,
        data.review_text || null,
        data.collaboration_type || null,
        imagesJson
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create review', new Error('No insert ID returned'));
    }

    // Update rating aggregates
    await this.updateRatingAggregates(personalityId);

    // Fetch and return the created review
    const reviewResult: DbResult<InternetPersonalityReviewRow> = await this.db.query<InternetPersonalityReviewRow>(
      'SELECT * FROM internet_personality_reviews WHERE id = ?',
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
  async getRatingDistribution(personalityId: number): Promise<{ star: number; count: number }[]> {
    const result: DbResult<{ star: number; count: bigint | number }> = await this.db.query<{ star: number; count: bigint | number }>(
      `SELECT rating AS star, COUNT(*) AS count FROM internet_personality_reviews
       WHERE personality_id = ? AND status != 'rejected'
       GROUP BY rating ORDER BY rating DESC`,
      [personalityId]
    );
    return result.rows.map(row => ({ star: row.star, count: bigIntToNumber(row.count) }));
  }

  /**
   * Approve a review (admin action - used in Phase 7)
   */
  async approveReview(reviewId: number): Promise<void> {
    const reviewResult: DbResult<InternetPersonalityReviewRow> = await this.db.query<InternetPersonalityReviewRow>(
      'SELECT * FROM internet_personality_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw BizError.notFound('Review not found');

    await this.db.query(
      "UPDATE internet_personality_reviews SET status = 'approved' WHERE id = ?",
      [reviewId]
    );
    await this.updateRatingAggregates(review.personality_id);
  }

  /**
   * Reject a review (admin action - used in Phase 7)
   */
  async rejectReview(reviewId: number): Promise<void> {
    const reviewResult: DbResult<InternetPersonalityReviewRow> = await this.db.query<InternetPersonalityReviewRow>(
      'SELECT * FROM internet_personality_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw BizError.notFound('Review not found');

    await this.db.query(
      "UPDATE internet_personality_reviews SET status = 'rejected' WHERE id = ?",
      [reviewId]
    );
    await this.updateRatingAggregates(review.personality_id);
  }

  // ==========================================================================
  // ADMIN OPERATIONS (Phase 7)
  // ==========================================================================

  /**
   * Get profiles for admin (no default status filter - all statuses)
   * @phase Tier 3 Creator Profiles - Phase 7
   */
  async getProfilesAdmin(
    filters?: InternetPersonalityFilters,
    pagination?: PaginationParams,
    sort?: InternetPersonalitySortOption
  ): Promise<PaginatedResult<InternetPersonalityProfile>> {
    return this.getPersonalities(filters, pagination, sort);
  }

  /**
   * Get admin stats for internet personality profiles
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
      'SELECT status, COUNT(*) as cnt FROM content_internet_personalities GROUP BY status'
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
      'SELECT COUNT(*) as cnt FROM content_internet_personalities WHERE is_verified = 1'
    );
    const verifiedCount = bigIntToNumber(verifiedResult.rows[0]?.cnt);

    // Featured count
    const featuredResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM content_internet_personalities WHERE is_featured = 1'
    );
    const featuredCount = bigIntToNumber(featuredResult.rows[0]?.cnt);

    // Pending review count
    const pendingReviewResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      "SELECT COUNT(*) as cnt FROM internet_personality_reviews WHERE status = 'pending'"
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
  ): Promise<PaginatedResult<InternetPersonalityReview & { reviewer_display_name?: string }>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      "SELECT COUNT(*) as total FROM internet_personality_reviews WHERE status = 'pending'"
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result: DbResult<InternetPersonalityReviewRow & { reviewer_display_name?: string }> =
      await this.db.query<InternetPersonalityReviewRow & { reviewer_display_name?: string }>(
        `SELECT r.*, u.display_name as reviewer_display_name
         FROM internet_personality_reviews r
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
   * Create a contact proposal for an internet personality profile
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
    const profile = await this.getPersonalityBySlug(profileSlug);
    if (!profile) {
      throw new InternetPersonalityNotFoundError(profileSlug);
    }
    if (profile.status !== 'active') {
      throw new InternetPersonalityNotFoundError(profileSlug);
    }

    // Insert proposal
    const result: DbResult = await this.db.query(
      `INSERT INTO content_contact_proposals
       (profile_type, profile_id, profile_owner_user_id, sender_user_id, sender_name, sender_email, proposal_type, subject, message, budget_range, timeline, company_name)
       VALUES ('internet_personality', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // Increment contact_count
    await this.db.query(
      'UPDATE content_internet_personalities SET contact_count = contact_count + 1 WHERE id = ?',
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
      'SELECT view_count, contact_count, rating_average, rating_count FROM content_internet_personalities WHERE id = ?',
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
       WHERE profile_type = 'internet_personality' AND profile_id = ?
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
      [`%/internet-personalities/%`, dateRange.start, dateRange.end + ' 23:59:59']
    );

    // 4. Contact trend from content_contact_proposals
    const contactTrendResult = await this.db.query<{ date: string; contacts: bigint | number }>(
      `SELECT DATE(created_at) as date, COUNT(*) as contacts
       FROM content_contact_proposals
       WHERE profile_type = 'internet_personality' AND profile_id = ?
         AND created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at) ORDER BY date`,
      [profileId, dateRange.start, dateRange.end + ' 23:59:59']
    );

    // 5. Recommendation count from user_referrals
    const recResult = await this.db.query<{ cnt: bigint | number }>(
      `SELECT COUNT(*) as cnt FROM user_referrals WHERE entity_type = 'internet_personality' AND entity_id = ?`,
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
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Private: Recalculate and update rating_average + rating_count on profile table
   */
  private async updateRatingAggregates(personalityId: number): Promise<void> {
    const result: DbResult<{ avg_rating: number | null; review_count: bigint | number }> = await this.db.query<{ avg_rating: number | null; review_count: bigint | number }>(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
       FROM internet_personality_reviews WHERE personality_id = ? AND status != 'rejected'`,
      [personalityId]
    );
    const row = result.rows[0];
    const avgRating = row?.avg_rating ?? 0;
    const reviewCount = bigIntToNumber(row?.review_count);

    await this.db.query(
      'UPDATE content_internet_personalities SET rating_average = ?, rating_count = ? WHERE id = ?',
      [avgRating, reviewCount, personalityId]
    );
  }

  /**
   * Get collaboration by ID (internal helper)
   */
  private async getCollaborationById(id: number): Promise<Collaboration | null> {
    const result: DbResult<InternetPersonalityCollaborationRow> = await this.db.query<InternetPersonalityCollaborationRow>(
      'SELECT * FROM internet_personality_collaborations WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapCollaborationRow(row);
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
      const existing = await this.getPersonalityBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      if (counter > 1000) {
        throw BizError.internalServerError(
          'InternetPersonalityService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Build SQL sort clause from sort option
   */
  private buildSortClause(sort?: InternetPersonalitySortOption): string {
    switch (sort) {
      case 'recent':
        return 'ORDER BY cip.created_at DESC';
      case 'popular':
        return 'ORDER BY cip.view_count DESC';
      case 'rating':
        return 'ORDER BY cip.rating_average DESC';
      case 'alphabetical':
        return 'ORDER BY cip.display_name ASC';
      default:
        return 'ORDER BY cip.created_at DESC';
    }
  }

  /**
   * Map database row to InternetPersonalityProfile application entity
   * GOVERNANCE: mariadb auto-parses JSON columns - check if already array
   * GOVERNANCE: TINYINT(1) -> boolean via !! operator
   */
  private mapRowToProfile(row: ContentInternetPersonalityRow): InternetPersonalityProfile {
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
      creating_since: row.creating_since,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      content_categories: row.content_categories ? (Array.isArray(row.content_categories) ? row.content_categories : safeJsonParse<string[]>(row.content_categories) ?? []) : [],
      platforms: row.platforms ? (Array.isArray(row.platforms) ? row.platforms : safeJsonParse<string[]>(row.platforms) ?? []) : [],
      total_reach: row.total_reach,
      avg_engagement_rate: row.avg_engagement_rate,
      collaboration_types: row.collaboration_types ? (Array.isArray(row.collaboration_types) ? row.collaboration_types : safeJsonParse<string[]>(row.collaboration_types) ?? []) : [],
      rate_card: row.rate_card ? (typeof row.rate_card === 'object' ? row.rate_card as Record<string, unknown> : safeJsonParse<Record<string, unknown>>(row.rate_card)) : null,
      media_kit_url: row.media_kit_url,
      management_contact: row.management_contact,
      website_url: row.website_url,
      social_links: row.social_links ? (typeof row.social_links === 'object' ? row.social_links as Record<string, string> : safeJsonParse<Record<string, string>>(row.social_links)) : null,
      is_verified: !!row.is_verified,
      is_featured: !!row.is_featured,
      status: row.status as InternetPersonalityStatus,
      collaboration_count: row.collaboration_count,
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
   * Map database row to Collaboration application entity
   */
  private mapCollaborationRow(row: InternetPersonalityCollaborationRow): Collaboration {
    return {
      id: row.id,
      personality_id: row.personality_id,
      brand_name: row.brand_name,
      brand_logo: row.brand_logo,
      listing_id: row.listing_id,
      collaboration_type: row.collaboration_type,
      description: row.description,
      content_url: row.content_url,
      collaboration_date: row.collaboration_date ? new Date(row.collaboration_date) : null,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at)
    };
  }

  // ============================================================================
  // Platform Sync Methods (Phase 9B)
  // ============================================================================

  /**
   * Update profile metrics from platform sync
   * @phase Phase 9B
   */
  async updatePlatformMetrics(personalityId: number, metrics: {
    total_reach?: number;
    avg_engagement_rate?: number | null;
    platforms?: string[];
  }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (metrics.total_reach !== undefined) {
      fields.push('total_reach = ?');
      values.push(metrics.total_reach);
    }
    if (metrics.avg_engagement_rate !== undefined) {
      fields.push('avg_engagement_rate = ?');
      values.push(metrics.avg_engagement_rate);
    }
    if (metrics.platforms !== undefined) {
      fields.push('platforms = ?');
      values.push(JSON.stringify(metrics.platforms));
    }

    if (fields.length === 0) return;

    values.push(personalityId);
    await this.db.query(
      `UPDATE content_internet_personalities SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Get connected platforms for a profile (delegates to PlatformSyncService)
   * @phase Phase 9B
   */
  async getConnectedPlatforms(personalityId: number): Promise<import('@core/types/platform-sync').PlatformConnection[]> {
    const { getPlatformSyncService } = await import('@core/services/PlatformSyncService');
    const syncService = getPlatformSyncService();
    return syncService.getConnections('internet_personality', personalityId);
  }

  /**
   * Get latest platform metrics per platform
   * @phase Phase 9B
   */
  async getLatestPlatformMetrics(personalityId: number): Promise<Record<string, import('@core/types/platform-sync').PlatformMetricsSnapshot | null>> {
    const { getPlatformSyncService } = await import('@core/services/PlatformSyncService');
    const syncService = getPlatformSyncService();
    return syncService.getLatestMetrics('internet_personality', personalityId);
  }

  // ==========================================================================
  // MEDIA KIT OPERATIONS (Phase 9C)
  // ==========================================================================

  /**
   * Update media_kit_url after Cloudinary upload
   * @phase Phase 9C
   */
  async updateMediaKitUrl(personalityId: number, url: string): Promise<void> {
    await this.db.query(
      'UPDATE content_internet_personalities SET media_kit_url = ?, updated_at = NOW() WHERE id = ?',
      [url, personalityId]
    );
  }

  /**
   * Assemble all data needed for media kit generation
   * @phase Phase 9C
   */
  async getMediaKitData(personalityId: number): Promise<import('@core/utils/export/mediaKitPdfGenerator').MediaKitData> {
    const profile = await this.getPersonalityById(personalityId);
    if (!profile) {
      throw new InternetPersonalityNotFoundError(personalityId);
    }

    const [collaborations, connectedPlatformsList, platformMetrics] = await Promise.all([
      this.getCollaborations(personalityId),
      this.getConnectedPlatforms(personalityId),
      this.getLatestPlatformMetrics(personalityId),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizconekt.com';
    const profileUrl = `${baseUrl}/internet-personalities/${profile.slug}`;

    // Map platform metrics to expected shape
    const mappedMetrics: Record<string, {
      follower_count: number;
      avg_engagement_rate: number | null;
      total_views: number;
      platform_username: string | null;
    } | null> = {};

    for (const [platform, metrics] of Object.entries(platformMetrics)) {
      if (metrics) {
        mappedMetrics[platform] = {
          follower_count: metrics.follower_count + metrics.subscriber_count,
          avg_engagement_rate: metrics.avg_engagement_rate,
          total_views: metrics.total_views,
          platform_username: null,
        };
      } else {
        mappedMetrics[platform] = null;
      }
    }

    return {
      profile: {
        display_name: profile.display_name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        content_categories: profile.content_categories,
        platforms: profile.platforms,
        collaboration_types: profile.collaboration_types,
        total_reach: profile.total_reach,
        avg_engagement_rate: profile.avg_engagement_rate,
        rating_average: profile.rating_average,
        rating_count: profile.rating_count,
        view_count: profile.view_count,
        contact_count: profile.contact_count,
        website_url: profile.website_url,
        social_links: profile.social_links,
        management_contact: profile.management_contact,
        creating_since: profile.creating_since,
        rate_card: profile.rate_card as Record<string, unknown> | null,
        slug: profile.slug || '',
      },
      collaborations: collaborations.map(c => ({
        brand_name: c.brand_name,
        collaboration_type: c.collaboration_type,
        description: c.description,
        collaboration_date: c.collaboration_date
          ? new Date(c.collaboration_date).toISOString().split('T')[0] ?? null
          : null,
      })),
      platformMetrics: mappedMetrics,
      connectedPlatforms: connectedPlatformsList.filter(c => c.is_active).map(c => c.platform),
      generatedAt: new Date().toISOString(),
      profileUrl,
    };
  }

  /**
   * Map database row to InternetPersonalityReview application entity
   */
  private mapReviewRow(row: InternetPersonalityReviewRow): InternetPersonalityReview {
    return {
      id: row.id,
      personality_id: row.personality_id,
      reviewer_user_id: row.reviewer_user_id,
      reviewer_listing_id: row.reviewer_listing_id,
      rating: row.rating,
      review_text: row.review_text,
      collaboration_type: row.collaboration_type,
      status: row.status,
      created_at: new Date(row.created_at)
    };
  }
}
