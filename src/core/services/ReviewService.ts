/**
 * ReviewService - Review/Rating Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Moderation workflow enforcement
 * - Owner response system
 * - Helpfulness tracking with duplicate prevention
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @phase Phase 4 - Task 4.5: ReviewService Implementation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ListingService } from '@core/services/ListingService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { ReviewRow, ReviewHelpfulnessRow } from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  review_text: string | null;
  images: string[] | null;
  status: ReviewStatus;
  moderation_reason: string | null;
  moderated_by: number | null;
  moderated_at: Date | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  owner_response: string | null;
  owner_response_date: Date | null;
  is_mock: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  review_text?: string;
  images?: string[];
  is_verified_purchase?: boolean;
  is_mock?: boolean;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  review_text?: string;
  images?: string[];
}

export interface ReviewFilters {
  listingId?: number;
  userId?: number;
  status?: ReviewStatus;
  minRating?: number;
  maxRating?: number;
  isMock?: boolean;
  hasOwnerResponse?: boolean;
  searchQuery?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  total: number;
  average: number;
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ReviewNotFoundError extends BizError {
  constructor(identifier: number) {
    super({
      code: 'REVIEW_NOT_FOUND',
      message: `Review not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested review was not found'
    });
  }
}

export class DuplicateReviewError extends BizError {
  constructor(userId: number, listingId: number) {
    super({
      code: 'DUPLICATE_REVIEW',
      message: `User ${userId} has already reviewed listing ${listingId}`,
      context: { userId, listingId },
      userMessage: 'You have already submitted a review for this listing'
    });
  }
}

export class UnauthorizedReviewError extends BizError {
  constructor(userId: number, reviewId: number) {
    super({
      code: 'UNAUTHORIZED_REVIEW',
      message: `User ${userId} is not authorized to modify review ${reviewId}`,
      context: { userId, reviewId },
      userMessage: 'You are not authorized to modify this review'
    });
  }
}

export class InvalidRatingError extends BizError {
  constructor(rating: number) {
    super({
      code: 'INVALID_RATING',
      message: `Invalid rating: ${rating}. Must be between 1 and 5`,
      context: { rating },
      userMessage: 'Rating must be between 1 and 5 stars'
    });
  }
}

export class ReviewAlreadyModeratedError extends BizError {
  constructor(reviewId: number, status: ReviewStatus) {
    super({
      code: 'REVIEW_ALREADY_MODERATED',
      message: `Review ${reviewId} has already been moderated (status: ${status})`,
      context: { reviewId, status },
      userMessage: 'This review has already been moderated'
    });
  }
}

// ============================================================================
// ReviewService Implementation
// ============================================================================

export class ReviewService {
  private db: DatabaseService;
  private listingService: ListingService;

  constructor(db: DatabaseService, listingService: ListingService) {
    this.db = db;
    this.listingService = listingService;
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  /**
   * Get all reviews with optional filters and pagination
   * @param filters Optional filters
   * @param pagination Optional pagination parameters
   * @returns Paginated result of reviews
   */
  async getAll(
    filters?: ReviewFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Review>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM reviews';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.listingId !== undefined) {
        conditions.push('listing_id = ?');
        params.push(filters.listingId);
      }

      if (filters.userId !== undefined) {
        conditions.push('user_id = ?');
        params.push(filters.userId);
      }

      if (filters.status !== undefined) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.minRating !== undefined) {
        conditions.push('rating >= ?');
        params.push(filters.minRating);
      }

      if (filters.maxRating !== undefined) {
        conditions.push('rating <= ?');
        params.push(filters.maxRating);
      }

      if (filters.isMock !== undefined) {
        conditions.push('is_mock = ?');
        params.push(filters.isMock ? 1 : 0);
      }

      if (filters.hasOwnerResponse !== undefined) {
        if (filters.hasOwnerResponse) {
          conditions.push('owner_response IS NOT NULL');
        } else {
          conditions.push('owner_response IS NULL');
        }
      }

      if (filters.searchQuery) {
        conditions.push('(title LIKE ? OR review_text LIKE ?)');
        params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM reviews${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const row = countResult.rows[0];
    const total = row ? bigIntToNumber(row.total) : 0;

    // Get paginated data
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result: DbResult<ReviewRow> = await this.db.query(sql, params);

    return {
      data: result.rows.map((r) => this.mapRowToReview(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get review by ID
   * @param id Review ID
   * @returns Review or null if not found
   */
  async getById(id: number): Promise<Review | null> {
    const result: DbResult<ReviewRow> = await this.db.query(
      'SELECT * FROM reviews WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToReview(row);
  }

  /**
   * Get all reviews for a listing with pagination
   * @param listingId Listing ID
   * @param pagination Pagination parameters
   * @returns Paginated result of reviews
   */
  async getByListingId(
    listingId: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Review>> {
    return this.getAll({ listingId, status: ReviewStatus.APPROVED }, pagination);
  }

  /**
   * Get all reviews by a user
   * @param userId User ID
   * @returns Array of reviews
   */
  async getByUserId(userId: number): Promise<Review[]> {
    const result: DbResult<ReviewRow> = await this.db.query(
      'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map((r) => this.mapRowToReview(r));
  }

  /**
   * Get pending reviews (for moderation)
   * @returns Array of pending reviews
   */
  async getPendingReviews(): Promise<Review[]> {
    const result: DbResult<ReviewRow> = await this.db.query(
      `SELECT * FROM reviews
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    return result.rows.map((r) => this.mapRowToReview(r));
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new review
   * @param listingId Listing ID
   * @param userId User ID
   * @param data Review data
   * @returns Created review
   */
  async create(
    listingId: number,
    userId: number,
    data: CreateReviewInput
  ): Promise<Review> {
    // Validate listing exists
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Validate rating range
    if (data.rating < 1 || data.rating > 5) {
      throw new InvalidRatingError(data.rating);
    }

    // Check for duplicate review
    const hasReviewed = await this.hasUserReviewed(userId, listingId);
    if (hasReviewed) {
      throw new DuplicateReviewError(userId, listingId);
    }

    // Prepare JSON fields
    const images = data.images ? JSON.stringify(data.images) : null;

    // Insert review
    const result: DbResult<ReviewRow> = await this.db.query(
      `INSERT INTO reviews (
        listing_id, user_id, rating, title, review_text, images,
        is_verified_purchase, status, is_mock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        listingId,
        userId,
        data.rating,
        data.title || null,
        data.review_text || null,
        images,
        data.is_verified_purchase ? 1 : 0,
        data.is_mock ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create review',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create review',
        new Error('Failed to retrieve created review')
      );
    }

    // Fire-and-forget notification to listing owner
    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      // listing already fetched at line 355 - Don't notify self-reviews
      if (listing.user_id !== userId) {
        const reviewerResult = await this.db.query<{ first_name: string; last_name: string }>(
          'SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1',
          [userId]
        );
        const reviewer = reviewerResult.rows[0];
        const reviewerName = reviewer
          ? `${reviewer.first_name} ${reviewer.last_name}`.trim()
          : 'Someone';

        notificationService.dispatch({
          type: 'review.received',
          recipientId: listing.user_id as number,
          title: `${reviewerName} left a ${data.rating}-star review`,
          message: data.title || 'New review on your listing',
          entityType: 'review',
          entityId: created.id,
          actionUrl: '/dashboard/reviews',
          priority: 'normal',
          metadata: {
            review_id: created.id,
            listing_id: listingId,
            rating: data.rating,
            reviewer_user_id: userId
          },
          triggeredBy: userId
        }).catch(err => {
          console.error('[ReviewService] Failed to dispatch review.received notification:', err);
        });
      }
    } catch (err) {
      // Notification failure must not break review creation
    }

    return created;
  }

  /**
   * Update a review
   * @param id Review ID
   * @param userId User ID (for ownership verification)
   * @param data Update data
   * @returns Updated review
   */
  async update(
    id: number,
    userId: number,
    data: UpdateReviewInput
  ): Promise<Review> {
    // Check review exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new ReviewNotFoundError(id);
    }

    // Verify ownership
    if (existing.user_id !== userId) {
      throw new UnauthorizedReviewError(userId, id);
    }

    // Validate rating if being updated
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new InvalidRatingError(data.rating);
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.rating !== undefined) {
      updates.push('rating = ?');
      params.push(data.rating);
    }

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.review_text !== undefined) {
      updates.push('review_text = ?');
      params.push(data.review_text);
    }

    if (data.images !== undefined) {
      updates.push('images = ?');
      params.push(JSON.stringify(data.images));
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    // Reset moderation status if content changed
    updates.push('status = ?');
    params.push('pending');

    params.push(id);

    await this.db.query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update review',
        new Error('Failed to retrieve updated review')
      );
    }

    // Recalculate listing rating since review changed
    await this.updateListingRating(existing.listing_id);

    return updated;
  }

  /**
   * Delete a review
   * @param id Review ID
   * @param userId User ID (for ownership verification)
   */
  async delete(id: number, userId: number): Promise<void> {
    const review = await this.getById(id);
    if (!review) {
      throw new ReviewNotFoundError(id);
    }

    // Verify ownership
    if (review.user_id !== userId) {
      throw new UnauthorizedReviewError(userId, id);
    }

    const listingId = review.listing_id;

    await this.db.query('DELETE FROM reviews WHERE id = ?', [id]);

    // Recalculate listing rating after deletion
    await this.updateListingRating(listingId);
  }

  /**
   * Add owner response to a review
   * @param reviewId Review ID
   * @param listingOwnerId Listing owner user ID
   * @param response Response text
   * @returns Updated review
   */
  async addOwnerResponse(
    reviewId: number,
    listingOwnerId: number,
    response: string
  ): Promise<Review> {
    const review = await this.getById(reviewId);
    if (!review) {
      throw new ReviewNotFoundError(reviewId);
    }

    // Verify listing ownership
    const listing = await this.listingService.getById(review.listing_id);
    if (!listing || listing.user_id !== listingOwnerId) {
      throw BizError.forbidden(
        'Only the listing owner can respond to reviews'
      );
    }

    // Check if response already exists
    if (review.owner_response) {
      throw BizError.badRequest('Owner response already exists');
    }

    await this.db.query(
      `UPDATE reviews
       SET owner_response = ?, owner_response_date = NOW()
       WHERE id = ?`,
      [response, reviewId]
    );

    const updated = await this.getById(reviewId);
    if (!updated) {
      throw BizError.databaseError(
        'add owner response',
        new Error('Failed to retrieve updated review')
      );
    }

    // Fire-and-forget notification to review author
    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      // review.user_id is the original reviewer, listing already fetched at line 533
      const ownerResult = await this.db.query<{ first_name: string; last_name: string }>(
        'SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1',
        [listingOwnerId]
      );
      const owner = ownerResult.rows[0];
      const ownerName = owner
        ? `${owner.first_name} ${owner.last_name}`.trim()
        : 'The business owner';

      notificationService.dispatch({
        type: 'review.response',
        recipientId: review.user_id,
        title: `${ownerName} responded to your review`,
        message: response.substring(0, 100),
        entityType: 'review',
        entityId: reviewId,
        actionUrl: `/listings/${listing?.slug || review.listing_id}#reviews`,
        priority: 'normal',
        metadata: {
          review_id: reviewId,
          listing_id: review.listing_id,
          owner_user_id: listingOwnerId
        },
        triggeredBy: listingOwnerId
      }).catch(err => {
        console.error('[ReviewService] Failed to dispatch review.response notification:', err);
      });
    } catch (err) {
      // Notification failure must not break owner response
    }

    return updated;
  }

  // ==========================================================================
  // MODERATION Operations
  // ==========================================================================

  /**
   * Approve a review
   * @param id Review ID
   * @param adminId Admin user ID
   * @returns Updated review
   */
  async approve(id: number, adminId: number): Promise<Review> {
    const review = await this.getById(id);
    if (!review) {
      throw new ReviewNotFoundError(id);
    }

    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.FLAGGED) {
      throw new ReviewAlreadyModeratedError(id, review.status);
    }

    await this.db.query(
      `UPDATE reviews
       SET status = 'approved', moderated_by = ?, moderated_at = NOW()
       WHERE id = ?`,
      [adminId, id]
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'approve review',
        new Error('Failed to retrieve updated review')
      );
    }

    // Update listing rating
    await this.updateListingRating(review.listing_id);

    return updated;
  }

  /**
   * Reject a review
   * @param id Review ID
   * @param adminId Admin user ID
   * @param reason Rejection reason
   * @returns Updated review
   */
  async reject(id: number, adminId: number, reason: string): Promise<Review> {
    const review = await this.getById(id);
    if (!review) {
      throw new ReviewNotFoundError(id);
    }

    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.FLAGGED) {
      throw new ReviewAlreadyModeratedError(id, review.status);
    }

    await this.db.query(
      `UPDATE reviews
       SET status = 'rejected', moderation_reason = ?, moderated_by = ?, moderated_at = NOW()
       WHERE id = ?`,
      [reason, adminId, id]
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'reject review',
        new Error('Failed to retrieve updated review')
      );
    }

    // Update listing rating (rejected reviews don't count)
    await this.updateListingRating(review.listing_id);

    return updated;
  }

  /**
   * Flag a review for moderation
   * @param id Review ID
   * @param userId User ID who flagged
   * @param reason Flag reason
   */
  async flag(id: number, userId: number, reason: string): Promise<void> {
    const review = await this.getById(id);
    if (!review) {
      throw new ReviewNotFoundError(id);
    }

    await this.db.query(
      `UPDATE reviews
       SET status = 'flagged', moderation_reason = ?
       WHERE id = ?`,
      [reason, id]
    );
  }

  // ==========================================================================
  // HELPFULNESS Operations
  // ==========================================================================

  /**
   * Mark review as helpful/not helpful
   * @param reviewId Review ID
   * @param userId User ID
   * @param isHelpful True if helpful, false if not helpful
   */
  async markHelpful(
    reviewId: number,
    userId: number,
    isHelpful: boolean
  ): Promise<void> {
    const review = await this.getById(reviewId);
    if (!review) {
      throw new ReviewNotFoundError(reviewId);
    }

    // Use transaction to ensure consistency
    await this.db.transaction(async (client) => {
      // Check for existing helpfulness vote
      const existing: DbResult<ReviewHelpfulnessRow> = await client.query(
        'SELECT * FROM review_helpfulness WHERE review_id = ? AND user_id = ?',
        [reviewId, userId]
      );

      const existingRow = existing.rows[0];
      if (existingRow) {
        // Update existing vote
        if (Boolean(existingRow.is_helpful) === isHelpful) {
          // Same vote - no change needed
          return;
        }

        // Update vote
        await client.query(
          'UPDATE review_helpfulness SET is_helpful = ? WHERE id = ?',
          [isHelpful ? 1 : 0, existingRow.id]
        );

        // Update review counts (swap old vote to new)
        if (isHelpful) {
          await client.query(
            `UPDATE reviews
             SET helpful_count = helpful_count + 1,
                 not_helpful_count = not_helpful_count - 1
             WHERE id = ?`,
            [reviewId]
          );
        } else {
          await client.query(
            `UPDATE reviews
             SET helpful_count = helpful_count - 1,
                 not_helpful_count = not_helpful_count + 1
             WHERE id = ?`,
            [reviewId]
          );
        }
      } else {
        // Insert new vote
        await client.query(
          `INSERT INTO review_helpfulness (review_id, user_id, is_helpful)
           VALUES (?, ?, ?)`,
          [reviewId, userId, isHelpful ? 1 : 0]
        );

        // Update review count
        if (isHelpful) {
          await client.query(
            'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
            [reviewId]
          );
        } else {
          await client.query(
            'UPDATE reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = ?',
            [reviewId]
          );
        }
      }
    });
  }

  /**
   * Get helpfulness statistics for a review
   * @param reviewId Review ID
   * @returns Helpfulness counts
   */
  async getHelpfulnessStats(
    reviewId: number
  ): Promise<{ helpful: number; notHelpful: number }> {
    const review = await this.getById(reviewId);
    if (!review) {
      throw new ReviewNotFoundError(reviewId);
    }

    return {
      helpful: review.helpful_count,
      notHelpful: review.not_helpful_count
    };
  }

  // ==========================================================================
  // STATISTICS Operations
  // ==========================================================================

  /**
   * Calculate average rating for a listing
   * @param listingId Listing ID
   * @returns Average rating (0 if no reviews)
   */
  async calculateAverageRating(listingId: number): Promise<number> {
    const result: DbResult<{ average: number | null }> = await this.db.query(
      `SELECT AVG(rating) as average
       FROM reviews
       WHERE listing_id = ? AND status = 'approved'`,
      [listingId]
    );

    const row = result.rows[0];
    return row && row.average !== null ? parseFloat(String(row.average)) : 0;
  }

  /**
   * Get rating distribution for a listing
   * @param listingId Listing ID
   * @returns Rating distribution with counts for each star level
   */
  async getRatingDistribution(listingId: number): Promise<RatingDistribution> {
    const result: DbResult<{ rating: number; count: bigint | number }> = await this.db.query(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE listing_id = ? AND status = 'approved'
       GROUP BY rating`,
      [listingId]
    );

    const distribution: RatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      total: 0,
      average: 0
    };

    result.rows.forEach((row) => {
      const rating = parseInt(String(row.rating));
      const count = bigIntToNumber(row.count);
      distribution[rating as 1 | 2 | 3 | 4 | 5] = count;
      distribution.total += count;
    });

    // Calculate average
    if (distribution.total > 0) {
      const sum =
        distribution[1] * 1 +
        distribution[2] * 2 +
        distribution[3] * 3 +
        distribution[4] * 4 +
        distribution[5] * 5;
      distribution.average = sum / distribution.total;
    }

    return distribution;
  }

  /**
   * Update listing rating (called after review changes)
   * @param listingId Listing ID
   */
  async updateListingRating(listingId: number): Promise<void> {
    const average = await this.calculateAverageRating(listingId);

    // Note: The current listings table doesn't have average_rating column
    // This would need to be added in a migration
    // For now, we'll just calculate and return
    // TODO: Add average_rating and review_count columns to listings table
  }

  // ==========================================================================
  // VALIDATION Operations
  // ==========================================================================

  /**
   * Check if user can review a listing
   * @param userId User ID
   * @param listingId Listing ID
   * @returns True if user can review
   */
  async canUserReview(userId: number, listingId: number): Promise<boolean> {
    // Check if user is listing owner
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      return false;
    }

    if (listing.user_id === userId) {
      return false; // Can't review own listing
    }

    // Check if user has already reviewed
    const hasReviewed = await this.hasUserReviewed(userId, listingId);
    if (hasReviewed) {
      return false;
    }

    return true;
  }

  /**
   * Check if user has already reviewed a listing
   * @param userId User ID
   * @param listingId Listing ID
   * @returns True if user has reviewed
   */
  async hasUserReviewed(userId: number, listingId: number): Promise<boolean> {
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    const row = result.rows[0];
    return row ? bigIntToNumber(row.count) > 0 : false;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to Review interface
   */
  private mapRowToReview(row: ReviewRow): Review {
    return {
      id: row.id,
      listing_id: row.listing_id,
      user_id: row.user_id,
      rating: row.rating,
      title: row.title || null,
      review_text: row.review_text || null,
      images: row.images ? safeJsonParse(row.images, []) : null,
      status: row.status as ReviewStatus,
      moderation_reason: row.moderation_reason || null,
      moderated_by: row.moderated_by || null,
      moderated_at: row.moderated_at ? new Date(row.moderated_at) : null,
      is_verified_purchase: Boolean(row.is_verified_purchase),
      helpful_count: row.helpful_count || 0,
      not_helpful_count: row.not_helpful_count || 0,
      owner_response: row.owner_response || null,
      owner_response_date: row.owner_response_date ? new Date(row.owner_response_date) : null,
      is_mock: Boolean(row.is_mock),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
