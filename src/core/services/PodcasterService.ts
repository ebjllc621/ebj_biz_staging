/**
 * PodcasterService - Podcaster Profile Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (ContentPodcasterRow, etc.)
 * - MariaDB patterns: ? placeholders, bigIntToNumber, JSON parse guard, TINYINT boolean
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier ADVANCED
 * @reference src/core/services/AffiliateMarketerService.ts - Exact patterns replicated
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type { DbResult } from '@core/types/db';
import type {
  ContentPodcasterRow,
  PodcasterEpisodeRow,
  PodcasterReviewRow
} from '@core/types/db-rows';
import type {
  PodcasterProfile,
  PodcasterEpisode,
  PodcasterReview,
  PodcasterFilters,
  PodcasterSortOption,
  CreatePodcasterInput,
  UpdatePodcasterInput,
  CreateEpisodeInput,
  UpdateEpisodeInput
} from '@core/types/podcaster';
import type { CreateContactProposalInput } from '@core/types/content-contact-proposal';
import { PodcasterStatus } from '@core/types/podcaster';

// ============================================================================
// Local Pagination Types (matches AffiliateMarketerService pattern)
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

export class PodcasterNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'PODCASTER_NOT_FOUND',
      message: `Podcaster not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested podcaster profile was not found'
    });
  }
}

export class DuplicatePodcasterSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_PODCASTER_SLUG',
      message: `Podcaster slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'A podcaster profile with this URL slug already exists'
    });
  }
}

// ============================================================================
// PodcasterService Implementation
// ============================================================================

export class PodcasterService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get podcaster profiles with optional filters, pagination, and sorting
   */
  async getPodcasters(
    filters?: PodcasterFilters,
    pagination?: PaginationParams,
    sort?: PodcasterSortOption
  ): Promise<PaginatedResult<PodcasterProfile>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT cp.* FROM content_podcasters cp';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.status !== undefined) {
      conditions.push('cp.status = ?');
      params.push(filters.status);
    }

    if (filters?.location !== undefined) {
      conditions.push('cp.location LIKE ?');
      params.push(`%${filters.location}%`);
    }

    if (filters?.genres !== undefined && filters.genres.length > 0) {
      conditions.push('JSON_CONTAINS(cp.genres, ?)');
      params.push(JSON.stringify(filters.genres));
    }

    if (filters?.platforms !== undefined && filters.platforms.length > 0) {
      conditions.push('JSON_CONTAINS(cp.platforms, ?)');
      params.push(JSON.stringify(filters.platforms));
    }

    if (filters?.is_verified !== undefined) {
      conditions.push('cp.is_verified = ?');
      params.push(filters.is_verified ? 1 : 0);
    }

    if (filters?.is_featured !== undefined) {
      conditions.push('cp.is_featured = ?');
      params.push(filters.is_featured ? 1 : 0);
    }

    if (filters?.minRating !== undefined) {
      conditions.push('cp.rating_average >= ?');
      params.push(filters.minRating);
    }

    if (filters?.searchQuery) {
      conditions.push('(cp.display_name LIKE ? OR cp.headline LIKE ? OR cp.bio LIKE ? OR cp.podcast_name LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_podcasters cp${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentPodcasterRow> = await this.db.query<ContentPodcasterRow>(sql, params);

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
   * Get podcaster profile by ID
   */
  async getPodcasterById(id: number): Promise<PodcasterProfile | null> {
    const result: DbResult<ContentPodcasterRow> = await this.db.query<ContentPodcasterRow>(
      'SELECT * FROM content_podcasters WHERE id = ?',
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
   * Get podcaster profile by slug
   */
  async getPodcasterBySlug(slug: string): Promise<PodcasterProfile | null> {
    const result: DbResult<ContentPodcasterRow> = await this.db.query<ContentPodcasterRow>(
      'SELECT * FROM content_podcasters WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToProfile(row);
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new podcaster profile
   */
  async createProfile(userId: number, data: CreatePodcasterInput): Promise<PodcasterProfile> {
    const slug = data.slug || await this.generateSlug(data.display_name);

    const existing = await this.getPodcasterBySlug(slug);
    if (existing) {
      throw new DuplicatePodcasterSlugError(slug);
    }

    const result: DbResult<ContentPodcasterRow> = await this.db.query<ContentPodcasterRow>(
      `INSERT INTO content_podcasters
       (user_id, listing_id, display_name, slug, profile_image, cover_image,
        headline, bio, location, podcast_name, hosting_platform, rss_feed_url,
        total_episodes, avg_episode_length, publishing_frequency, genres,
        guest_booking_info, monetization_methods, listener_count, download_count,
        platforms, website_url, social_links, is_featured, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
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
        data.podcast_name || null,
        data.hosting_platform || null,
        data.rss_feed_url || null,
        data.total_episodes || 0,
        data.avg_episode_length || 0,
        data.publishing_frequency || 'weekly',
        JSON.stringify(data.genres || []),
        data.guest_booking_info || null,
        JSON.stringify(data.monetization_methods || []),
        data.listener_count || 0,
        data.download_count || 0,
        JSON.stringify(data.platforms || []),
        data.website_url || null,
        data.social_links ? JSON.stringify(data.social_links) : null,
        data.is_featured ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create podcaster profile', new Error('No insert ID returned'));
    }

    const created = await this.getPodcasterById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create podcaster profile', new Error('Failed to retrieve created profile'));
    }

    return created;
  }

  /**
   * Update a podcaster profile
   */
  async updateProfile(id: number, data: UpdatePodcasterInput): Promise<PodcasterProfile> {
    const existing = await this.getPodcasterById(id);
    if (!existing) {
      throw new PodcasterNotFoundError(id);
    }

    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getPodcasterBySlug(data.slug);
      if (duplicate) {
        throw new DuplicatePodcasterSlugError(data.slug);
      }
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.display_name !== undefined) { updates.push('display_name = ?'); params.push(data.display_name); }
    if (data.slug !== undefined) { updates.push('slug = ?'); params.push(data.slug); }
    if (data.listing_id !== undefined) { updates.push('listing_id = ?'); params.push(data.listing_id); }
    if (data.profile_image !== undefined) { updates.push('profile_image = ?'); params.push(data.profile_image); }
    if (data.cover_image !== undefined) { updates.push('cover_image = ?'); params.push(data.cover_image); }
    if (data.headline !== undefined) { updates.push('headline = ?'); params.push(data.headline); }
    if (data.bio !== undefined) { updates.push('bio = ?'); params.push(data.bio); }
    if (data.location !== undefined) { updates.push('location = ?'); params.push(data.location); }
    if (data.podcast_name !== undefined) { updates.push('podcast_name = ?'); params.push(data.podcast_name); }
    if (data.hosting_platform !== undefined) { updates.push('hosting_platform = ?'); params.push(data.hosting_platform); }
    if (data.rss_feed_url !== undefined) { updates.push('rss_feed_url = ?'); params.push(data.rss_feed_url); }
    if (data.total_episodes !== undefined) { updates.push('total_episodes = ?'); params.push(data.total_episodes); }
    if (data.avg_episode_length !== undefined) { updates.push('avg_episode_length = ?'); params.push(data.avg_episode_length); }
    if (data.publishing_frequency !== undefined) { updates.push('publishing_frequency = ?'); params.push(data.publishing_frequency); }
    if (data.genres !== undefined) { updates.push('genres = ?'); params.push(JSON.stringify(data.genres)); }
    if (data.guest_booking_info !== undefined) { updates.push('guest_booking_info = ?'); params.push(data.guest_booking_info); }
    if (data.monetization_methods !== undefined) { updates.push('monetization_methods = ?'); params.push(JSON.stringify(data.monetization_methods)); }
    if (data.listener_count !== undefined) { updates.push('listener_count = ?'); params.push(data.listener_count); }
    if (data.download_count !== undefined) { updates.push('download_count = ?'); params.push(data.download_count); }
    if (data.platforms !== undefined) { updates.push('platforms = ?'); params.push(JSON.stringify(data.platforms)); }
    if (data.website_url !== undefined) { updates.push('website_url = ?'); params.push(data.website_url); }
    if (data.social_links !== undefined) { updates.push('social_links = ?'); params.push(data.social_links ? JSON.stringify(data.social_links) : null); }
    if (data.is_verified !== undefined) { updates.push('is_verified = ?'); params.push(data.is_verified ? 1 : 0); }
    if (data.is_featured !== undefined) { updates.push('is_featured = ?'); params.push(data.is_featured ? 1 : 0); }
    if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }
    if (data.published_at !== undefined) { updates.push('published_at = ?'); params.push(data.published_at); }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE content_podcasters SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getPodcasterById(id);
    if (!updated) {
      throw BizError.databaseError('update podcaster profile', new Error('Failed to retrieve updated profile'));
    }

    return updated;
  }

  /**
   * Get podcaster profile by user ID
   * @reference AffiliateMarketerService.getProfileByUserId()
   */
  async getProfileByUserId(userId: number): Promise<PodcasterProfile | null> {
    const result: DbResult<ContentPodcasterRow> = await this.db.query<ContentPodcasterRow>(
      'SELECT * FROM content_podcasters WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToProfile(row);
  }

  /**
   * Increment view count (fire-and-forget)
   * @reference AffiliateMarketerService.incrementViewCount()
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_podcasters SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // EPISODE OPERATIONS
  // ==========================================================================

  /**
   * Get episodes for a podcaster profile
   * @reference AffiliateMarketerService.getPortfolio()
   */
  async getEpisodes(podcasterId: number): Promise<PodcasterEpisode[]> {
    const result: DbResult<PodcasterEpisodeRow> = await this.db.query<PodcasterEpisodeRow>(
      'SELECT * FROM podcaster_episodes WHERE podcaster_id = ? ORDER BY sort_order ASC',
      [podcasterId]
    );

    return result.rows.map(row => this.mapEpisodeRow(row));
  }

  /**
   * Get a single episode by ID
   */
  async getEpisodeById(id: number): Promise<PodcasterEpisode | null> {
    const result: DbResult<PodcasterEpisodeRow> = await this.db.query<PodcasterEpisodeRow>(
      'SELECT * FROM podcaster_episodes WHERE id = ?',
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapEpisodeRow(row);
  }

  /**
   * Add an episode to a podcaster profile
   * @reference AffiliateMarketerService.addPortfolioItem()
   */
  async addEpisode(podcasterId: number, data: CreateEpisodeInput): Promise<PodcasterEpisode> {
    const podcaster = await this.getPodcasterById(podcasterId);
    if (!podcaster) {
      throw new PodcasterNotFoundError(podcasterId);
    }

    const sortResult: DbResult<{ max_sort: number | null }> = await this.db.query<{ max_sort: number | null }>(
      'SELECT MAX(sort_order) as max_sort FROM podcaster_episodes WHERE podcaster_id = ?',
      [podcasterId]
    );
    const sortOrder = (sortResult.rows[0]?.max_sort ?? 0) + 1;

    const result: DbResult<PodcasterEpisodeRow> = await this.db.query<PodcasterEpisodeRow>(
      `INSERT INTO podcaster_episodes
       (podcaster_id, episode_title, episode_number, season_number, description,
        audio_url, duration, guest_names, published_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        podcasterId,
        data.episode_title || null,
        data.episode_number ?? null,
        data.season_number ?? null,
        data.description || null,
        data.audio_url || null,
        data.duration ?? null,
        JSON.stringify(data.guest_names || []),
        data.published_at || null,
        sortOrder
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('add episode', new Error('No insert ID returned'));
    }

    const created = await this.getEpisodeById(result.insertId);
    if (!created) {
      throw BizError.databaseError('add episode', new Error('Failed to retrieve created episode'));
    }

    return created;
  }

  /**
   * Update an episode
   * @reference AffiliateMarketerService.updatePortfolioItem()
   */
  async updateEpisode(id: number, data: UpdateEpisodeInput): Promise<PodcasterEpisode> {
    const existing = await this.getEpisodeById(id);
    if (!existing) {
      throw BizError.notFound('Episode not found');
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.episode_title !== undefined) { updates.push('episode_title = ?'); params.push(data.episode_title); }
    if (data.episode_number !== undefined) { updates.push('episode_number = ?'); params.push(data.episode_number); }
    if (data.season_number !== undefined) { updates.push('season_number = ?'); params.push(data.season_number); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.audio_url !== undefined) { updates.push('audio_url = ?'); params.push(data.audio_url); }
    if (data.duration !== undefined) { updates.push('duration = ?'); params.push(data.duration); }
    if (data.guest_names !== undefined) { updates.push('guest_names = ?'); params.push(JSON.stringify(data.guest_names)); }
    if (data.published_at !== undefined) { updates.push('published_at = ?'); params.push(data.published_at); }
    if (data.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(data.sort_order); }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE podcaster_episodes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getEpisodeById(id);
    if (!updated) {
      throw BizError.databaseError('update episode', new Error('Failed to retrieve updated episode'));
    }

    return updated;
  }

  /**
   * Delete an episode
   * @reference AffiliateMarketerService.deletePortfolioItem()
   */
  async deleteEpisode(id: number): Promise<void> {
    const item = await this.getEpisodeById(id);
    if (!item) {
      throw BizError.notFound('Episode not found');
    }

    await this.db.query('DELETE FROM podcaster_episodes WHERE id = ?', [id]);
  }

  /**
   * Reorder episodes for a podcaster
   * @reference AffiliateMarketerService.reorderPortfolio()
   */
  async reorderEpisodes(podcasterId: number, itemIds: number[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const sortOrder = i + 1;
      await this.db.query(
        'UPDATE podcaster_episodes SET sort_order = ? WHERE id = ? AND podcaster_id = ?',
        [sortOrder, itemId, podcasterId]
      );
    }
  }

  // ==========================================================================
  // REVIEW OPERATIONS
  // ==========================================================================

  /**
   * Get reviews for a podcaster with pagination
   * @reference AffiliateMarketerService.getReviews()
   */
  async getReviews(
    podcasterId: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<PodcasterReview>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM podcaster_reviews WHERE podcaster_id = ?',
      [podcasterId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result: DbResult<PodcasterReviewRow> = await this.db.query<PodcasterReviewRow>(
      'SELECT * FROM podcaster_reviews WHERE podcaster_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [podcasterId, pageSize, offset]
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
   * Check if user has already reviewed this podcaster
   */
  async hasUserReviewed(podcasterId: number, userId: number): Promise<boolean> {
    const result: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM podcaster_reviews WHERE podcaster_id = ? AND reviewer_user_id = ?',
      [podcasterId, userId]
    );
    return bigIntToNumber(result.rows[0]?.total) > 0;
  }

  /**
   * Create a new review (starts as 'pending')
   * @reference AffiliateMarketerService.createReview()
   */
  async createReview(
    podcasterId: number,
    reviewerUserId: number,
    data: { rating: number; review_text?: string; episode_reference?: string; reviewer_listing_id?: number; images?: string[] }
  ): Promise<PodcasterReview> {
    const imagesJson = data.images && data.images.length > 0 ? JSON.stringify(data.images) : null;
    const result: DbResult<PodcasterReviewRow> = await this.db.query<PodcasterReviewRow>(
      `INSERT INTO podcaster_reviews (podcaster_id, reviewer_user_id, reviewer_listing_id, rating, review_text, episode_reference, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        podcasterId,
        reviewerUserId,
        data.reviewer_listing_id || null,
        data.rating,
        data.review_text || null,
        data.episode_reference || null,
        imagesJson
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create review', new Error('No insert ID returned'));
    }

    await this.updateRatingAggregates(podcasterId);

    const reviewResult: DbResult<PodcasterReviewRow> = await this.db.query<PodcasterReviewRow>(
      'SELECT * FROM podcaster_reviews WHERE id = ?',
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
  async getRatingDistribution(podcasterId: number): Promise<{ star: number; count: number }[]> {
    const result: DbResult<{ star: number; count: bigint | number }> = await this.db.query<{ star: number; count: bigint | number }>(
      `SELECT rating AS star, COUNT(*) AS count FROM podcaster_reviews
       WHERE podcaster_id = ? AND status != 'rejected'
       GROUP BY rating ORDER BY rating DESC`,
      [podcasterId]
    );
    return result.rows.map(row => ({ star: row.star, count: bigIntToNumber(row.count) }));
  }

  /**
   * Approve a review (admin action)
   */
  async approveReview(reviewId: number): Promise<void> {
    const reviewResult: DbResult<PodcasterReviewRow> = await this.db.query<PodcasterReviewRow>(
      'SELECT * FROM podcaster_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw BizError.notFound('Review not found');

    await this.db.query(
      "UPDATE podcaster_reviews SET status = 'approved' WHERE id = ?",
      [reviewId]
    );
    await this.updateRatingAggregates(review.podcaster_id);
  }

  /**
   * Reject a review (admin action)
   */
  async rejectReview(reviewId: number): Promise<void> {
    const reviewResult: DbResult<PodcasterReviewRow> = await this.db.query<PodcasterReviewRow>(
      'SELECT * FROM podcaster_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];
    if (!review) throw BizError.notFound('Review not found');

    await this.db.query(
      "UPDATE podcaster_reviews SET status = 'rejected' WHERE id = ?",
      [reviewId]
    );
    await this.updateRatingAggregates(review.podcaster_id);
  }

  // ==========================================================================
  // ADMIN OPERATIONS
  // ==========================================================================

  /**
   * Get profiles for admin (no default status filter - all statuses)
   */
  async getProfilesAdmin(
    filters?: PodcasterFilters,
    pagination?: PaginationParams,
    sort?: PodcasterSortOption
  ): Promise<PaginatedResult<PodcasterProfile>> {
    return this.getPodcasters(filters, pagination, sort);
  }

  /**
   * Get pending reviews for admin moderation
   * @reference AffiliateMarketerService.getPendingReviewsAdmin()
   */
  async getPendingReviewsAdmin(
    pagination?: PaginationParams
  ): Promise<PaginatedResult<PodcasterReview & { reviewer_display_name?: string }>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      "SELECT COUNT(*) as total FROM podcaster_reviews WHERE status = 'pending'"
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result: DbResult<PodcasterReviewRow & { reviewer_display_name?: string }> =
      await this.db.query<PodcasterReviewRow & { reviewer_display_name?: string }>(
        `SELECT r.*, u.display_name as reviewer_display_name
         FROM podcaster_reviews r
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

  /**
   * Get admin stats for podcaster profiles
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
      'SELECT status, COUNT(*) as cnt FROM content_podcasters GROUP BY status'
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
      'SELECT COUNT(*) as cnt FROM content_podcasters WHERE is_verified = 1'
    );
    const verifiedCount = bigIntToNumber(verifiedResult.rows[0]?.cnt);

    // Featured count
    const featuredResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM content_podcasters WHERE is_featured = 1'
    );
    const featuredCount = bigIntToNumber(featuredResult.rows[0]?.cnt);

    // Pending review count
    const pendingReviewResult: DbResult<{ cnt: bigint | number }> = await this.db.query<{ cnt: bigint | number }>(
      "SELECT COUNT(*) as cnt FROM podcaster_reviews WHERE status = 'pending'"
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

  // ==========================================================================
  // CONTACT PROPOSAL OPERATIONS
  // ==========================================================================

  /**
   * Create a contact proposal for a podcaster profile
   * @reference AffiliateMarketerService.createContactProposal()
   */
  async createContactProposal(
    profileSlug: string,
    senderUserId: number,
    senderName: string,
    senderEmail: string,
    input: CreateContactProposalInput
  ): Promise<{ proposalId: number; profileOwnerId: number }> {
    const profile = await this.getPodcasterBySlug(profileSlug);
    if (!profile) {
      throw new PodcasterNotFoundError(profileSlug);
    }
    if (profile.status !== PodcasterStatus.ACTIVE) {
      throw new PodcasterNotFoundError(profileSlug);
    }

    const result: DbResult = await this.db.query(
      `INSERT INTO content_contact_proposals
       (profile_type, profile_id, profile_owner_user_id, sender_user_id, sender_name, sender_email, proposal_type, subject, message, budget_range, timeline, company_name)
       VALUES ('podcaster', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    await this.db.query(
      'UPDATE content_podcasters SET contact_count = contact_count + 1 WHERE id = ?',
      [profile.id]
    );

    return { proposalId, profileOwnerId: profile.user_id };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async updateRatingAggregates(podcasterId: number): Promise<void> {
    const result: DbResult<{ avg_rating: number | null; review_count: bigint | number }> = await this.db.query<{ avg_rating: number | null; review_count: bigint | number }>(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
       FROM podcaster_reviews WHERE podcaster_id = ? AND status != 'rejected'`,
      [podcasterId]
    );
    const row = result.rows[0];
    const avgRating = row?.avg_rating ?? 0;
    const reviewCount = bigIntToNumber(row?.review_count);

    await this.db.query(
      'UPDATE content_podcasters SET rating_average = ?, rating_count = ? WHERE id = ?',
      [avgRating, reviewCount, podcasterId]
    );
  }

  /**
   * Map database row to PodcasterEpisode application entity
   */
  private mapEpisodeRow(row: PodcasterEpisodeRow): PodcasterEpisode {
    return {
      id: row.id,
      podcaster_id: row.podcaster_id,
      episode_title: row.episode_title,
      episode_number: row.episode_number,
      season_number: row.season_number,
      description: row.description,
      audio_url: row.audio_url,
      duration: row.duration,
      guest_names: row.guest_names ? (Array.isArray(row.guest_names) ? row.guest_names : safeJsonParse<string[]>(row.guest_names) ?? []) : [],
      published_at: row.published_at ? new Date(row.published_at) : null,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Map database row to PodcasterReview application entity
   */
  private mapReviewRow(row: PodcasterReviewRow): PodcasterReview {
    return {
      id: row.id,
      podcaster_id: row.podcaster_id,
      reviewer_user_id: row.reviewer_user_id,
      reviewer_listing_id: row.reviewer_listing_id,
      rating: row.rating,
      review_text: row.review_text,
      episode_reference: row.episode_reference,
      status: row.status,
      created_at: new Date(row.created_at)
    };
  }

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
      const existing = await this.getPodcasterBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      if (counter > 1000) {
        throw BizError.internalServerError(
          'PodcasterService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  private buildSortClause(sort?: PodcasterSortOption): string {
    switch (sort) {
      case 'recent':
        return 'ORDER BY cp.created_at DESC';
      case 'popular':
        return 'ORDER BY cp.view_count DESC';
      case 'rating':
        return 'ORDER BY cp.rating_average DESC';
      case 'alphabetical':
        return 'ORDER BY cp.display_name ASC';
      default:
        return 'ORDER BY cp.created_at DESC';
    }
  }

  /**
   * Map database row to PodcasterProfile application entity
   * GOVERNANCE: mariadb auto-parses JSON columns - check if already array
   * GOVERNANCE: TINYINT(1) -> boolean via !! operator
   */
  private mapRowToProfile(row: ContentPodcasterRow): PodcasterProfile {
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
      podcast_name: row.podcast_name,
      hosting_platform: row.hosting_platform,
      rss_feed_url: row.rss_feed_url,
      total_episodes: row.total_episodes,
      avg_episode_length: row.avg_episode_length,
      publishing_frequency: row.publishing_frequency,
      genres: row.genres ? (Array.isArray(row.genres) ? row.genres : safeJsonParse<string[]>(row.genres) ?? []) : [],
      guest_booking_info: row.guest_booking_info,
      monetization_methods: row.monetization_methods ? (Array.isArray(row.monetization_methods) ? row.monetization_methods : safeJsonParse<string[]>(row.monetization_methods) ?? []) : [],
      listener_count: row.listener_count,
      download_count: row.download_count,
      platforms: row.platforms ? (Array.isArray(row.platforms) ? row.platforms : safeJsonParse<string[]>(row.platforms) ?? []) : [],
      website_url: row.website_url,
      social_links: row.social_links ? (typeof row.social_links === 'object' ? row.social_links as Record<string, string> : safeJsonParse<Record<string, string>>(row.social_links)) : null,
      is_verified: !!row.is_verified,
      is_featured: !!row.is_featured,
      status: row.status as PodcasterStatus,
      view_count: row.view_count,
      contact_count: row.contact_count,
      rating_average: row.rating_average,
      rating_count: row.rating_count,
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null
    };
  }
}
