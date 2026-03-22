/**
 * OfferService - Offer/Deal Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Tier enforcement at service layer
 * - Redemption tracking with duplicate prevention
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @phase Phase 4 - Task 4.3: OfferService Implementation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ListingService, TierCheckResult } from '@core/services/ListingService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { OfferRow, OfferRedemptionRow, OfferMediaRow } from '@core/types/db-rows';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Offer {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: OfferType;
  original_price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  image: string | null;
  thumbnail: string | null;
  start_date: Date;
  end_date: Date;
  quantity_total: number | null;
  quantity_remaining: number | null;
  max_per_user: number;
  redemption_code: string | null;
  redemption_instructions: string | null;
  redemption_count: number;
  // Phase 1 fields
  promo_code_mode: 'universal' | 'unique';
  universal_code: string | null;
  terms_conditions: string | null;
  min_purchase_amount: number | null;
  applicable_products: unknown | null;
  status: OfferStatus;
  is_featured: boolean;
  is_mock: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOfferInput {
  title: string;
  slug?: string;
  description?: string;
  offer_type: OfferType;
  original_price?: number;
  sale_price?: number;
  discount_percentage?: number;
  image?: string;
  thumbnail?: string;
  start_date: Date | string;
  end_date: Date | string;
  quantity_total?: number;
  quantity_remaining?: number;
  max_per_user?: number;
  redemption_code?: string;
  redemption_instructions?: string;
  terms_conditions?: string;
  is_featured?: boolean;
  is_mock?: boolean;
}

export interface UpdateOfferInput {
  title?: string;
  slug?: string;
  description?: string;
  offer_type?: OfferType;
  original_price?: number;
  sale_price?: number;
  discount_percentage?: number;
  image?: string;
  thumbnail?: string;
  start_date?: Date | string;
  end_date?: Date | string;
  quantity_total?: number;
  quantity_remaining?: number;
  max_per_user?: number;
  redemption_code?: string;
  redemption_instructions?: string;
  status?: OfferStatus;
  is_featured?: boolean;
}

export interface OfferFilters {
  listingId?: number;
  offerType?: OfferType;
  status?: OfferStatus;
  isFeatured?: boolean;
  isMock?: boolean;
  isActive?: boolean; // Active = not expired, not sold out
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

export interface Redemption {
  id: number;
  offer_id: number;
  user_id: number;
  redeemed_at: Date;
  redemption_code: string | null;
}

export interface RedemptionCheck {
  canRedeem: boolean;
  reason: string | null;
  remainingRedemptions: number;
  userRedemptionCount: number;
}

export enum OfferType {
  DISCOUNT = 'discount',
  COUPON = 'coupon',
  PRODUCT = 'product',
  SERVICE = 'service'
}

export enum OfferStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  SOLD_OUT = 'sold_out'
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class OfferNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'OFFER_NOT_FOUND',
      message: `Offer not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested offer was not found'
    });
  }
}

export class OfferExpiredError extends BizError {
  constructor(offerId: number, endDate: Date) {
    super({
      code: 'OFFER_EXPIRED',
      message: `Offer ${offerId} expired on ${endDate}`,
      context: { offerId, endDate },
      userMessage: 'This offer has expired and is no longer available'
    });
  }
}

export class OfferSoldOutError extends BizError {
  constructor(offerId: number) {
    super({
      code: 'OFFER_SOLD_OUT',
      message: `Offer ${offerId} is sold out`,
      context: { offerId },
      userMessage: 'This offer is sold out'
    });
  }
}

export class RedemptionLimitExceededError extends BizError {
  constructor(offerId: number, limit: number) {
    super({
      code: 'REDEMPTION_LIMIT_EXCEEDED',
      message: `User has already redeemed offer ${offerId} ${limit} time(s)`,
      context: { offerId, limit },
      userMessage: 'You have already redeemed this offer the maximum number of times'
    });
  }
}

export class InvalidOfferDatesError extends BizError {
  constructor(startDate: Date, endDate: Date) {
    super({
      code: 'INVALID_OFFER_DATES',
      message: `Invalid offer dates: start_date (${startDate}) must be before end_date (${endDate})`,
      context: { startDate, endDate },
      userMessage: 'The offer start date must be before the end date'
    });
  }
}

export class TierLimitExceededError extends BizError {
  constructor(tier: string, limit: number) {
    super({
      code: 'TIER_LIMIT_EXCEEDED',
      message: `Offer limit exceeded for tier ${tier} (limit: ${limit})`,
      context: { tier, limit },
      userMessage: `You have reached the offer limit for your ${tier} tier`
    });
  }
}

export class InvalidPricingError extends BizError {
  constructor(message: string) {
    super({
      code: 'INVALID_PRICING',
      message,
      context: {},
      userMessage: 'Invalid pricing configuration: use either discount percentage or sale price, not both'
    });
  }
}

export class DuplicateSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_SLUG',
      message: `Offer slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'An offer with this URL slug already exists'
    });
  }
}

// ============================================================================
// Offer Media Tier Limits
// ============================================================================

// Premium is capped at 6 (not unlimited) unlike Jobs which allows unlimited media.
// See JobService checkMediaLimit for rationale on why Jobs differs.
const OFFER_TIER_IMAGE_LIMITS: Record<string, number> = {
  essentials: 1,
  plus: 3,
  preferred: 6,
  premium: 6,
};

const OFFER_TIER_VIDEO_LIMITS: Record<string, number> = {
  essentials: 0,
  plus: 1,
  preferred: 3,
  premium: 3,
};

// ============================================================================
// Offer Media Interfaces
// ============================================================================

export interface OfferMedia {
  id: number;
  offer_id: number;
  media_type: 'image' | 'video';
  file_url: string;
  sort_order: number;
  alt_text: string | null;
  embed_url: string | null;
  platform: string | null;
  source: 'upload' | 'embed' | null;
  thumbnail_url: string | null;
  created_at: Date;
}

export interface CreateOfferMediaInput {
  media_type: 'image' | 'video';
  file_url: string;
  alt_text?: string;
  sort_order?: number;
  embed_url?: string;
  platform?: string;
  source?: 'upload' | 'embed';
}

export interface OfferMediaLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  unlimited: boolean;
  tier: string;
}

export interface OfferMediaLimits {
  images: { current: number; limit: number; unlimited: boolean };
  videos: { current: number; limit: number; unlimited: boolean };
}

// ============================================================================
// OfferService Implementation
// ============================================================================

export class OfferService {
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
   * Get all offers with optional filters and pagination
   * @param filters Optional filters
   * @param pagination Optional pagination parameters
   * @returns Paginated result of offers
   */
  async getAll(
    filters?: OfferFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Offer>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM offers';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.listingId !== undefined) {
        conditions.push('listing_id = ?');
        params.push(filters.listingId);
      }

      if (filters.offerType !== undefined) {
        conditions.push('offer_type = ?');
        params.push(filters.offerType);
      }

      if (filters.status !== undefined) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.isFeatured !== undefined) {
        conditions.push('is_featured = ?');
        params.push(filters.isFeatured ? 1 : 0);
      }

      if (filters.isMock !== undefined) {
        conditions.push('is_mock = ?');
        params.push(filters.isMock ? 1 : 0);
      }

      if (filters.isActive) {
        conditions.push('status = ?');
        conditions.push('end_date > NOW()');
        params.push('active');
      }

      if (filters.searchQuery) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM offers${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{total: bigint | number}> = await this.db.query<{total: bigint | number}>(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated data
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(sql, params);

    return {
      data: result.rows.map(this.mapRowToOffer),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get offer by ID
   * @param id Offer ID
   * @returns Offer or null if not found
   */
  async getById(id: number): Promise<Offer | null> {
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      'SELECT * FROM offers WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToOffer(row);
  }

  /**
   * Get offer by slug
   * @param slug Offer slug
   * @returns Offer or null if not found
   */
  async getBySlug(slug: string): Promise<Offer | null> {
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      'SELECT * FROM offers WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToOffer(row);
  }

  /**
   * Get all offers for a listing
   * @param listingId Listing ID
   * @returns Array of offers
   */
  async getByListingId(listingId: number): Promise<Offer[]> {
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      'SELECT * FROM offers WHERE listing_id = ? ORDER BY created_at DESC',
      [listingId]
    );

    return result.rows.map(this.mapRowToOffer);
  }

  /**
   * Get active offers (not expired, not sold out)
   * @returns Array of active offers
   */
  async getActive(): Promise<Offer[]> {
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      `SELECT * FROM offers
       WHERE status = 'active'
         AND end_date > NOW()
         AND (quantity_remaining IS NULL OR quantity_remaining > 0)
       ORDER BY created_at DESC`
    );

    return result.rows.map(this.mapRowToOffer);
  }

  /**
   * Get offers expiring within specified days
   * @param days Number of days
   * @returns Array of expiring offers
   */
  async getExpiring(days: number): Promise<Offer[]> {
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      `SELECT * FROM offers
       WHERE status = 'active'
         AND end_date > NOW()
         AND end_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY end_date ASC`,
      [days]
    );

    return result.rows.map(this.mapRowToOffer);
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new offer
   * @param listingId Listing ID
   * @param data Offer data
   * @returns Created offer
   */
  async create(listingId: number, data: CreateOfferInput): Promise<Offer> {
    // Validate listing exists
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Check tier limit
    const tierCheck = await this.checkOfferLimit(listingId);
    if (!tierCheck.allowed) {
      throw new TierLimitExceededError(tierCheck.tier ?? 'unknown', tierCheck.limit);
    }

    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (startDate >= endDate) {
      throw new InvalidOfferDatesError(startDate, endDate);
    }

    // Reject past dates
    const now = new Date();
    if (startDate < now) {
      throw BizError.badRequest(
        'Start date cannot be in the past',
        { startDate }
      );
    }

    // Validate pricing (either discount OR sale price, not both)
    if (data.discount_percentage && data.sale_price) {
      throw new InvalidPricingError(
        'Cannot specify both discount_percentage and sale_price'
      );
    }

    // Generate slug if not provided
    const slug = data.slug || (await this.generateSlug(data.title));

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError(slug);
    }

    // Insert offer
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      `INSERT INTO offers (
        listing_id, title, slug, description, offer_type,
        original_price, sale_price, discount_percentage,
        image, thumbnail,
        start_date, end_date, quantity_total, quantity_remaining, max_per_user,
        redemption_code, redemption_instructions, terms_conditions,
        status, is_featured, is_mock
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )`,
      [
        listingId,
        data.title,
        slug,
        data.description || null,
        data.offer_type,
        data.original_price || null,
        data.sale_price || null,
        data.discount_percentage || null,
        data.image || null,
        data.thumbnail || null,
        startDate,
        endDate,
        data.quantity_total || null,
        data.quantity_remaining || data.quantity_total || null,
        data.max_per_user || 1,
        data.redemption_code || null,
        data.redemption_instructions || null,
        data.terms_conditions || null,
        'draft', // Default status
        data.is_featured ? 1 : 0,
        data.is_mock ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create offer',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create offer',
        new Error('Failed to retrieve created offer')
      );
    }

    return created;
  }

  /**
   * Update an offer
   * @param id Offer ID
   * @param data Update data
   * @returns Updated offer
   */
  async update(id: number, data: UpdateOfferInput): Promise<Offer> {
    // Check offer exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new OfferNotFoundError(id);
    }

    // Validate dates if being updated
    if (data.start_date || data.end_date) {
      const startDate = data.start_date
        ? new Date(data.start_date)
        : existing.start_date;
      const endDate = data.end_date ? new Date(data.end_date) : existing.end_date;

      if (startDate >= endDate) {
        throw new InvalidOfferDatesError(startDate, endDate);
      }
    }

    // Validate pricing if being updated
    if (
      (data.discount_percentage !== undefined || existing.discount_percentage) &&
      (data.sale_price !== undefined || existing.sale_price)
    ) {
      const hasDiscount =
        data.discount_percentage !== undefined
          ? data.discount_percentage !== null
          : existing.discount_percentage !== null;
      const hasSalePrice =
        data.sale_price !== undefined
          ? data.sale_price !== null
          : existing.sale_price !== null;

      if (hasDiscount && hasSalePrice) {
        throw new InvalidPricingError(
          'Cannot have both discount_percentage and sale_price'
        );
      }
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateSlugError(data.slug);
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.offer_type !== undefined) {
      updates.push('offer_type = ?');
      params.push(data.offer_type);
    }

    if (data.original_price !== undefined) {
      updates.push('original_price = ?');
      params.push(data.original_price);
    }

    if (data.sale_price !== undefined) {
      updates.push('sale_price = ?');
      params.push(data.sale_price);
    }

    if (data.discount_percentage !== undefined) {
      updates.push('discount_percentage = ?');
      params.push(data.discount_percentage);
    }

    if (data.image !== undefined) {
      updates.push('image = ?');
      params.push(data.image);
    }

    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }

    if (data.start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(new Date(data.start_date));
    }

    if (data.end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(new Date(data.end_date));
    }

    if (data.quantity_total !== undefined) {
      updates.push('quantity_total = ?');
      params.push(data.quantity_total);
    }

    if (data.quantity_remaining !== undefined) {
      updates.push('quantity_remaining = ?');
      params.push(data.quantity_remaining);
    }

    if (data.max_per_user !== undefined) {
      updates.push('max_per_user = ?');
      params.push(data.max_per_user);
    }

    if (data.redemption_code !== undefined) {
      updates.push('redemption_code = ?');
      params.push(data.redemption_code);
    }

    if (data.redemption_instructions !== undefined) {
      updates.push('redemption_instructions = ?');
      params.push(data.redemption_instructions);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    params.push(id);

    await this.db.query(
      `UPDATE offers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update offer',
        new Error('Failed to retrieve updated offer')
      );
    }

    return updated;
  }

  /**
   * Delete an offer
   * @param id Offer ID
   */
  async delete(id: number): Promise<void> {
    const offer = await this.getById(id);
    if (!offer) {
      throw new OfferNotFoundError(id);
    }

    await this.db.query('DELETE FROM offers WHERE id = ?', [id]);
  }

  /**
   * Pause an offer
   * @param id Offer ID
   * @returns Updated offer
   */
  async pause(id: number): Promise<Offer> {
    return this.update(id, { status: OfferStatus.PAUSED });
  }

  /**
   * Resume a paused offer
   * @param id Offer ID
   * @returns Updated offer
   */
  async resume(id: number): Promise<Offer> {
    const offer = await this.getById(id);
    if (!offer) {
      throw new OfferNotFoundError(id);
    }

    // Check if expired
    if (new Date() > offer.end_date) {
      throw new OfferExpiredError(id, offer.end_date);
    }

    // Check if sold out
    if (
      offer.quantity_remaining !== null &&
      offer.quantity_remaining <= 0
    ) {
      throw new OfferSoldOutError(id);
    }

    return this.update(id, { status: OfferStatus.ACTIVE });
  }

  // ==========================================================================
  // REDEMPTION Operations
  // ==========================================================================

  /**
   * Redeem an offer for a user
   * @param offerId Offer ID
   * @param userId User ID
   * @param code Optional redemption code
   * @returns Redemption record
   */
  async redeem(
    offerId: number,
    userId: number,
    code?: string
  ): Promise<Redemption> {
    // Check if user can redeem
    const check = await this.canRedeem(offerId, userId);
    if (!check.canRedeem) {
      if (check.reason?.includes('expired')) {
        const offer = await this.getById(offerId);
        throw new OfferExpiredError(offerId, offer!.end_date);
      } else if (check.reason?.includes('sold out')) {
        throw new OfferSoldOutError(offerId);
      } else if (check.reason?.includes('limit')) {
        const offer = await this.getById(offerId);
        throw new RedemptionLimitExceededError(offerId, offer!.max_per_user);
      } else {
        throw BizError.badRequest(check.reason || 'Cannot redeem offer', {
          offerId,
          userId
        });
      }
    }

    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    // Validate redemption code if required
    if (offer.redemption_code && code !== offer.redemption_code) {
      throw BizError.badRequest('Invalid redemption code', {
        offerId,
        providedCode: code
      });
    }

    // Use transaction to ensure consistency
    return this.db.transaction(async (client) => {
      // Insert redemption record
      const result = await client.query(
        `INSERT INTO offer_redemptions (offer_id, user_id, redemption_code)
         VALUES (?, ?, ?)`,
        [offerId, userId, code || null]
      );

      if (!result.insertId) {
        throw BizError.databaseError(
          'redeem offer',
          new Error('No insert ID returned')
        );
      }

      // Update offer statistics
      const updates: string[] = ['redemption_count = redemption_count + 1'];
      if (offer.quantity_remaining !== null) {
        updates.push('quantity_remaining = quantity_remaining - 1');
      }

      await client.query(
        `UPDATE offers SET ${updates.join(', ')} WHERE id = ?`,
        [offerId]
      );

      // Check if sold out
      if (offer.quantity_remaining !== null && offer.quantity_remaining - 1 <= 0) {
        await client.query(
          `UPDATE offers SET status = 'sold_out' WHERE id = ?`,
          [offerId]
        );
      }

      // Get redemption record
      const redemptionResult = await client.query(
        'SELECT * FROM offer_redemptions WHERE id = ?',
        [result.insertId]
      );

      const row = redemptionResult.rows[0] as OfferRedemptionRow | undefined;
      if (!row) {
        throw BizError.databaseError(
          'redeem offer',
          new Error('Failed to retrieve redemption record')
        );
      }

      return this.mapRowToRedemption(row);
    });
  }

  /**
   * Check if user can redeem an offer
   * @param offerId Offer ID
   * @param userId User ID
   * @returns Redemption check result
   */
  async canRedeem(offerId: number, userId: number): Promise<RedemptionCheck> {
    const offer = await this.getById(offerId);
    if (!offer) {
      return {
        canRedeem: false,
        reason: 'Offer not found',
        remainingRedemptions: 0,
        userRedemptionCount: 0
      };
    }

    // Check if offer is active
    if (offer.status !== OfferStatus.ACTIVE) {
      return {
        canRedeem: false,
        reason: `Offer is ${offer.status}`,
        remainingRedemptions: 0,
        userRedemptionCount: 0
      };
    }

    // Check if expired
    if (new Date() > offer.end_date) {
      return {
        canRedeem: false,
        reason: 'Offer has expired',
        remainingRedemptions: 0,
        userRedemptionCount: 0
      };
    }

    // Check if sold out
    if (
      offer.quantity_remaining !== null &&
      offer.quantity_remaining <= 0
    ) {
      return {
        canRedeem: false,
        reason: 'Offer is sold out',
        remainingRedemptions: 0,
        userRedemptionCount: 0
      };
    }

    // Check user redemption count
    const userRedemptionCount = await this.getRedemptionCount(offerId, userId);
    if (userRedemptionCount >= offer.max_per_user) {
      return {
        canRedeem: false,
        reason: `User has reached redemption limit (${offer.max_per_user})`,
        remainingRedemptions: 0,
        userRedemptionCount
      };
    }

    return {
      canRedeem: true,
      reason: null,
      remainingRedemptions: offer.max_per_user - userRedemptionCount,
      userRedemptionCount
    };
  }

  /**
   * Get total redemption count for an offer
   * @param offerId Offer ID
   * @param userId Optional user ID to get user-specific count
   * @returns Redemption count
   */
  async getRedemptionCount(offerId: number, userId?: number): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM offer_redemptions WHERE offer_id = ?';
    const params: unknown[] = [offerId];

    if (userId !== undefined) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    const result: DbResult<{count: bigint | number}> = await this.db.query<{count: bigint | number}>(sql, params);
    return bigIntToNumber(result.rows[0]?.count);
  }

  /**
   * Get all redemptions for a user
   * @param userId User ID
   * @returns Array of redemptions
   */
  async getUserRedemptions(userId: number): Promise<Redemption[]> {
    const result: DbResult<OfferRedemptionRow> = await this.db.query<OfferRedemptionRow>(
      'SELECT * FROM offer_redemptions WHERE user_id = ? ORDER BY redeemed_at DESC',
      [userId]
    );

    return result.rows.map(this.mapRowToRedemption);
  }

  // ==========================================================================
  // TIER ENFORCEMENT Operations
  // ==========================================================================

  /**
   * Check if listing can add another offer based on tier limits
   * @param listingId Listing ID
   * @returns Tier check result
   */
  async checkOfferLimit(listingId: number): Promise<TierCheckResult> {
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Count current offers for listing
    const result: DbResult<{count: bigint | number}> = await this.db.query<{count: bigint | number}>(
      'SELECT COUNT(*) as count FROM offers WHERE listing_id = ?',
      [listingId]
    );
    const current = bigIntToNumber(result.rows[0]?.count);

    // Get tier limits from ListingService
    const tierLimits = {
      essentials: 4,
      plus: 10,
      preferred: 50,
      premium: 50
    };

    const limit = tierLimits[listing.tier];

    return {
      allowed: current < limit,
      current,
      limit,
      tier: listing.tier
    };
  }

  // ==========================================================================
  // UTILITY Operations
  // ==========================================================================

  /**
   * Generate URL-safe slug from title
   * @param title Offer title
   * @returns URL-safe slug
   */
  async generateSlug(title: string): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    let slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Ensure uniqueness
    let counter = 1;
    let uniqueSlug = slug;

    while (true) {
      const existing = await this.getBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      // Safety check to prevent infinite loop
      if (counter > 1000) {
        throw BizError.internalServerError(
          'OfferService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Expire all expired offers (cron job)
   * @returns Number of offers expired
   */
  async expireExpiredOffers(): Promise<number> {
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      `UPDATE offers
       SET status = 'expired'
       WHERE status = 'active'
         AND end_date <= NOW()`
    );

    return result.rowCount || 0;
  }

  /**
   * Update offer inventory (quantity_remaining)
   * @param offerId Offer ID
   * @param delta Change in quantity (positive or negative)
   */
  async updateInventory(offerId: number, delta: number): Promise<void> {
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    if (offer.quantity_remaining === null) {
      throw BizError.badRequest(
        'Cannot update inventory for unlimited offers',
        { offerId }
      );
    }

    const newQuantity = offer.quantity_remaining + delta;
    if (newQuantity < 0) {
      throw BizError.badRequest('Inventory cannot be negative', {
        offerId,
        currentQuantity: offer.quantity_remaining,
        delta
      });
    }

    await this.db.query(
      'UPDATE offers SET quantity_remaining = ? WHERE id = ?',
      [newQuantity, offerId]
    );

    // Mark sold out if quantity reaches 0
    if (newQuantity === 0) {
      await this.db.query(
        `UPDATE offers SET status = 'sold_out' WHERE id = ?`,
        [offerId]
      );
    }
  }

  /**
   * Increment offer view count
   * @param id Offer ID
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE offers SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // PHASE 1: CLAIM OPERATIONS
  // ==========================================================================

  /**
   * Claim an offer for a user
   * Phase 1 requirement - Section 5.5 Claim Flow
   * @param offerId Offer ID
   * @param userId User ID
   * @returns Claim result with promo code
   */
  async claimOffer(offerId: number, userId: number): Promise<import('@features/offers/types').ClaimResult> {
    // Check eligibility first
    const eligibility = await this.checkClaimEligibility(offerId, userId);
    if (!eligibility.canClaim) {
      throw BizError.badRequest(eligibility.reason || 'Cannot claim offer', {
        offerId,
        userId,
        reason: eligibility.reason
      });
    }

    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    // Generate promo code
    const promoCode = await this.generatePromoCode(offerId, offer.promo_code_mode as 'universal' | 'unique');

    // Use transaction for claim creation
    const claimResult = await this.db.transaction(async (client) => {
      // Insert claim record
      const result = await client.query(
        `INSERT INTO offer_claims (offer_id, user_id, promo_code, status)
         VALUES (?, ?, ?, 'claimed')`,
        [offerId, userId, promoCode]
      );

      if (!result.insertId) {
        throw BizError.databaseError(
          'claim offer',
          new Error('No insert ID returned')
        );
      }

      // Update offer statistics
      const updates: string[] = [];
      if (offer.quantity_remaining !== null) {
        updates.push('quantity_remaining = quantity_remaining - 1');
      }

      if (updates.length > 0) {
        await client.query(
          `UPDATE offers SET ${updates.join(', ')} WHERE id = ?`,
          [offerId]
        );
      }

      return {
        success: true,
        claimId: result.insertId,
        promoCode,
        expiresAt: offer.end_date,
        redemptionInstructions: offer.redemption_instructions
      };
    });

    // Track analytics event OUTSIDE transaction (non-critical, uses separate connection)
    // Wrapped in try-catch to prevent analytics failure from affecting claim result
    try {
      await this.trackAnalytics(offerId, 'claim', userId, 'direct');
    } catch (analyticsError) {
      // Log but don't fail the claim operation
      console.warn('[OfferService] Analytics tracking failed (non-critical):', analyticsError);
    }

    return claimResult;
  }

  /**
   * Get all claims for a user
   * Phase 1 requirement - Section 5.6 In-App Code Access
   * @param userId User ID
   * @param status Optional status filter
   * @returns Array of claims with offer data
   */
  async getUserClaims(userId: number, status?: import('@features/offers/types').ClaimStatus): Promise<import('@features/offers/types').Claim[]> {
    let sql = `
      SELECT
        oc.*,
        o.title as offer_title,
        o.image as offer_image,
        o.offer_type,
        o.end_date,
        l.name as business_name
      FROM offer_claims oc
      JOIN offers o ON oc.offer_id = o.id
      JOIN listings l ON o.listing_id = l.id
      WHERE oc.user_id = ?
    `;
    const params: unknown[] = [userId];

    if (status) {
      sql += ' AND oc.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY oc.claimed_at DESC';

    const result = await this.db.query(sql, params);

    return result.rows.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as number,
        offer_id: r.offer_id as number,
        user_id: r.user_id as number,
        promo_code: r.promo_code as string,
        claimed_at: new Date(r.claimed_at as string),
        redeemed_at: r.redeemed_at ? new Date(r.redeemed_at as string) : null,
        status: r.status as import('@features/offers/types').ClaimStatus,
        redemption_method: r.redemption_method as 'qr_scan' | 'manual_entry' | 'in_app' | 'self_reported' | null,
        offer_title: r.offer_title as string,
        offer_image: r.offer_image as string | null,
        offer_type: r.offer_type as string,
        business_name: r.business_name as string,
        end_date: new Date(r.end_date as string)
      };
    });
  }

  /**
   * Generate promo code for an offer
   * Phase 1 requirement - Section 3.2 Promo Code Generation
   * @param offerId Offer ID
   * @param mode Universal or unique code generation
   * @returns Generated promo code
   */
  async generatePromoCode(offerId: number, mode: 'universal' | 'unique'): Promise<string> {
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    if (mode === 'universal') {
      // Return universal code if set, otherwise generate one
      if (offer.universal_code) {
        return offer.universal_code;
      }
      // Generate and save universal code
      const code = this.generateRandomCode('UNI');
      await this.db.query(
        'UPDATE offers SET universal_code = ? WHERE id = ?',
        [code, offerId]
      );
      return code;
    } else {
      // Generate unique code per claim
      return this.generateRandomCode('BIZ');
    }
  }

  /**
   * Get offer by slug with listing information
   * Phase 1 requirement - Section 5 Detail Page
   * @param slug Offer slug
   * @returns Offer with listing data or null
   */
  async getOfferWithListing(slug: string): Promise<import('@features/offers/types').OfferWithListing | null> {
    const result = await this.db.query(
      `SELECT
        o.*,
        l.name as listing_name,
        l.logo_url as listing_logo,
        l.slug as listing_slug,
        l.city,
        l.state,
        l.latitude,
        l.longitude
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      WHERE o.slug = ?`,
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;

    return {
      id: row.id as number,
      listing_id: row.listing_id as number,
      title: row.title as string,
      slug: row.slug as string,
      description: row.description as string | null,
      offer_type: row.offer_type as string,
      original_price: row.original_price as number | null,
      sale_price: row.sale_price as number | null,
      discount_percentage: row.discount_percentage as number | null,
      image: row.image as string | null,
      thumbnail: row.thumbnail as string | null,
      start_date: new Date(row.start_date as string),
      end_date: new Date(row.end_date as string),
      quantity_total: row.quantity_total as number | null,
      quantity_remaining: row.quantity_remaining as number | null,
      max_per_user: row.max_per_user as number,
      redemption_code: row.redemption_code as string | null,
      redemption_instructions: row.redemption_instructions as string | null,
      redemption_count: row.redemption_count as number,
      promo_code_mode: row.promo_code_mode as 'universal' | 'unique',
      universal_code: row.universal_code as string | null,
      terms_conditions: row.terms_conditions as string | null,
      min_purchase_amount: row.min_purchase_amount as number | null,
      applicable_products: safeJsonParse(row.applicable_products as string | null),
      status: row.status as 'draft' | 'active' | 'paused' | 'expired' | 'sold_out',
      is_featured: Boolean(row.is_featured),
      is_mock: Boolean(row.is_mock),
      view_count: row.view_count as number,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
      listing_name: row.listing_name as string,
      listing_logo: row.listing_logo as string | null,
      listing_slug: row.listing_slug as string,
      city: row.city as string | null,
      state: row.state as string | null,
      latitude: row.latitude as number | null,
      longitude: row.longitude as number | null
    };
  }

  /**
   * Track analytics event for an offer
   * Phase 1 requirement - Analytics preparation
   * @param offerId Offer ID
   * @param eventType Type of event
   * @param userId Optional user ID
   * @param source Optional event source
   */
  async trackAnalytics(
    offerId: number,
    eventType: import('@features/offers/types').AnalyticsEventType,
    userId?: number,
    source?: import('@features/offers/types').AnalyticsSource
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO offer_analytics (offer_id, event_type, user_id, source)
       VALUES (?, ?, ?, ?)`,
      [offerId, eventType, userId || null, source || 'direct']
    );
  }

  /**
   * Check if user is eligible to claim an offer
   * Phase 1 requirement - Section 5.5 Claim Eligibility
   * @param offerId Offer ID
   * @param userId User ID
   * @returns Eligibility check result
   */
  async checkClaimEligibility(offerId: number, userId: number): Promise<import('@features/offers/types').ClaimEligibility> {
    const offer = await this.getById(offerId);
    if (!offer) {
      return {
        canClaim: false,
        reason: 'Offer not found',
        remainingClaims: 0,
        userClaimCount: 0
      };
    }

    // Check if offer is active
    if (offer.status !== OfferStatus.ACTIVE) {
      return {
        canClaim: false,
        reason: `Offer is ${offer.status}`,
        remainingClaims: 0,
        userClaimCount: 0
      };
    }

    // Check if expired
    if (new Date() > offer.end_date) {
      return {
        canClaim: false,
        reason: 'Offer has expired',
        remainingClaims: 0,
        userClaimCount: 0
      };
    }

    // Check if sold out
    if (offer.quantity_remaining !== null && offer.quantity_remaining <= 0) {
      return {
        canClaim: false,
        reason: 'Offer is sold out',
        remainingClaims: 0,
        userClaimCount: 0
      };
    }

    // Check if user already claimed
    const claimResult: DbResult<{count: bigint | number}> = await this.db.query<{count: bigint | number}>(
      'SELECT COUNT(*) as count FROM offer_claims WHERE offer_id = ? AND user_id = ?',
      [offerId, userId]
    );
    const userClaimCount = bigIntToNumber(claimResult.rows[0]?.count);

    if (userClaimCount >= offer.max_per_user) {
      return {
        canClaim: false,
        reason: `You have already claimed this offer (limit: ${offer.max_per_user})`,
        remainingClaims: 0,
        userClaimCount
      };
    }

    return {
      canClaim: true,
      reason: null,
      remainingClaims: offer.max_per_user - userClaimCount,
      userClaimCount
    };
  }

  /**
   * Generate random alphanumeric promo code
   * @param prefix Code prefix (UNI, BIZ, etc.)
   * @returns Random code
   */
  private generateRandomCode(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix + '-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ==========================================================================
  // PHASE 2: FOLLOW MANAGEMENT OPERATIONS
  // ==========================================================================

  /**
   * Follow a business or category for offer notifications
   * @param userId User ID
   * @param followType Type of follow
   * @param targetId Listing ID or category ID (null for 'all_offers')
   * @param frequency Notification frequency
   * @returns Follow record
   */
  async followForOffers(
    userId: number,
    followType: import('@features/offers/types').FollowType,
    targetId: number | null,
    frequency: import('@features/offers/types').NotificationFrequency
  ): Promise<import('@features/offers/types').OfferFollow> {
    // Validate follow type matches target_id requirement
    if (followType === 'all_offers' && targetId !== null) {
      throw BizError.badRequest('all_offers follow type cannot have target_id', { followType, targetId });
    }
    if ((followType === 'business' || followType === 'category') && targetId === null) {
      throw BizError.badRequest(`${followType} follow type requires target_id`, { followType });
    }

    // Insert follow record
    const result = await this.db.query(
      `INSERT INTO offer_follows (user_id, follow_type, target_id, notification_frequency)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE notification_frequency = VALUES(notification_frequency)`,
      [userId, followType, targetId, frequency]
    );

    if (!result.insertId) {
      // Record already exists, fetch it
      const existing = await this.db.query<{
        id: number;
        user_id: number;
        follow_type: import('@features/offers/types').FollowType;
        target_id: number | null;
        notification_frequency: import('@features/offers/types').NotificationFrequency;
        created_at: string;
      }>(
        'SELECT * FROM offer_follows WHERE user_id = ? AND follow_type = ? AND target_id <=> ?',
        [userId, followType, targetId]
      );

      if (existing.rows.length === 0) {
        throw BizError.databaseError('follow for offers', new Error('Failed to retrieve follow record'));
      }

      const row = existing.rows[0];
      if (!row) throw BizError.databaseError('follow for offers', new Error('No row returned'));

      return {
        id: row.id,
        user_id: row.user_id,
        follow_type: row.follow_type,
        target_id: row.target_id,
        notification_frequency: row.notification_frequency,
        created_at: new Date(row.created_at)
      };
    }

    // Fetch created record
    const created = await this.db.query<{
      id: number;
      user_id: number;
      follow_type: import('@features/offers/types').FollowType;
      target_id: number | null;
      notification_frequency: import('@features/offers/types').NotificationFrequency;
      created_at: string;
    }>(
      'SELECT * FROM offer_follows WHERE id = ?',
      [result.insertId]
    );

    if (created.rows.length === 0) {
      throw BizError.databaseError('follow for offers', new Error('Failed to retrieve created follow record'));
    }

    const row = created.rows[0];
    if (!row) throw BizError.databaseError('follow for offers', new Error('No row returned'));

    return {
      id: row.id,
      user_id: row.user_id,
      follow_type: row.follow_type,
      target_id: row.target_id,
      notification_frequency: row.notification_frequency,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Unfollow a business or category for offer notifications
   * @param userId User ID
   * @param followType Type of follow
   * @param targetId Listing ID or category ID (null for 'all_offers')
   */
  async unfollowForOffers(
    userId: number,
    followType: import('@features/offers/types').FollowType,
    targetId: number | null
  ): Promise<void> {
    await this.db.query(
      'DELETE FROM offer_follows WHERE user_id = ? AND follow_type = ? AND target_id <=> ?',
      [userId, followType, targetId]
    );
  }

  /**
   * Get all offer follows for a user
   * @param userId User ID
   * @returns Array of follow records
   */
  async getOfferFollows(userId: number): Promise<import('@features/offers/types').OfferFollow[]> {
    const result = await this.db.query<{
      id: number;
      user_id: number;
      follow_type: import('@features/offers/types').FollowType;
      target_id: number | null;
      notification_frequency: import('@features/offers/types').NotificationFrequency;
      created_at: string;
      target_name: string | null;
    }>(
      `SELECT
        of.*,
        CASE
          WHEN of.follow_type = 'business' THEN l.name
          WHEN of.follow_type = 'category' THEN c.name
          ELSE NULL
        END as target_name
      FROM offer_follows of
      LEFT JOIN listings l ON of.follow_type = 'business' AND of.target_id = l.id
      LEFT JOIN categories c ON of.follow_type = 'category' AND of.target_id = c.id
      WHERE of.user_id = ?
      ORDER BY of.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      follow_type: row.follow_type,
      target_id: row.target_id,
      notification_frequency: row.notification_frequency,
      created_at: new Date(row.created_at),
      target_name: row.target_name || undefined
    }));
  }

  /**
   * Check if user follows a specific target
   * @param userId User ID
   * @param followType Type of follow
   * @param targetId Listing ID or category ID (null for 'all_offers')
   * @returns Follow record or null
   */
  async getFollowStatus(
    userId: number,
    followType: import('@features/offers/types').FollowType,
    targetId: number | null
  ): Promise<import('@features/offers/types').OfferFollow | null> {
    const result = await this.db.query<{
      id: number;
      user_id: number;
      follow_type: import('@features/offers/types').FollowType;
      target_id: number | null;
      notification_frequency: import('@features/offers/types').NotificationFrequency;
      created_at: string;
    }>(
      'SELECT * FROM offer_follows WHERE user_id = ? AND follow_type = ? AND target_id <=> ?',
      [userId, followType, targetId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      user_id: row.user_id,
      follow_type: row.follow_type,
      target_id: row.target_id,
      notification_frequency: row.notification_frequency,
      created_at: new Date(row.created_at)
    };
  }

  // ==========================================================================
  // PHASE 2: SHARE PERSISTENCE OPERATIONS
  // ==========================================================================

  /**
   * Record a share action
   * @param offerId Offer ID
   * @param userId User ID
   * @param shareType Business owner or consumer
   * @param platform Share platform
   * @returns Share record
   */
  async recordShare(
    offerId: number,
    userId: number,
    shareType: import('@features/offers/types').ShareType,
    platform: import('@features/offers/types').SharePlatform
  ): Promise<import('@features/offers/types').OfferShare> {
    // Verify offer exists
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    // Build share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
    const shareUrl = `${baseUrl}/offers/${offer.slug}?utm_source=${platform}&utm_medium=social&utm_campaign=offer_share`;

    // Generate short URL (TD-P3-005)
    let shortUrl: string | null = null;
    try {
      const { createOfferShareShortUrl } = await import('@core/utils/url-shortener');
      shortUrl = await createOfferShareShortUrl(this.db, offerId, offer.slug, offer.end_date);
    } catch (err) {
      // Log but don't fail if short URL generation fails
      console.error('[OfferService] Short URL generation failed:', err);
    }

    // Insert share record
    const result = await this.db.query(
      `INSERT INTO offer_shares (offer_id, user_id, share_type, platform, share_url, short_url, clicks)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [offerId, userId, shareType, platform, shareUrl, shortUrl]
    );

    if (!result.insertId) {
      throw BizError.databaseError('record share', new Error('No insert ID returned'));
    }

    // Fetch created record
    const created = await this.db.query<{
      id: number;
      offer_id: number;
      user_id: number;
      share_type: import('@features/offers/types').ShareType;
      platform: import('@features/offers/types').SharePlatform;
      share_url: string;
      short_url: string | null;
      clicks: number;
      created_at: string;
    }>(
      'SELECT * FROM offer_shares WHERE id = ?',
      [result.insertId]
    );

    if (created.rows.length === 0) {
      throw BizError.databaseError('record share', new Error('Failed to retrieve created share record'));
    }

    const row = created.rows[0];
    if (!row) throw BizError.databaseError('record share', new Error('No row returned'));

    return {
      id: row.id,
      offer_id: row.offer_id,
      user_id: row.user_id,
      share_type: row.share_type,
      platform: row.platform,
      share_url: row.share_url,
      short_url: row.short_url,
      clicks: row.clicks,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Track a click on a share link
   * @param shareId Share ID
   * @param metadata Click metadata
   */
  async trackShareClick(
    shareId: number,
    metadata: import('@features/offers/types').ShareClickMetadata
  ): Promise<void> {
    // Get share record to get offer_id
    const shareResult = await this.db.query<{ offer_id: number }>(
      'SELECT offer_id FROM offer_shares WHERE id = ?',
      [shareId]
    );

    if (shareResult.rows.length === 0) {
      throw BizError.notFound('Share', shareId);
    }

    const offerId = shareResult.rows[0]?.offer_id;
    if (!offerId) {
      throw BizError.databaseError('track share click', new Error('No offer_id found'));
    }

    // Use transaction for consistency
    await this.db.transaction(async (client) => {
      // Insert click record
      await client.query(
        `INSERT INTO offer_share_clicks (offer_share_id, offer_id, referrer_url, user_agent, ip_hash, resulted_in_signup, resulted_in_claim)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          shareId,
          offerId,
          metadata.referrer_url || null,
          metadata.user_agent || null,
          metadata.ip_hash || null,
          metadata.resulted_in_signup ? 1 : 0,
          metadata.resulted_in_claim ? 1 : 0
        ]
      );

      // Increment clicks count
      await client.query(
        'UPDATE offer_shares SET clicks = clicks + 1 WHERE id = ?',
        [shareId]
      );
    });
  }

  /**
   * Get share analytics for an offer
   * @param offerId Offer ID
   * @returns Share analytics
   */
  async getShareAnalytics(offerId: number): Promise<import('@features/offers/types').ShareAnalytics> {
    // Get total shares and clicks
    const totalsResult = await this.db.query<{
      total_shares: bigint | number;
      total_clicks: bigint | number;
    }>(
      `SELECT
        COUNT(*) as total_shares,
        COALESCE(SUM(clicks), 0) as total_clicks
      FROM offer_shares
      WHERE offer_id = ?`,
      [offerId]
    );

    const totalShares = bigIntToNumber(totalsResult.rows[0]?.total_shares);
    const totalClicks = bigIntToNumber(totalsResult.rows[0]?.total_clicks);

    // Get shares by platform
    const platformResult = await this.db.query<{
      platform: import('@features/offers/types').SharePlatform;
      share_count: bigint | number;
      click_count: bigint | number;
    }>(
      `SELECT
        platform,
        COUNT(*) as share_count,
        COALESCE(SUM(clicks), 0) as click_count
      FROM offer_shares
      WHERE offer_id = ?
      GROUP BY platform`,
      [offerId]
    );

    const sharesByPlatform: Record<string, number> = {};
    const clicksByPlatform: Record<string, number> = {};
    let topPlatform: import('@features/offers/types').SharePlatform | null = null;
    let maxClicks = 0;

    platformResult.rows.forEach(row => {
      const platform = row.platform;
      const shares = bigIntToNumber(row.share_count);
      const clicks = bigIntToNumber(row.click_count);

      sharesByPlatform[platform] = shares;
      clicksByPlatform[platform] = clicks;

      if (clicks > maxClicks) {
        maxClicks = clicks;
        topPlatform = platform;
      }
    });

    // Get conversions
    const conversionsResult = await this.db.query<{
      signups: bigint | number;
      claims: bigint | number;
    }>(
      `SELECT
        COALESCE(SUM(resulted_in_signup), 0) as signups,
        COALESCE(SUM(resulted_in_claim), 0) as claims
      FROM offer_share_clicks
      WHERE offer_id = ?`,
      [offerId]
    );

    const signups = bigIntToNumber(conversionsResult.rows[0]?.signups);
    const claims = bigIntToNumber(conversionsResult.rows[0]?.claims);

    return {
      offer_id: offerId,
      total_shares: totalShares,
      total_clicks: totalClicks,
      click_through_rate: totalShares > 0 ? (totalClicks / totalShares) * 100 : 0,
      shares_by_platform: sharesByPlatform as Record<import('@features/offers/types').SharePlatform, number>,
      clicks_by_platform: clicksByPlatform as Record<import('@features/offers/types').SharePlatform, number>,
      conversions: {
        signups,
        claims
      },
      top_platform: topPlatform
    };
  }

  /**
   * Get business-level share performance (all offers)
   * @param listingId Listing ID
   * @returns Business share performance
   */
  async getBusinessSharePerformance(listingId: number): Promise<import('@features/offers/types').BusinessSharePerformance> {
    // Get total shares and clicks for all offers
    const totalsResult = await this.db.query<{
      total_shares: bigint | number;
      total_clicks: bigint | number;
    }>(
      `SELECT
        COUNT(*) as total_shares,
        COALESCE(SUM(os.clicks), 0) as total_clicks
      FROM offer_shares os
      JOIN offers o ON os.offer_id = o.id
      WHERE o.listing_id = ?`,
      [listingId]
    );

    const totalShares = bigIntToNumber(totalsResult.rows[0]?.total_shares);
    const totalClicks = bigIntToNumber(totalsResult.rows[0]?.total_clicks);

    // Get platform breakdown
    const platformResult = await this.db.query<{
      platform: import('@features/offers/types').SharePlatform;
      share_count: bigint | number;
      click_count: bigint | number;
    }>(
      `SELECT
        os.platform,
        COUNT(*) as share_count,
        COALESCE(SUM(os.clicks), 0) as click_count
      FROM offer_shares os
      JOIN offers o ON os.offer_id = o.id
      WHERE o.listing_id = ?
      GROUP BY os.platform`,
      [listingId]
    );

    const platformBreakdown: Record<string, { shares: number; clicks: number }> = {};

    platformResult.rows.forEach(row => {
      platformBreakdown[row.platform] = {
        shares: bigIntToNumber(row.share_count),
        clicks: bigIntToNumber(row.click_count)
      };
    });

    // Get best performing offer
    const bestOfferResult = await this.db.query<{
      id: number;
      title: string;
      total_clicks: bigint | number;
    }>(
      `SELECT
        o.id,
        o.title,
        COALESCE(SUM(os.clicks), 0) as total_clicks
      FROM offers o
      LEFT JOIN offer_shares os ON o.id = os.offer_id
      WHERE o.listing_id = ?
      GROUP BY o.id, o.title
      ORDER BY total_clicks DESC
      LIMIT 1`,
      [listingId]
    );

    let bestPerformingOffer: { id: number; title: string; clicks: number } | null = null;
    if (bestOfferResult.rows.length > 0) {
      const row = bestOfferResult.rows[0];
      if (row) {
        bestPerformingOffer = {
          id: row.id,
          title: row.title,
          clicks: bigIntToNumber(row.total_clicks)
        };
      }
    }

    return {
      listing_id: listingId,
      total_shares: totalShares,
      total_clicks: totalClicks,
      avg_click_through_rate: totalShares > 0 ? (totalClicks / totalShares) * 100 : 0,
      best_performing_offer: bestPerformingOffer,
      platform_breakdown: platformBreakdown as Record<import('@features/offers/types').SharePlatform, { shares: number; clicks: number }>
    };
  }

  // ==========================================================================
  // PHASE 2: NOTIFICATION HELPER OPERATIONS
  // ==========================================================================

  /**
   * Get followers for a listing or category (for broadcast notifications)
   * @param listingId Listing ID
   * @param categoryId Optional category ID
   * @returns Array of user IDs
   */
  async getOfferFollowers(listingId?: number, categoryId?: number): Promise<number[]> {
    let sql = 'SELECT DISTINCT user_id FROM offer_follows WHERE ';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (listingId !== undefined) {
      conditions.push('(follow_type = ? AND target_id = ?)');
      params.push('business', listingId);
    }

    if (categoryId !== undefined) {
      conditions.push('(follow_type = ? AND target_id = ?)');
      params.push('category', categoryId);
    }

    if (conditions.length === 0) {
      // Get all users following 'all_offers'
      sql += 'follow_type = ?';
      params.push('all_offers');
    } else {
      // Include users following 'all_offers' as well
      conditions.push('follow_type = ?');
      params.push('all_offers');
      sql += conditions.join(' OR ');
    }

    const result = await this.db.query<{ user_id: number }>(sql, params);
    return result.rows.map(row => row.user_id);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  // ==========================================================================
  // Phase 3: QR Code & Redemption Verification Methods
  // ==========================================================================

  /**
   * Generate QR code data for a claim
   * @param claimId - Claim ID
   * @returns QR code data
   * @phase Phase 3
   */
  async generateQRCodeData(claimId: number): Promise<import('@features/offers/types').QRCodeData> {
    // Get claim with offer and listing info
    const result = await this.db.query<{
      claim_id: number;
      promo_code: string;
      offer_title: string;
      business_name: string;
      end_date: Date;
    }>(
      `SELECT
        oc.id as claim_id,
        oc.promo_code,
        o.title as offer_title,
        l.name as business_name,
        o.end_date
      FROM offer_claims oc
      JOIN offers o ON oc.offer_id = o.id
      JOIN listings l ON o.listing_id = l.id
      WHERE oc.id = ?`,
      [claimId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('Claim', claimId);
    }

    const claim = result.rows[0];
    if (!claim) {
      throw BizError.notFound('Claim', claimId);
    }

    // Generate verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/offers/verify?code=${claim.promo_code}&claim=${claimId}`;

    return {
      claimId: claim.claim_id,
      promoCode: claim.promo_code,
      verificationUrl,
      expiresAt: new Date(claim.end_date),
      offerTitle: claim.offer_title,
      businessName: claim.business_name
    };
  }

  /**
   * Verify a redemption code
   * @param promoCode - Promo code to verify
   * @param listingId - Listing ID for ownership check
   * @returns Verification result
   * @phase Phase 3
   */
  async verifyRedemptionCode(
    promoCode: string,
    listingId: number
  ): Promise<import('@features/offers/types').RedemptionVerification> {
    // Get claim with offer, user, and listing info
    const result = await this.db.query<{
      claim_id: number;
      claim_status: string;
      redeemed_at: Date | null;
      offer_id: number;
      offer_title: string;
      offer_end_date: Date;
      offer_listing_id: number;
      user_id: number;
      user_name: string;
      user_email: string;
    }>(
      `SELECT
        oc.id as claim_id,
        oc.status as claim_status,
        oc.redeemed_at,
        o.id as offer_id,
        o.title as offer_title,
        o.end_date as offer_end_date,
        o.listing_id as offer_listing_id,
        u.id as user_id,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
        u.email as user_email
      FROM offer_claims oc
      JOIN offers o ON oc.offer_id = o.id
      JOIN users u ON oc.user_id = u.id
      WHERE oc.promo_code = ?`,
      [promoCode]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        claim: null,
        error: 'Invalid promo code',
        offer: null,
        user: null
      };
    }

    const row = result.rows[0];
    if (!row) {
      return {
        valid: false,
        claim: null,
        error: 'Invalid promo code',
        offer: null,
        user: null
      };
    }

    // Check listing ownership
    if (row.offer_listing_id !== listingId) {
      return {
        valid: false,
        claim: null,
        error: 'This code is not valid for your business',
        offer: null,
        user: null
      };
    }

    // Check if already redeemed
    if (row.claim_status === 'redeemed' || row.redeemed_at) {
      return {
        valid: false,
        claim: null,
        error: 'This code has already been redeemed',
        offer: null,
        user: null
      };
    }

    // Check if expired
    if (new Date(row.offer_end_date) < new Date()) {
      return {
        valid: false,
        claim: null,
        error: 'This offer has expired',
        offer: null,
        user: null
      };
    }

    // Valid redemption
    return {
      valid: true,
      claim: {
        id: row.claim_id,
        offer_id: row.offer_id,
        user_id: row.user_id,
        promo_code: promoCode,
        claimed_at: new Date(),
        redeemed_at: null,
        status: row.claim_status as 'claimed' | 'redeemed' | 'expired',
        redemption_method: null,
        offer_title: row.offer_title,
        offer_image: null,
        offer_type: '',
        business_name: '',
        end_date: new Date(row.offer_end_date)
      },
      error: null,
      offer: {
        id: row.offer_id,
        title: row.offer_title,
        expiresAt: new Date(row.offer_end_date)
      },
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      }
    };
  }

  /**
   * Complete a redemption after verification
   * @param claimId - Claim ID
   * @param method - Redemption method used
   * @param verifiedBy - User ID who verified (business owner)
   * @returns Redemption result
   * @phase Phase 3
   */
  async completeRedemption(
    claimId: number,
    method: import('@features/offers/types').RedemptionMethod,
    verifiedBy: number
  ): Promise<import('@features/offers/types').RedemptionResult> {
    // Update claim status
    const result = await this.db.query(
      `UPDATE offer_claims
      SET status = 'redeemed',
          redeemed_at = NOW(),
          redemption_method = ?
      WHERE id = ? AND status = 'claimed'`,
      [method, claimId]
    );

    if (!result.insertId && result.rows.length === 0) {
      throw BizError.badRequest(
        'Cannot complete redemption - claim not found or already redeemed',
        { claimId }
      );
    }

    // Get claim details for analytics and notifications
    const claimData = await this.db.query<{ offer_id: number; user_id: number }>(
      'SELECT offer_id, user_id FROM offer_claims WHERE id = ?',
      [claimId]
    );

    if (claimData.rows.length > 0 && claimData.rows[0]) {
      const { offer_id, user_id } = claimData.rows[0];

      // Track analytics event
      await this.trackAnalytics(
        offer_id,
        'redemption',
        undefined,
        'direct'
      );

      // Dispatch notifications to user and business owner (TD-P3-001)
      try {
        const { OfferNotificationService } = await import('@core/services/notification/OfferNotificationService');
        const { getNotificationService } = await import('@core/services/ServiceRegistry');
        const notificationService = getNotificationService();
        const offerNotificationService = new OfferNotificationService(this.db, notificationService);
        await offerNotificationService.notifyRedemptionComplete(claimId, offer_id, user_id, method);
      } catch (notifyError) {
        // Log but don't fail the redemption if notifications fail
        console.error('[OfferService] Redemption notification failed:', notifyError);
      }
    }

    return {
      success: true,
      claimId,
      redemptionMethod: method,
      redeemedAt: new Date(),
      message: 'Redemption completed successfully'
    };
  }

  /**
   * Self-report redemption (honor system)
   * Allows users to mark their own claim as redeemed
   * @param claimId - Claim ID
   * @param userId - User ID (must own the claim)
   * @returns Redemption result
   * @phase TD-P3-004
   */
  async selfReportRedemption(
    claimId: number,
    userId: number
  ): Promise<import('@features/offers/types').RedemptionResult> {
    // Verify user owns this claim
    const claimResult = await this.db.query<{
      id: number;
      offer_id: number;
      user_id: number;
      status: string;
    }>(
      'SELECT id, offer_id, user_id, status FROM offer_claims WHERE id = ?',
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      throw BizError.notFound('Claim', claimId);
    }

    const claim = claimResult.rows[0];
    if (!claim) {
      throw BizError.notFound('Claim', claimId);
    }

    // Verify ownership
    if (claim.user_id !== userId) {
      throw BizError.forbidden('You do not own this claim');
    }

    // Check status
    if (claim.status === 'redeemed') {
      throw BizError.badRequest('This offer has already been redeemed');
    }

    if (claim.status === 'expired') {
      throw BizError.badRequest('This offer has expired');
    }

    // Complete redemption with self_reported method
    return this.completeRedemption(claimId, 'self_reported', userId);
  }

  // ==========================================================================
  // Phase 3: Analytics & Reporting Methods
  // ==========================================================================

  /**
   * Get analytics funnel for an offer
   * @param offerId - Offer ID
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Funnel analytics
   * @phase Phase 3
   */
  async getAnalyticsFunnel(
    offerId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<import('@features/offers/types').AnalyticsFunnel> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();

    // Get event counts
    const result = await this.db.query<{
      event_type: string;
      count: bigint;
    }>(
      `SELECT event_type, COUNT(*) as count
      FROM offer_analytics
      WHERE offer_id = ?
        AND created_at BETWEEN ? AND ?
      GROUP BY event_type`,
      [offerId, start, end]
    );

    const events = new Map(
      result.rows.map(row => [row.event_type, bigIntToNumber(row.count)])
    );

    const impressions = events.get('impression') || 0;
    const pageViews = events.get('page_view') || 0;
    const engagements = events.get('engagement') || 0;
    const shares = events.get('share') || 0;
    const claims = events.get('claim') || 0;
    const redemptions = events.get('redemption') || 0;

    // Calculate conversion rates
    const impressionToView = impressions > 0 ? (pageViews / impressions) * 100 : 0;
    const viewToClaim = pageViews > 0 ? (claims / pageViews) * 100 : 0;
    const claimToRedemption = claims > 0 ? (redemptions / claims) * 100 : 0;
    const overallConversion = impressions > 0 ? (redemptions / impressions) * 100 : 0;

    // Calculate drop-off rates
    const viewDropOff = impressions > 0 ? ((impressions - pageViews) / impressions) * 100 : 0;
    const claimDropOff = pageViews > 0 ? ((pageViews - claims) / pageViews) * 100 : 0;
    const redemptionDropOff = claims > 0 ? ((claims - redemptions) / claims) * 100 : 0;

    return {
      offerId,
      period: {
        startDate: start,
        endDate: end
      },
      stages: {
        impressions,
        pageViews,
        engagements,
        shares,
        claims,
        redemptions
      },
      conversionRates: {
        impressionToView,
        viewToClaim,
        claimToRedemption,
        overallConversion
      },
      dropOffRates: {
        viewDropOff,
        claimDropOff,
        redemptionDropOff
      }
    };
  }

  /**
   * Get time-series analytics data for charts
   * @param offerId - Offer ID
   * @param granularity - daily, weekly, or monthly
   * @param startDate - Start date for range
   * @param endDate - End date for range
   * @returns Time-series data points
   * @phase TD-P3-003
   */
  async getAnalyticsTimeSeries(
    offerId: number,
    granularity: import('@features/offers/types').TimeSeriesGranularity = 'daily',
    startDate?: Date,
    endDate?: Date
  ): Promise<import('@features/offers/types').TimeSeriesData> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();

    // Build date format based on granularity
    let dateFormat: string;
    let groupBy: string;
    switch (granularity) {
      case 'weekly':
        dateFormat = '%Y-%u'; // Year-Week
        groupBy = 'YEARWEEK(created_at, 1)';
        break;
      case 'monthly':
        dateFormat = '%Y-%m'; // Year-Month
        groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        break;
      default: // daily
        dateFormat = '%Y-%m-%d';
        groupBy = 'DATE(created_at)';
    }

    // Get event counts grouped by date and event type
    const result = await this.db.query<{
      date_bucket: string;
      event_type: string;
      count: bigint;
    }>(
      `SELECT
        DATE_FORMAT(created_at, '${dateFormat}') as date_bucket,
        event_type,
        COUNT(*) as count
      FROM offer_analytics
      WHERE offer_id = ?
        AND created_at BETWEEN ? AND ?
      GROUP BY ${groupBy}, event_type
      ORDER BY date_bucket ASC`,
      [offerId, start, end]
    );

    // Aggregate into data points
    const pointsMap = new Map<string, import('@features/offers/types').TimeSeriesDataPoint>();
    let totalImpressions = 0;
    let totalPageViews = 0;
    let totalClaims = 0;
    let totalRedemptions = 0;

    for (const row of result.rows) {
      const bucket = row.date_bucket;
      if (!pointsMap.has(bucket)) {
        pointsMap.set(bucket, {
          date: bucket,
          impressions: 0,
          pageViews: 0,
          claims: 0,
          redemptions: 0
        });
      }

      const point = pointsMap.get(bucket)!;
      const count = bigIntToNumber(row.count);

      switch (row.event_type) {
        case 'impression':
          point.impressions = count;
          totalImpressions += count;
          break;
        case 'page_view':
          point.pageViews = count;
          totalPageViews += count;
          break;
        case 'claim':
          point.claims = count;
          totalClaims += count;
          break;
        case 'redemption':
          point.redemptions = count;
          totalRedemptions += count;
          break;
      }
    }

    return {
      offerId,
      granularity,
      period: {
        startDate: start,
        endDate: end
      },
      dataPoints: Array.from(pointsMap.values()),
      totals: {
        impressions: totalImpressions,
        pageViews: totalPageViews,
        claims: totalClaims,
        redemptions: totalRedemptions
      }
    };
  }

  /**
   * Get traffic source breakdown for an offer
   * @param offerId - Offer ID
   * @returns Traffic source analytics
   * @phase Phase 3
   */
  async getTrafficSourceBreakdown(
    offerId: number
  ): Promise<import('@features/offers/types').TrafficSourceBreakdown> {
    // Get source breakdown
    const result = await this.db.query<{
      source: string;
      event_type: string;
      count: bigint;
    }>(
      `SELECT source, event_type, COUNT(*) as count
      FROM offer_analytics
      WHERE offer_id = ?
      GROUP BY source, event_type`,
      [offerId]
    );

    // Aggregate by source
    const sourceMap = new Map<
      string,
      {
        impressions: number;
        pageViews: number;
        claims: number;
        redemptions: number;
      }
    >();

    for (const row of result.rows) {
      if (!sourceMap.has(row.source)) {
        sourceMap.set(row.source, {
          impressions: 0,
          pageViews: 0,
          claims: 0,
          redemptions: 0
        });
      }

      const source = sourceMap.get(row.source)!;
      const count = bigIntToNumber(row.count);

      if (row.event_type === 'impression') source.impressions = count;
      else if (row.event_type === 'page_view') source.pageViews = count;
      else if (row.event_type === 'claim') source.claims = count;
      else if (row.event_type === 'redemption') source.redemptions = count;
    }

    // Build sources array with conversion rates
    const sources = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source: source as import('@features/offers/types').AnalyticsSource,
      impressions: data.impressions,
      pageViews: data.pageViews,
      claims: data.claims,
      redemptions: data.redemptions,
      conversionRate:
        data.pageViews > 0 ? (data.claims / data.pageViews) * 100 : 0
    }));

    // Find top source by claims
    const topSource =
      sources.length > 0
        ? sources.reduce((max, s) => (s.claims > max.claims ? s : max)).source
        : null;

    // Get social breakdown from share clicks
    const socialResult = await this.db.query<{
      platform: string;
      clicks: bigint;
    }>(
      `SELECT platform, SUM(clicks) as clicks
      FROM offer_shares
      WHERE offer_id = ?
      GROUP BY platform`,
      [offerId]
    );

    const socialBreakdown = socialResult.rows.map(row => ({
      platform: row.platform as import('@features/offers/types').SharePlatform,
      clicks: bigIntToNumber(row.clicks),
      claims: 0,
      conversionRate: 0
    }));

    return {
      offerId,
      sources,
      topSource,
      socialBreakdown
    };
  }

  /**
   * Get geographic distribution of offer claimers
   * @param offerId - Offer ID
   * @returns Geographic distribution data
   * @phase TD-P3-006
   */
  async getClaimerGeographicData(
    offerId: number
  ): Promise<import('@features/offers/types').GeographicDistribution> {
    // Get location data from users who claimed this offer
    const result = await this.db.query<{
      city: string | null;
      state: string | null;
      country: string;
      claim_count: bigint;
    }>(
      `SELECT
        u.city,
        u.state,
        COALESCE(u.country, 'US') as country,
        COUNT(*) as claim_count
      FROM offer_claims oc
      JOIN users u ON oc.user_id = u.id
      WHERE oc.offer_id = ?
      GROUP BY u.city, u.state, u.country
      ORDER BY claim_count DESC`,
      [offerId]
    );

    // Calculate total claims
    let totalClaims = 0;
    for (const row of result.rows) {
      totalClaims += bigIntToNumber(row.claim_count);
    }

    // Build locations array with percentages
    const locations = result.rows.map(row => {
      const claimCount = bigIntToNumber(row.claim_count);
      return {
        city: row.city,
        state: row.state,
        country: row.country,
        claimCount,
        percentage: totalClaims > 0 ? (claimCount / totalClaims) * 100 : 0
      };
    });

    // Build top locations (human-readable labels)
    const topLocations = locations.slice(0, 10).map(loc => {
      let label = '';
      if (loc.city && loc.state) {
        label = `${loc.city}, ${loc.state}`;
      } else if (loc.state) {
        label = loc.state;
      } else if (loc.city) {
        label = loc.city;
      } else {
        label = loc.country;
      }
      return {
        label,
        count: loc.claimCount
      };
    });

    return {
      offerId,
      locations,
      topLocations
    };
  }

  /**
   * Get audience demographics for offer claimers (anonymized)
   * @param offerId - Offer ID
   * @returns Audience demographics data
   * @phase TD-P3-007
   */
  async getAudienceDemographics(
    offerId: number
  ): Promise<import('@features/offers/types').AudienceDemographics> {
    // Get total claimers
    const totalResult = await this.db.query<{ total: bigint }>(
      'SELECT COUNT(DISTINCT user_id) as total FROM offer_claims WHERE offer_id = ?',
      [offerId]
    );
    const totalClaimers = totalResult.rows[0] ? bigIntToNumber(totalResult.rows[0].total) : 0;

    // Get new vs returning users (users with prior claims on ANY offer before this one)
    const newUsersResult = await this.db.query<{ new_users: bigint }>(
      `SELECT COUNT(DISTINCT oc.user_id) as new_users
       FROM offer_claims oc
       WHERE oc.offer_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM offer_claims oc2
           WHERE oc2.user_id = oc.user_id
             AND oc2.offer_id != ?
             AND oc2.claimed_at < oc.claimed_at
         )`,
      [offerId, offerId]
    );
    const newUsers = newUsersResult.rows[0] ? bigIntToNumber(newUsersResult.rows[0].new_users) : 0;
    const returningUsers = totalClaimers - newUsers;

    // Get claim frequency (how many times each user has claimed offers total)
    const frequencyResult = await this.db.query<{
      user_id: number;
      total_claims: bigint;
    }>(
      `SELECT u.user_id, COUNT(*) as total_claims
       FROM (SELECT DISTINCT user_id FROM offer_claims WHERE offer_id = ?) u
       JOIN offer_claims oc ON u.user_id = oc.user_id
       GROUP BY u.user_id`,
      [offerId]
    );

    let firstTimers = 0;
    let repeatClaimers = 0;
    let totalClaimCount = 0;

    for (const row of frequencyResult.rows) {
      const claims = bigIntToNumber(row.total_claims);
      totalClaimCount += claims;
      if (claims === 1) {
        firstTimers++;
      } else {
        repeatClaimers++;
      }
    }

    const averageClaimsPerUser = totalClaimers > 0 ? totalClaimCount / totalClaimers : 0;

    // Get engagement level (claimed vs redeemed)
    const engagementResult = await this.db.query<{
      status: string;
      count: bigint;
    }>(
      `SELECT status, COUNT(*) as count
       FROM offer_claims
       WHERE offer_id = ?
       GROUP BY status`,
      [offerId]
    );

    let highEngagement = 0; // redeemed
    let mediumEngagement = 0; // claimed but not redeemed
    let lowEngagement = 0; // viewed only (from analytics)

    for (const row of engagementResult.rows) {
      const count = bigIntToNumber(row.count);
      if (row.status === 'redeemed') {
        highEngagement = count;
      } else if (row.status === 'claimed') {
        mediumEngagement = count;
      }
    }

    // Get page views minus claims for "viewed only" estimate
    const viewsResult = await this.db.query<{ views: bigint }>(
      `SELECT COUNT(*) as views FROM offer_analytics
       WHERE offer_id = ? AND event_type = 'page_view'`,
      [offerId]
    );
    const totalViews = viewsResult.rows[0] ? bigIntToNumber(viewsResult.rows[0].views) : 0;
    lowEngagement = Math.max(0, totalViews - (highEngagement + mediumEngagement));

    return {
      offerId,
      totalClaimers,
      newVsReturning: {
        newUsers,
        returningUsers,
        newUserPercentage: totalClaimers > 0 ? (newUsers / totalClaimers) * 100 : 0
      },
      claimFrequency: {
        firstTimers,
        repeatClaimers,
        averageClaimsPerUser
      },
      engagementLevel: {
        highEngagement,
        mediumEngagement,
        lowEngagement
      }
    };
  }

  /**
   * Export claims to CSV
   * @param offerId - Offer ID
   * @param filters - Export filters
   * @returns CSV export result
   * @phase Phase 3
   */
  async exportClaimsToCSV(
    offerId: number,
    filters?: import('@features/offers/types').ExportFilters
  ): Promise<import('@features/offers/types').CSVExportResult> {
    let query = `
      SELECT
        oc.id,
        oc.promo_code,
        oc.claimed_at,
        oc.redeemed_at,
        oc.status,
        oc.redemption_method,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
        u.email as user_email
      FROM offer_claims oc
      JOIN users u ON oc.user_id = u.id
      WHERE oc.offer_id = ?
    `;

    const params: (number | Date | string)[] = [offerId];

    if (filters?.startDate) {
      query += ' AND oc.claimed_at >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ' AND oc.claimed_at <= ?';
      params.push(filters.endDate);
    }

    if (filters?.status) {
      query += ' AND oc.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY oc.claimed_at DESC';

    const result = await this.db.query<{
      id: number;
      promo_code: string;
      claimed_at: Date;
      redeemed_at: Date | null;
      status: string;
      redemption_method: string | null;
      user_name: string;
      user_email: string;
    }>(query, params);

    // Build CSV manually (papaparse import will be in the route handler)
    const headers = filters?.includeEmail
      ? ['ID', 'Promo Code', 'User Name', 'User Email', 'Claimed At', 'Redeemed At', 'Status', 'Redemption Method']
      : ['ID', 'Promo Code', 'User Name', 'Claimed At', 'Redeemed At', 'Status', 'Redemption Method'];

    const rows = result.rows.map(row =>
      filters?.includeEmail
        ? [
            row.id.toString(),
            row.promo_code,
            row.user_name,
            row.user_email,
            new Date(row.claimed_at).toISOString(),
            row.redeemed_at ? new Date(row.redeemed_at).toISOString() : '',
            row.status,
            row.redemption_method || ''
          ]
        : [
            row.id.toString(),
            row.promo_code,
            row.user_name,
            new Date(row.claimed_at).toISOString(),
            row.redeemed_at ? new Date(row.redeemed_at).toISOString() : '',
            row.status,
            row.redemption_method || ''
          ]
    );

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    return {
      csv,
      filename: `offer_${offerId}_claims_${Date.now()}.csv`,
      rowCount: result.rows.length,
      generatedAt: new Date()
    };
  }

  /**
   * Export analytics to CSV
   * @param offerId - Offer ID
   * @param filters - Export filters
   * @returns CSV export result
   * @phase Phase 3
   */
  async exportAnalyticsToCSV(
    offerId: number,
    filters?: import('@features/offers/types').ExportFilters
  ): Promise<import('@features/offers/types').CSVExportResult> {
    let query = `
      SELECT
        event_type,
        source,
        created_at,
        COUNT(*) as count
      FROM offer_analytics
      WHERE offer_id = ?
    `;

    const params: (number | Date)[] = [offerId];

    if (filters?.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' GROUP BY event_type, source, DATE(created_at) ORDER BY created_at DESC';

    const result = await this.db.query<{
      event_type: string;
      source: string;
      created_at: Date;
      count: bigint;
    }>(query, params);

    const headers = ['Event Type', 'Source', 'Date', 'Count'];
    const rows = result.rows.map(row => [
      row.event_type,
      row.source,
      new Date(row.created_at).toISOString().split('T')[0],
      bigIntToNumber(row.count).toString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    return {
      csv,
      filename: `offer_${offerId}_analytics_${Date.now()}.csv`,
      rowCount: result.rows.length,
      generatedAt: new Date()
    };
  }

  /**
   * Get offer performance comparison for a listing
   * @param listingId - Listing ID
   * @returns Offer comparison array
   * @phase Phase 3
   */
  async getOfferComparison(
    listingId: number
  ): Promise<import('@features/offers/types').OfferComparison[]> {
    // Get all offers for listing
    const offers = await this.getByListingId(listingId);

    // Get analytics for each offer
    const comparisons: import('@features/offers/types').OfferComparison[] = [];

    for (const offer of offers) {
      const funnel = await this.getAnalyticsFunnel(offer.id);

      comparisons.push({
        offerId: offer.id,
        title: offer.title,
        status: offer.status as import('@features/offers/types').OfferStatus,
        metrics: {
          impressions: funnel.stages.impressions,
          pageViews: funnel.stages.pageViews,
          claims: funnel.stages.claims,
          redemptions: funnel.stages.redemptions,
          viewConversionRate: funnel.conversionRates.impressionToView,
          claimConversionRate: funnel.conversionRates.viewToClaim,
          redemptionRate: funnel.conversionRates.claimToRedemption
        },
        rank: 0,
        percentile: 0
      });
    }

    // Sort by total claims (descending)
    comparisons.sort((a, b) => b.metrics.claims - a.metrics.claims);

    // Assign ranks and percentiles
    comparisons.forEach((comp, index) => {
      comp.rank = index + 1;
      comp.percentile =
        comparisons.length > 1
          ? ((comparisons.length - index) / comparisons.length) * 100
          : 100;
    });

    return comparisons;
  }

  /**
   * Map database row to Offer interface
   * @param row - Typed OfferRow from database
   * @returns Offer - Application-level Offer object
   */
  private mapRowToOffer(row: OfferRow): Offer {
    return {
      id: row.id,
      listing_id: row.listing_id,
      title: row.title,
      slug: row.slug,
      description: row.description || null,
      offer_type: row.offer_type as OfferType,
      original_price: row.original_price || null,
      sale_price: row.sale_price || null,
      discount_percentage: row.discount_percentage || null,
      image: row.image || null,
      thumbnail: row.thumbnail || null,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      quantity_total: row.quantity_total || null,
      quantity_remaining: row.quantity_remaining || null,
      max_per_user: row.max_per_user || 1,
      redemption_code: row.redemption_code || null,
      redemption_instructions: row.redemption_instructions || null,
      redemption_count: row.redemption_count || 0,
      // Phase 1 fields
      promo_code_mode: (row as { promo_code_mode?: 'universal' | 'unique' }).promo_code_mode || 'universal',
      universal_code: (row as { universal_code?: string | null }).universal_code || null,
      terms_conditions: (row as { terms_conditions?: string | null }).terms_conditions || null,
      min_purchase_amount: (row as { min_purchase_amount?: number | null }).min_purchase_amount || null,
      applicable_products: safeJsonParse((row as { applicable_products?: string | null }).applicable_products),
      status: row.status as OfferStatus,
      is_featured: Boolean(row.is_featured),
      is_mock: Boolean(row.is_mock),
      view_count: row.view_count || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to Redemption interface
   * @param row - Typed OfferRedemptionRow from database
   * @returns Redemption - Application-level Redemption object
   */
  private mapRowToRedemption(row: OfferRedemptionRow): Redemption {
    return {
      id: row.id,
      offer_id: row.offer_id,
      user_id: row.user_id,
      redeemed_at: new Date(row.redeemed_at),
      redemption_code: row.redemption_code || null
    };
  }

  // ==========================================================================
  // Phase 3: Dispute/Support Methods (TD-P3-008)
  // ==========================================================================

  /**
   * Create a redemption dispute when a promo code doesn't work
   * @param claimId - Claim ID
   * @param userId - User ID filing the dispute
   * @param reason - Dispute reason
   * @param details - Additional details
   * @returns Created dispute record
   * @phase TD-P3-008
   */
  async createRedemptionDispute(
    claimId: number,
    userId: number,
    reason: 'code_not_working' | 'already_used' | 'wrong_offer' | 'technical_issue' | 'other',
    details?: string
  ): Promise<import('@features/offers/types').OfferDispute> {
    // Verify claim exists and belongs to user
    const claimResult = await this.db.query<{
      id: number;
      offer_id: number;
      user_id: number;
    }>(
      'SELECT id, offer_id, user_id FROM offer_claims WHERE id = ?',
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      throw BizError.notFound('Claim', claimId);
    }

    const claim = claimResult.rows[0];
    if (!claim) {
      throw BizError.notFound('Claim', claimId);
    }

    if (claim.user_id !== userId) {
      throw BizError.forbidden('You do not own this claim');
    }

    // Check for existing open dispute on this claim
    const existingDispute = await this.db.query<{ id: number }>(
      `SELECT id FROM offer_disputes WHERE claim_id = ? AND status IN ('open', 'investigating')`,
      [claimId]
    );

    if (existingDispute.rows.length > 0) {
      throw BizError.badRequest('An active dispute already exists for this claim');
    }

    // Create dispute
    const result = await this.db.query(
      `INSERT INTO offer_disputes (claim_id, user_id, reason, details, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [claimId, userId, reason, details || null]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create dispute', new Error('No insert ID returned'));
    }

    // Notify business owner about the dispute
    try {
      const offerResult = await this.db.query<{ listing_id: number; title: string }>(
        'SELECT listing_id, title FROM offers WHERE id = ?',
        [claim.offer_id]
      );

      if (offerResult.rows.length > 0 && offerResult.rows[0]) {
        const offer = offerResult.rows[0];
        const listingResult = await this.db.query<{ claimant_user_id: number | null }>(
          'SELECT claimant_user_id FROM listings WHERE id = ?',
          [offer.listing_id]
        );

        if (listingResult.rows.length > 0 && listingResult.rows[0]?.claimant_user_id) {
          const { getNotificationService } = await import('@core/services/ServiceRegistry');
          const notificationService = getNotificationService();
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

          await notificationService.dispatch({
            type: 'offer.dispute_opened',
            recipientId: listingResult.rows[0].claimant_user_id,
            title: `Dispute opened: ${offer.title}`,
            message: `A customer reported an issue with redemption: ${reason}`,
            entityType: 'offer',
            entityId: claim.offer_id,
            actionUrl: `${baseUrl}/dashboard/offers`,
            priority: 'high',
            metadata: {
              dispute_id: result.insertId,
              claim_id: claimId,
              reason
            }
          });
        }
      }
    } catch (notifyError) {
      console.error('[OfferService] Dispute notification failed:', notifyError);
    }

    // Return created dispute
    const createdDispute = await this.db.query<{
      id: number;
      claim_id: number;
      user_id: number;
      reason: string;
      details: string | null;
      status: string;
      resolution: string | null;
      created_at: string;
      resolved_at: string | null;
    }>(
      'SELECT * FROM offer_disputes WHERE id = ?',
      [result.insertId]
    );

    if (createdDispute.rows.length === 0) {
      throw BizError.databaseError('create dispute', new Error('Failed to retrieve created dispute'));
    }

    const row = createdDispute.rows[0]!;
    return {
      id: row.id,
      claim_id: row.claim_id,
      user_id: row.user_id,
      reason: row.reason,
      details: row.details,
      status: row.status as import('@features/offers/types').DisputeStatus,
      resolution: row.resolution,
      created_at: new Date(row.created_at),
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null
    };
  }

  /**
   * Get disputes for an offer (for business owners)
   * @param offerId - Offer ID
   * @returns Array of disputes
   * @phase TD-P3-008
   */
  async getOfferDisputes(
    offerId: number
  ): Promise<import('@features/offers/types').OfferDispute[]> {
    const result = await this.db.query<{
      id: number;
      claim_id: number;
      user_id: number;
      reason: string;
      details: string | null;
      status: string;
      resolution: string | null;
      created_at: string;
      resolved_at: string | null;
    }>(
      `SELECT od.* FROM offer_disputes od
       JOIN offer_claims oc ON od.claim_id = oc.id
       WHERE oc.offer_id = ?
       ORDER BY od.created_at DESC`,
      [offerId]
    );

    return result.rows.map(row => ({
      id: row.id,
      claim_id: row.claim_id,
      user_id: row.user_id,
      reason: row.reason,
      details: row.details,
      status: row.status as import('@features/offers/types').DisputeStatus,
      resolution: row.resolution,
      created_at: new Date(row.created_at),
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null
    }));
  }

  /**
   * Get all disputes platform-wide (for admin)
   * @param options - Filter and pagination options
   * @returns Paginated disputes with total count
   * @phase Phase 6 - Admin Dispute Management
   */
  async getAllDisputes(options: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ disputes: import('@features/offers/types').OfferDispute[]; total: number }> {
    const { status, limit, offset } = options;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      conditions.push('od.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM offer_disputes od ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated disputes
    const result = await this.db.query<{
      id: number;
      claim_id: number;
      user_id: number;
      reason: string;
      details: string | null;
      status: string;
      resolution: string | null;
      created_at: string;
      resolved_at: string | null;
    }>(
      `SELECT od.* FROM offer_disputes od
       ${whereClause}
       ORDER BY od.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const disputes = result.rows.map(row => ({
      id: row.id,
      claim_id: row.claim_id,
      user_id: row.user_id,
      reason: row.reason,
      details: row.details,
      status: row.status as import('@features/offers/types').DisputeStatus,
      resolution: row.resolution,
      created_at: new Date(row.created_at),
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null
    }));

    return { disputes, total };
  }

  /**
   * Get admin stats for the admin offers page stats panel
   * Returns counts by status and offer type
   * @phase Phase 8A - Admin Stats
   */
  async getAdminStats(): Promise<{
    total: number;
    active: number;
    draft: number;
    paused: number;
    expired: number;
    sold_out: number;
    featured: number;
    byOfferType: {
      discount: number;
      coupon: number;
      product: number;
      service: number;
    };
  }> {
    const result = await this.db.query<{
      total: bigint;
      active: bigint;
      draft: bigint;
      paused: bigint;
      expired: bigint;
      sold_out: bigint;
      featured: bigint;
      ot_discount: bigint;
      ot_coupon: bigint;
      ot_product: bigint;
      ot_service: bigint;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'sold_out' THEN 1 ELSE 0 END) as sold_out,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
        SUM(CASE WHEN offer_type = 'discount' THEN 1 ELSE 0 END) as ot_discount,
        SUM(CASE WHEN offer_type = 'coupon' THEN 1 ELSE 0 END) as ot_coupon,
        SUM(CASE WHEN offer_type = 'product' THEN 1 ELSE 0 END) as ot_product,
        SUM(CASE WHEN offer_type = 'service' THEN 1 ELSE 0 END) as ot_service
      FROM offers`,
      []
    );

    const row = result.rows[0];
    return {
      total: bigIntToNumber(row?.total),
      active: bigIntToNumber(row?.active),
      draft: bigIntToNumber(row?.draft),
      paused: bigIntToNumber(row?.paused),
      expired: bigIntToNumber(row?.expired),
      sold_out: bigIntToNumber(row?.sold_out),
      featured: bigIntToNumber(row?.featured),
      byOfferType: {
        discount: bigIntToNumber(row?.ot_discount),
        coupon: bigIntToNumber(row?.ot_coupon),
        product: bigIntToNumber(row?.ot_product),
        service: bigIntToNumber(row?.ot_service),
      },
    };
  }

  // ==========================================================================
  // Phase 4: Advanced Features - Template Methods
  // ==========================================================================

  /**
   * Save offer as template
   * @param offerId - Offer ID to save as template
   * @param userId - User ID (for ownership verification)
   * @param name - Template name
   * @returns Created template
   * @phase Phase 4
   */
  async saveAsTemplate(
    offerId: number,
    userId: number,
    name: string
  ): Promise<import('@features/offers/types').OfferTemplate> {
    // Get offer and verify ownership
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    // Verify user owns the listing
    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to save this offer as a template');
    }

    // Extract template data (exclude IDs, dates, status)
    const templateData: import('@features/offers/types').OfferTemplateData = {
      title: offer.title,
      description: offer.description,
      offer_type: offer.offer_type,
      original_price: offer.original_price,
      sale_price: offer.sale_price,
      discount_percentage: offer.discount_percentage,
      terms_conditions: offer.terms_conditions,
      redemption_instructions: offer.redemption_instructions,
      max_per_user: offer.max_per_user,
      quantity_total: offer.quantity_total
    };

    // Create template record
    const result = await this.db.query(
      `INSERT INTO offer_templates (listing_id, name, template_data)
       VALUES (?, ?, ?)`,
      [offer.listing_id, name, JSON.stringify(templateData)]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create template', new Error('No insert ID returned'));
    }

    // Return created template
    const created = await this.db.query<{
      id: number;
      listing_id: number;
      name: string;
      template_data: string;
      recurrence_type: string;
      recurrence_days: string | null;
      recurrence_end_date: string | null;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM offer_templates WHERE id = ?',
      [result.insertId]
    );

    const row = created.rows[0];
    if (!row) {
      throw BizError.databaseError('create template', new Error('Failed to retrieve created template'));
    }

    const parsedTemplateData = safeJsonParse<import('@features/offers/types').OfferTemplateData>(row.template_data);
    const recurrenceDays = row.recurrence_days ? safeJsonParse<number[]>(row.recurrence_days) : null;

    return {
      id: row.id,
      listing_id: row.listing_id,
      name: row.name,
      template_data: parsedTemplateData || {
        title: '',
        description: null,
        offer_type: 'discount',
        original_price: null,
        sale_price: null,
        discount_percentage: null,
        terms_conditions: null,
        redemption_instructions: null,
        max_per_user: 1,
        quantity_total: null
      },
      recurrence_type: row.recurrence_type as import('@features/offers/types').RecurrenceType,
      recurrence_days: recurrenceDays,
      recurrence_end_date: row.recurrence_end_date ? new Date(row.recurrence_end_date) : null,
      is_active: row.is_active === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Load template for form pre-fill
   * @param templateId - Template ID
   * @param userId - User ID (for ownership verification)
   * @returns Template data
   * @phase Phase 4
   */
  async loadTemplate(
    templateId: number,
    userId: number
  ): Promise<import('@features/offers/types').OfferTemplateData> {
    // Get template
    const result = await this.db.query<{
      listing_id: number;
      template_data: string;
    }>(
      'SELECT listing_id, template_data FROM offer_templates WHERE id = ?',
      [templateId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('Template', templateId);
    }

    const row = result.rows[0]!;

    // Verify user owns the listing
    const listing = await this.listingService.getById(row.listing_id);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to access this template');
    }

    const parsedData = safeJsonParse<import('@features/offers/types').OfferTemplateData>(row.template_data);
    return parsedData || {
      title: '',
      description: null,
      offer_type: 'discount',
      original_price: null,
      sale_price: null,
      discount_percentage: null,
      terms_conditions: null,
      redemption_instructions: null,
      max_per_user: 1,
      quantity_total: null
    };
  }

  /**
   * Get all templates for a listing
   * @param listingId - Listing ID
   * @param userId - User ID (for ownership verification)
   * @returns Array of templates
   * @phase Phase 4
   */
  async getListingTemplates(
    listingId: number,
    userId: number
  ): Promise<import('@features/offers/types').OfferTemplate[]> {
    // Verify user owns the listing
    const listing = await this.listingService.getById(listingId);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to access these templates');
    }

    const result = await this.db.query<{
      id: number;
      listing_id: number;
      name: string;
      template_data: string;
      recurrence_type: string;
      recurrence_days: string | null;
      recurrence_end_date: string | null;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM offer_templates WHERE listing_id = ? ORDER BY created_at DESC',
      [listingId]
    );

    return result.rows.map(row => {
      const templateData = safeJsonParse<import('@features/offers/types').OfferTemplateData>(row.template_data);
      const recurrenceDays = row.recurrence_days ? safeJsonParse<number[]>(row.recurrence_days) : null;

      return {
        id: row.id,
        listing_id: row.listing_id,
        name: row.name,
        template_data: templateData || {
          title: '',
          description: null,
          offer_type: 'discount',
          original_price: null,
          sale_price: null,
          discount_percentage: null,
          terms_conditions: null,
          redemption_instructions: null,
          max_per_user: 1,
          quantity_total: null
        },
        recurrence_type: row.recurrence_type as import('@features/offers/types').RecurrenceType,
        recurrence_days: recurrenceDays,
        recurrence_end_date: row.recurrence_end_date ? new Date(row.recurrence_end_date) : null,
        is_active: row.is_active === 1,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    });
  }

  /**
   * Delete template
   * @param templateId - Template ID
   * @param userId - User ID (for ownership verification)
   * @phase Phase 4
   */
  async deleteTemplate(templateId: number, userId: number): Promise<void> {
    // Get template
    const result = await this.db.query<{ listing_id: number }>(
      'SELECT listing_id FROM offer_templates WHERE id = ?',
      [templateId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('Template', templateId);
    }

    const listingId = result.rows[0]!.listing_id;

    // Verify ownership
    const listing = await this.listingService.getById(listingId);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to delete this template');
    }

    await this.db.query('DELETE FROM offer_templates WHERE id = ?', [templateId]);
  }

  // ==========================================================================
  // Phase 4: Flash Offer Methods
  // ==========================================================================

  /**
   * Create flash offer
   * @param input - Flash offer input data
   * @param listingId - Listing ID
   * @param userId - User ID
   * @returns Created offer
   * @phase Phase 4
   */
  async createFlashOffer(
    input: import('@features/offers/types').CreateFlashOfferInput,
    listingId: number,
    userId: number
  ): Promise<Offer> {
    // Validate listing ownership
    const listing = await this.listingService.getById(listingId);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to create offers for this listing');
    }

    // Validate flash window (max 24 hours)
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hoursUntilEnd = durationMs / (1000 * 60 * 60);

    if (hoursUntilEnd > 24) {
      throw BizError.badRequest('Flash offers cannot exceed 24 hours');
    }

    // Calculate urgency level based on duration
    let urgencyLevel: import('@features/offers/types').FlashUrgencyLevel = 'normal';
    if (hoursUntilEnd < 0.5) {
      urgencyLevel = 'critical';
    } else if (hoursUntilEnd < 2) {
      urgencyLevel = 'high';
    }

    // Create offer with flash settings (convert flash input to standard input)
    const createInput: CreateOfferInput = {
      title: input.title,
      description: input.description,
      offer_type: input.offer_type as OfferType,
      original_price: input.original_price,
      sale_price: input.sale_price,
      discount_percentage: input.discount_percentage,
      start_date: input.start_date,
      end_date: input.end_date,
      max_per_user: input.max_per_user,
      quantity_total: input.quantity_total,
      redemption_instructions: input.redemption_instructions
    };
    const offer = await this.create(listingId, createInput);

    // Update with flash-specific fields
    await this.db.query(
      `UPDATE offers
       SET is_flash = 1,
           flash_start_time = ?,
           flash_end_time = ?,
           flash_urgency_level = ?
       WHERE id = ?`,
      [input.flash_start_time, input.flash_end_time, urgencyLevel, offer.id]
    );

    // Return updated offer
    const updated = await this.getById(offer.id);
    if (!updated) {
      throw BizError.databaseError('create flash offer', new Error('Failed to retrieve created offer'));
    }

    return updated;
  }

  /**
   * Get active flash offers
   * @param filters - Optional filters
   * @returns Array of active flash offers
   * @phase Phase 4
   */
  async getActiveFlashOffers(
    filters?: import('@features/offers/types').FlashOfferFilters
  ): Promise<Offer[]> {
    let sql = `SELECT * FROM offers
               WHERE is_flash = 1
                 AND status = 'active'
                 AND end_date > NOW()`;
    const params: unknown[] = [];

    if (filters?.urgencyLevel) {
      sql += ' AND flash_urgency_level = ?';
      params.push(filters.urgencyLevel);
    }

    sql += ' ORDER BY flash_urgency_level DESC, end_date ASC';

    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(sql, params);
    return result.rows.map(this.mapRowToOffer);
  }

  // ==========================================================================
  // Phase 4: Geo-Fence Methods
  // ==========================================================================

  /**
   * Add geo-fence trigger
   * @param offerId - Offer ID
   * @param userId - User ID (for ownership verification)
   * @param config - Geo-fence configuration
   * @returns Created trigger
   * @phase Phase 4
   */
  async addGeoTrigger(
    offerId: number,
    userId: number,
    config: import('@features/offers/types').GeoTriggerConfig
  ): Promise<import('@features/offers/types').GeoTrigger> {
    // Verify offer ownership
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to add geo-fences for this offer');
    }

    // Create geo_trigger record
    const result = await this.db.query(
      `INSERT INTO offer_geo_triggers (offer_id, latitude, longitude, radius_meters, notification_message)
       VALUES (?, ?, ?, ?, ?)`,
      [
        offerId,
        config.latitude,
        config.longitude,
        config.radius_meters || 500,
        config.notification_message || null
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create geo trigger', new Error('No insert ID returned'));
    }

    // Return created trigger
    const created = await this.db.query<{
      id: number;
      offer_id: number;
      latitude: number;
      longitude: number;
      radius_meters: number;
      is_active: number;
      notification_message: string | null;
      created_at: string;
    }>(
      'SELECT * FROM offer_geo_triggers WHERE id = ?',
      [result.insertId]
    );

    const row = created.rows[0];
    if (!row) {
      throw BizError.databaseError('create geo trigger', new Error('Failed to retrieve created trigger'));
    }

    return {
      id: row.id,
      offer_id: row.offer_id,
      latitude: row.latitude,
      longitude: row.longitude,
      radius_meters: row.radius_meters,
      is_active: row.is_active === 1,
      notification_message: row.notification_message,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Get nearby offers (for push notification)
   * @param latitude - User latitude
   * @param longitude - User longitude
   * @param radiusMeters - Search radius in meters (default 500)
   * @returns Array of nearby offers
   * @phase Phase 4
   */
  async getNearbyOffers(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<Offer[]> {
    // Use Haversine formula to calculate distance
    const result: DbResult<OfferRow> = await this.db.query<OfferRow>(
      `SELECT o.* FROM offers o
       JOIN offer_geo_triggers gt ON o.id = gt.offer_id
       WHERE gt.is_active = 1
         AND o.status = 'active'
         AND o.end_date > NOW()
         AND (
           6371000 * acos(
             cos(radians(?)) * cos(radians(gt.latitude)) *
             cos(radians(gt.longitude) - radians(?)) +
             sin(radians(?)) * sin(radians(gt.latitude))
           )
         ) <= ?
       ORDER BY (
         6371000 * acos(
           cos(radians(?)) * cos(radians(gt.latitude)) *
           cos(radians(gt.longitude) - radians(?)) +
           sin(radians(?)) * sin(radians(gt.latitude))
         )
       ) ASC`,
      [latitude, longitude, latitude, radiusMeters, latitude, longitude, latitude]
    );

    return result.rows.map(this.mapRowToOffer);
  }

  /**
   * Remove geo-fence trigger
   * @param triggerId - Trigger ID
   * @param userId - User ID (for ownership verification)
   * @phase Phase 4
   */
  async removeGeoTrigger(triggerId: number, userId: number): Promise<void> {
    // Get trigger and verify ownership
    const result = await this.db.query<{ offer_id: number }>(
      'SELECT offer_id FROM offer_geo_triggers WHERE id = ?',
      [triggerId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('Geo trigger', triggerId);
    }

    const offerId = result.rows[0]!.offer_id;
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to remove this geo-fence');
    }

    await this.db.query('DELETE FROM offer_geo_triggers WHERE id = ?', [triggerId]);
  }

  // ==========================================================================
  // Phase 4: Social Proof Methods
  // ==========================================================================

  /**
   * Get social proof data for an offer
   * @param offerId - Offer ID
   * @returns Social proof data
   * @phase Phase 4
   */
  async getSocialProofData(offerId: number): Promise<import('@features/offers/types').SocialProofData> {
    // Count claims in last 24 hours
    const todayResult = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM offer_claims
       WHERE offer_id = ?
         AND claimed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [offerId]
    );
    const claimsToday = bigIntToNumber(todayResult.rows[0]?.count || 0);

    // Count total claims
    const totalResult = await this.db.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM offer_claims WHERE offer_id = ?',
      [offerId]
    );
    const claimsTotal = bigIntToNumber(totalResult.rows[0]?.count || 0);

    // Check if trending (significant increase)
    const yesterdayResult = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM offer_claims
       WHERE offer_id = ?
         AND claimed_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
         AND claimed_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [offerId]
    );
    const claimsYesterday = bigIntToNumber(yesterdayResult.rows[0]?.count || 0);
    const trending = claimsToday > claimsYesterday * 1.5; // 50% increase = trending

    return {
      offer_id: offerId,
      claims_today: claimsToday,
      claims_total: claimsTotal,
      trending
    };
  }

  // ==========================================================================
  // Phase 4: Loyalty Methods
  // ==========================================================================

  /**
   * Get user loyalty for listing
   * @param userId - User ID
   * @param listingId - Listing ID
   * @returns User loyalty data or null
   * @phase Phase 4
   */
  async getUserLoyalty(
    userId: number,
    listingId: number
  ): Promise<import('@features/offers/types').UserLoyalty | null> {
    const result = await this.db.query<{
      id: number;
      user_id: number;
      listing_id: number;
      total_claims: number;
      total_redemptions: number;
      total_value: number;
      first_claim_at: string | null;
      last_claim_at: string | null;
      loyalty_tier: string;
    }>(
      'SELECT * FROM offer_loyalty WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0]!;
    return {
      id: row.id,
      user_id: row.user_id,
      listing_id: row.listing_id,
      total_claims: row.total_claims,
      total_redemptions: row.total_redemptions,
      total_value: row.total_value,
      first_claim_at: row.first_claim_at ? new Date(row.first_claim_at) : null,
      last_claim_at: row.last_claim_at ? new Date(row.last_claim_at) : null,
      loyalty_tier: row.loyalty_tier as import('@features/offers/types').LoyaltyTier
    };
  }

  /**
   * Update loyalty after claim
   * @param userId - User ID
   * @param listingId - Listing ID
   * @param claimValue - Claim value
   * @phase Phase 4
   */
  async updateLoyalty(userId: number, listingId: number, claimValue: number): Promise<void> {
    // Get or create loyalty record
    const existing = await this.getUserLoyalty(userId, listingId);

    if (existing) {
      // Update existing
      const newTotalClaims = existing.total_claims + 1;
      const newTotalValue = existing.total_value + claimValue;

      // Calculate new tier
      let newTier: import('@features/offers/types').LoyaltyTier = 'new';
      if (newTotalClaims >= 20) newTier = 'platinum';
      else if (newTotalClaims >= 10) newTier = 'gold';
      else if (newTotalClaims >= 5) newTier = 'silver';
      else if (newTotalClaims >= 2) newTier = 'bronze';

      await this.db.query(
        `UPDATE offer_loyalty
         SET total_claims = ?,
             total_value = ?,
             last_claim_at = NOW(),
             loyalty_tier = ?
         WHERE id = ?`,
        [newTotalClaims, newTotalValue, newTier, existing.id]
      );
    } else {
      // Create new
      await this.db.query(
        `INSERT INTO offer_loyalty (user_id, listing_id, total_claims, total_value, first_claim_at, last_claim_at, loyalty_tier)
         VALUES (?, ?, 1, ?, NOW(), NOW(), 'new')`,
        [userId, listingId, claimValue]
      );
    }
  }

  /**
   * Get listing's loyal customers
   * @param listingId - Listing ID
   * @param userId - User ID (for ownership verification)
   * @returns Array of loyal customers
   * @phase Phase 4
   */
  async getListingLoyalCustomers(
    listingId: number,
    userId: number
  ): Promise<import('@features/offers/types').LoyalCustomer[]> {
    // Verify ownership
    const listing = await this.listingService.getById(listingId);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to view loyal customers');
    }

    const result = await this.db.query<{
      user_id: number;
      first_name: string | null;
      last_name: string | null;
      total_claims: number;
      loyalty_tier: string;
      last_claim_at: string;
    }>(
      `SELECT ol.user_id, u.first_name, u.last_name, ol.total_claims, ol.loyalty_tier, ol.last_claim_at
       FROM offer_loyalty ol
       JOIN users u ON ol.user_id = u.id
       WHERE ol.listing_id = ?
       ORDER BY ol.total_claims DESC
       LIMIT 100`,
      [listingId]
    );

    return result.rows.map(row => ({
      user_id: row.user_id,
      display_name: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name.charAt(0)}.`
        : 'Anonymous User',
      total_claims: row.total_claims,
      loyalty_tier: row.loyalty_tier as import('@features/offers/types').LoyaltyTier,
      last_claim_at: new Date(row.last_claim_at)
    }));
  }

  // ==========================================================================
  // Phase 4: Bundle Methods
  // ==========================================================================

  /**
   * Create offer bundle
   * @param input - Bundle input data
   * @param userId - User ID
   * @returns Created bundle
   * @phase Phase 4
   */
  async createBundle(
    input: import('@features/offers/types').CreateBundleInput,
    userId: number
  ): Promise<import('@features/offers/types').OfferBundle> {
    // Validate offers exist and user has permission
    for (const offerId of input.offer_ids) {
      const offer = await this.getById(offerId);
      if (!offer) {
        throw new OfferNotFoundError(offerId);
      }

      const listing = await this.listingService.getById(offer.listing_id);
      if (!listing || listing.user_id !== userId) {
        throw BizError.forbidden('You do not have permission to include this offer in a bundle');
      }
    }

    // Generate slug if not provided
    const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Calculate total value
    let totalValue = 0;
    for (const offerId of input.offer_ids) {
      const offer = await this.getById(offerId);
      if (offer?.sale_price) {
        totalValue += offer.sale_price;
      }
    }

    // Create bundle
    const result = await this.db.query(
      `INSERT INTO offer_bundles (name, slug, description, total_value, bundle_price, start_date, end_date, max_claims, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        input.name,
        slug,
        input.description || null,
        totalValue,
        input.bundle_price,
        input.start_date,
        input.end_date,
        input.max_claims || null,
        userId
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create bundle', new Error('No insert ID returned'));
    }

    // Link offers to bundle
    for (let i = 0; i < input.offer_ids.length; i++) {
      await this.db.query(
        'INSERT INTO offer_bundle_items (bundle_id, offer_id, sort_order) VALUES (?, ?, ?)',
        [result.insertId, input.offer_ids[i], i]
      );
    }

    // Return created bundle
    const created = await this.db.query<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      total_value: number;
      bundle_price: number;
      start_date: string;
      end_date: string;
      max_claims: number | null;
      claims_count: number;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM offer_bundles WHERE id = ?',
      [result.insertId]
    );

    const row = created.rows[0];
    if (!row) {
      throw BizError.databaseError('create bundle', new Error('Failed to retrieve created bundle'));
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      total_value: row.total_value,
      bundle_price: row.bundle_price,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      max_claims: row.max_claims,
      claims_count: row.claims_count,
      status: row.status as 'draft' | 'active' | 'expired' | 'sold_out',
      created_by: row.created_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Claim bundle (claims all included offers)
   * @param bundleId - Bundle ID
   * @param userId - User ID
   * @returns Bundle claim result
   * @phase Phase 4
   */
  async claimBundle(
    bundleId: number,
    userId: number
  ): Promise<import('@features/offers/types').BundleClaimResult> {
    // Get bundle
    const bundleResult = await this.db.query<{
      status: string;
      max_claims: number | null;
      claims_count: number;
    }>(
      'SELECT status, max_claims, claims_count FROM offer_bundles WHERE id = ?',
      [bundleId]
    );

    if (bundleResult.rows.length === 0) {
      throw BizError.notFound('Bundle', bundleId);
    }

    const bundle = bundleResult.rows[0]!;

    // Verify bundle is active
    if (bundle.status !== 'active') {
      throw BizError.badRequest('Bundle is not active');
    }

    // Check if sold out
    if (bundle.max_claims && bundle.claims_count >= bundle.max_claims) {
      throw BizError.badRequest('Bundle is sold out');
    }

    // Get bundle offers
    const offersResult = await this.db.query<{ offer_id: number }>(
      'SELECT offer_id FROM offer_bundle_items WHERE bundle_id = ? ORDER BY sort_order',
      [bundleId]
    );

    const claims: import('@features/offers/types').ClaimResult[] = [];
    let totalSavings = 0;

    // Claim each offer
    for (const row of offersResult.rows) {
      const claimResult = await this.claimOffer(row.offer_id, userId);
      claims.push(claimResult);

      const offer = await this.getById(row.offer_id);
      if (offer?.original_price && offer?.sale_price) {
        totalSavings += (offer.original_price - offer.sale_price);
      }
    }

    // Increment bundle claims count
    await this.db.query(
      'UPDATE offer_bundles SET claims_count = claims_count + 1 WHERE id = ?',
      [bundleId]
    );

    return {
      bundle_id: bundleId,
      claims,
      total_savings: totalSavings
    };
  }

  /**
   * Get bundles (public directory)
   * @param pagination - Pagination parameters
   * @returns Paginated bundles
   * @phase Phase 4
   */
  async getBundles(
    pagination?: PaginationParams
  ): Promise<PaginatedResult<import('@features/offers/types').OfferBundle>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM offer_bundles WHERE status = 'active'`
    );
    const total = bigIntToNumber(countResult.rows[0]?.total || 0);

    // Get paginated data
    const result = await this.db.query<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      total_value: number;
      bundle_price: number;
      start_date: string;
      end_date: string;
      max_claims: number | null;
      claims_count: number;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM offer_bundles
       WHERE status = 'active'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return {
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        total_value: row.total_value,
        bundle_price: row.bundle_price,
        start_date: new Date(row.start_date),
        end_date: new Date(row.end_date),
        max_claims: row.max_claims,
        claims_count: row.claims_count,
        status: row.status as 'draft' | 'active' | 'expired' | 'sold_out',
        created_by: row.created_by,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get bundle by slug (public detail view)
   * @param slug - Bundle slug
   * @returns Bundle with included offers, or null if not found
   * @phase Phase 4.5
   */
  async getBundleBySlug(
    slug: string
  ): Promise<import('@features/offers/types').OfferBundle | null> {
    // Get bundle
    const result = await this.db.query<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      total_value: number;
      bundle_price: number;
      start_date: string;
      end_date: string;
      max_claims: number | null;
      claims_count: number;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM offer_bundles WHERE slug = ? LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0]!;

    // Get included offers
    const offersResult = await this.db.query<{
      id: number;
      listing_id: number;
      title: string;
      slug: string;
      description: string | null;
      offer_type: string;
      original_price: number | null;
      sale_price: number | null;
      discount_percentage: number | null;
      image: string | null;
      end_date: string;
      status: string;
    }>(
      `SELECT o.id, o.listing_id, o.title, o.slug, o.description, o.offer_type,
              o.original_price, o.sale_price, o.discount_percentage, o.image, o.end_date, o.status
       FROM offers o
       INNER JOIN offer_bundle_items obi ON o.id = obi.offer_id
       WHERE obi.bundle_id = ?
       ORDER BY obi.position ASC`,
      [row.id]
    );

    const offers = offersResult.rows.map(o => ({
      id: o.id,
      listing_id: o.listing_id,
      title: o.title,
      slug: o.slug,
      description: o.description,
      offer_type: o.offer_type as import('@features/offers/types').Offer['offer_type'],
      original_price: o.original_price,
      sale_price: o.sale_price,
      discount_percentage: o.discount_percentage,
      image: o.image,
      end_date: new Date(o.end_date),
      status: o.status as import('@features/offers/types').Offer['status']
    })) as import('@features/offers/types').Offer[];

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      total_value: row.total_value,
      bundle_price: row.bundle_price,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      max_claims: row.max_claims,
      claims_count: row.claims_count,
      status: row.status as 'draft' | 'active' | 'expired' | 'sold_out',
      created_by: row.created_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      offers
    };
  }

  // ==========================================================================
  // Phase 4: Review Methods
  // ==========================================================================

  /**
   * Submit post-redemption review
   * @param claimId - Claim ID
   * @param userId - User ID
   * @param review - Review input
   * @returns Created review
   * @phase Phase 4
   */
  async submitReview(
    claimId: number,
    userId: number,
    review: import('@features/offers/types').ReviewInput
  ): Promise<import('@features/offers/types').OfferReview> {
    // Verify claim exists and belongs to this user
    const claimResult = await this.db.query<{
      offer_id: number;
      user_id: number;
      status: string;
    }>(
      'SELECT offer_id, user_id, status FROM offer_claims WHERE id = ?',
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      throw BizError.notFound('Claim', claimId);
    }

    const claim = claimResult.rows[0]!;

    if (claim.user_id !== userId) {
      throw BizError.forbidden('You can only review your own claims');
    }

    // Check if already reviewed
    const existingReview = await this.db.query(
      'SELECT id FROM offer_reviews WHERE user_id = ? AND offer_id = ?',
      [userId, claim.offer_id]
    );

    if (existingReview.rows.length > 0) {
      throw BizError.badRequest('You have already reviewed this offer');
    }

    // Create review (images stored as JSON array of URLs)
    const imagesJson = review.images && review.images.length > 0 ? JSON.stringify(review.images) : null;
    const result = await this.db.query(
      `INSERT INTO offer_reviews (offer_id, claim_id, user_id, rating, was_as_described, was_easy_to_redeem, comment, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        claim.offer_id,
        claimId,
        userId,
        review.rating,
        review.was_as_described ?? null,
        review.was_easy_to_redeem ?? null,
        review.comment || null,
        imagesJson
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create review', new Error('No insert ID returned'));
    }

    // Return created review
    const created = await this.db.query<{
      id: number;
      offer_id: number;
      claim_id: number;
      user_id: number;
      rating: number;
      was_as_described: number | null;
      was_easy_to_redeem: number | null;
      comment: string | null;
      images: string | string[] | null;
      created_at: string;
    }>(
      'SELECT * FROM offer_reviews WHERE id = ?',
      [result.insertId]
    );

    const row = created.rows[0];
    if (!row) {
      throw BizError.databaseError('create review', new Error('Failed to retrieve created review'));
    }

    // Parse images: mariadb may auto-parse JSON or return string
    let parsedImages: string[] | null = null;
    if (row.images) {
      if (Array.isArray(row.images)) {
        parsedImages = row.images;
      } else if (typeof row.images === 'string') {
        try { parsedImages = JSON.parse(row.images); } catch { parsedImages = null; }
      }
    }

    return {
      id: row.id,
      offer_id: row.offer_id,
      claim_id: row.claim_id,
      user_id: row.user_id,
      rating: row.rating as 1 | 2 | 3 | 4 | 5,
      was_as_described: row.was_as_described === 1,
      was_easy_to_redeem: row.was_easy_to_redeem === 1,
      comment: row.comment,
      images: parsedImages,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Get offer reviews
   * @param offerId - Offer ID
   * @param pagination - Pagination parameters
   * @returns Paginated reviews
   * @phase Phase 4
   */
  async getOfferReviews(
    offerId: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<import('@features/offers/types').OfferReview>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM offer_reviews WHERE offer_id = ?',
      [offerId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.total || 0);

    // Get paginated data
    const result = await this.db.query<{
      id: number;
      offer_id: number;
      claim_id: number;
      user_id: number;
      rating: number;
      was_as_described: number | null;
      was_easy_to_redeem: number | null;
      comment: string | null;
      images: string | string[] | null;
      created_at: string;
      reviewer_name: string | null;
    }>(
      `SELECT r.*, CONCAT(u.first_name, ' ', SUBSTRING(u.last_name, 1, 1), '.') as reviewer_name
       FROM offer_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.offer_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [offerId, limit, offset]
    );

    return {
      data: result.rows.map(row => {
        // Parse images: mariadb may auto-parse JSON or return string
        let rowImages: string[] | null = null;
        if (row.images) {
          if (Array.isArray(row.images)) {
            rowImages = row.images;
          } else if (typeof row.images === 'string') {
            try { rowImages = JSON.parse(row.images); } catch { rowImages = null; }
          }
        }
        return {
          id: row.id,
          offer_id: row.offer_id,
          claim_id: row.claim_id,
          user_id: row.user_id,
          rating: row.rating as 1 | 2 | 3 | 4 | 5,
          was_as_described: row.was_as_described === 1,
          was_easy_to_redeem: row.was_easy_to_redeem === 1,
          comment: row.comment,
          images: rowImages,
          created_at: new Date(row.created_at),
          reviewer_name: row.reviewer_name || undefined
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if user can review offer
   * @param claimId - Claim ID
   * @param userId - User ID
   * @returns Review eligibility
   * @phase Phase 4
   */
  async canReviewOffer(
    claimId: number,
    userId: number
  ): Promise<{ canReview: boolean; reason: string | null }> {
    // Get claim
    const claimResult = await this.db.query<{
      offer_id: number;
      user_id: number;
      status: string;
    }>(
      'SELECT offer_id, user_id, status FROM offer_claims WHERE id = ?',
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      return { canReview: false, reason: 'Claim not found' };
    }

    const claim = claimResult.rows[0]!;

    if (claim.user_id !== userId) {
      return { canReview: false, reason: 'You can only review your own claims' };
    }

    if (claim.status !== 'redeemed') {
      return { canReview: false, reason: 'Offer must be redeemed before reviewing' };
    }

    // Check if already reviewed
    const existingReview = await this.db.query(
      'SELECT id FROM offer_reviews WHERE user_id = ? AND offer_id = ?',
      [userId, claim.offer_id]
    );

    if (existingReview.rows.length > 0) {
      return { canReview: false, reason: 'You have already reviewed this offer' };
    }

    return { canReview: true, reason: null };
  }

  // ==========================================================================
  // Phase 4: A/B Testing Methods (Preferred/Premium only)
  // ==========================================================================

  /**
   * Create A/B test
   * @param offerId - Offer ID
   * @param userId - User ID
   * @param config - A/B test configuration
   * @returns Created test
   * @phase Phase 4
   */
  async createABTest(
    offerId: number,
    userId: number,
    config: import('@features/offers/types').ABTestConfig
  ): Promise<import('@features/offers/types').ABTest> {
    // Verify offer ownership and tier
    const offer = await this.getById(offerId);
    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to create A/B tests for this offer');
    }

    // Verify tier is Preferred/Premium
    if (listing.tier !== 'preferred' && listing.tier !== 'premium') {
      throw BizError.forbidden('A/B testing is only available for Preferred and Premium tiers');
    }

    // Create test
    const result = await this.db.query(
      `INSERT INTO offer_ab_tests (offer_id, variant_type, variant_a_value, variant_b_value, status)
       VALUES (?, ?, ?, ?, 'running')`,
      [offerId, config.variant_type, config.variant_a_value, config.variant_b_value]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create AB test', new Error('No insert ID returned'));
    }

    // Return created test
    const created = await this.db.query<{
      id: number;
      offer_id: number;
      variant_type: string;
      variant_a_value: string;
      variant_b_value: string;
      variant_a_impressions: number;
      variant_a_claims: number;
      variant_b_impressions: number;
      variant_b_claims: number;
      winning_variant: string;
      status: string;
      started_at: string;
      ended_at: string | null;
    }>(
      'SELECT * FROM offer_ab_tests WHERE id = ?',
      [result.insertId]
    );

    const row = created.rows[0];
    if (!row) {
      throw BizError.databaseError('create AB test', new Error('Failed to retrieve created test'));
    }

    return {
      id: row.id,
      offer_id: row.offer_id,
      variant_type: row.variant_type as 'title' | 'image' | 'price',
      variant_a_value: row.variant_a_value,
      variant_b_value: row.variant_b_value,
      variant_a_impressions: row.variant_a_impressions,
      variant_a_claims: row.variant_a_claims,
      variant_b_impressions: row.variant_b_impressions,
      variant_b_claims: row.variant_b_claims,
      winning_variant: row.winning_variant as 'a' | 'b' | 'none',
      status: row.status as 'running' | 'completed' | 'stopped',
      started_at: new Date(row.started_at),
      ended_at: row.ended_at ? new Date(row.ended_at) : null
    };
  }

  /**
   * Record A/B impression
   * @param offerId - Offer ID
   * @param variant - Variant ('a' or 'b')
   * @phase Phase 4
   */
  async recordABImpression(offerId: number, variant: 'a' | 'b'): Promise<void> {
    const field = variant === 'a' ? 'variant_a_impressions' : 'variant_b_impressions';
    await this.db.query(
      `UPDATE offer_ab_tests
       SET ${field} = ${field} + 1
       WHERE offer_id = ? AND status = 'running'`,
      [offerId]
    );
  }

  /**
   * Get A/B test results
   * @param testId - Test ID
   * @param userId - User ID (for ownership verification)
   * @returns Test results
   * @phase Phase 4
   */
  async getABTestResults(
    testId: number,
    userId: number
  ): Promise<import('@features/offers/types').ABTestResults> {
    // Get test and verify ownership
    const result = await this.db.query<{
      offer_id: number;
      variant_a_impressions: number;
      variant_a_claims: number;
      variant_b_impressions: number;
      variant_b_claims: number;
    }>(
      'SELECT offer_id, variant_a_impressions, variant_a_claims, variant_b_impressions, variant_b_claims FROM offer_ab_tests WHERE id = ?',
      [testId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('A/B Test', testId);
    }

    const test = result.rows[0]!;
    const offer = await this.getById(test.offer_id);
    if (!offer) {
      throw new OfferNotFoundError(test.offer_id);
    }

    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== userId) {
      throw BizError.forbidden('You do not have permission to view this A/B test');
    }

    // Calculate conversion rates
    const conversionRateA = test.variant_a_impressions > 0
      ? (test.variant_a_claims / test.variant_a_impressions) * 100
      : 0;
    const conversionRateB = test.variant_b_impressions > 0
      ? (test.variant_b_claims / test.variant_b_impressions) * 100
      : 0;

    // Simple statistical significance calculation (chi-squared test approximation)
    const totalImpressions = test.variant_a_impressions + test.variant_b_impressions;
    const totalClaims = test.variant_a_claims + test.variant_b_claims;
    const expectedA = (totalClaims / totalImpressions) * test.variant_a_impressions;
    const expectedB = (totalClaims / totalImpressions) * test.variant_b_impressions;

    const chiSquared =
      Math.pow(test.variant_a_claims - expectedA, 2) / expectedA +
      Math.pow(test.variant_b_claims - expectedB, 2) / expectedB;

    const significance = Math.min(chiSquared * 10, 100); // Simplified to 0-100%

    // Determine winner
    let recommendedWinner: 'a' | 'b' | 'inconclusive' = 'inconclusive';
    if (significance > 95) {
      recommendedWinner = conversionRateA > conversionRateB ? 'a' : 'b';
    }

    return {
      test_id: testId,
      variant_a: {
        impressions: test.variant_a_impressions,
        claims: test.variant_a_claims,
        conversion_rate: conversionRateA
      },
      variant_b: {
        impressions: test.variant_b_impressions,
        claims: test.variant_b_claims,
        conversion_rate: conversionRateB
      },
      statistical_significance: significance,
      recommended_winner: recommendedWinner
    };
  }

  // ==========================================================================
  // Phase 4: Offline Support Methods
  // ==========================================================================

  /**
   * Mark claim for offline caching
   * @param claimId - Claim ID
   * @param userId - User ID
   * @returns Offline cache data
   * @phase Phase 4
   */
  async markForOfflineCache(
    claimId: number,
    userId: number
  ): Promise<import('@features/offers/types').OfflineCacheData> {
    // Get claim
    const claimResult = await this.db.query<{
      offer_id: number;
      user_id: number;
      promo_code: string;
    }>(
      'SELECT offer_id, user_id, promo_code FROM offer_claims WHERE id = ?',
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      throw BizError.notFound('Claim', claimId);
    }

    const claim = claimResult.rows[0]!;

    if (claim.user_id !== userId) {
      throw BizError.forbidden('You can only cache your own claims');
    }

    // Get offer details
    const offer = await this.getById(claim.offer_id);
    if (!offer) {
      throw new OfferNotFoundError(claim.offer_id);
    }

    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing) {
      throw BizError.notFound('Listing', offer.listing_id);
    }

    // Generate HMAC signature for offline validation (Phase 4.5.5 enhancement)
    const crypto = require('crypto');
    const secret = process.env.OFFLINE_CACHE_SECRET || 'fallback-secret-for-dev-DO-NOT-USE-IN-PRODUCTION';
    const data = `${claimId}:${claim.promo_code}:${offer.end_date.toISOString()}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');

    // Update offline cache flag
    await this.db.query(
      'UPDATE offers SET offline_code_cached = 1 WHERE id = ?',
      [claim.offer_id]
    );

    return {
      claim_id: claimId,
      promo_code: claim.promo_code,
      offer_title: offer.title,
      business_name: listing.name,
      expires_at: offer.end_date,
      cached_at: new Date(),
      signature
    };
  }

  /**
   * Validate offline redemption
   * @param cacheData - Offline cache data
   * @returns Redemption result
   * @phase Phase 4
   */
  async validateOfflineRedemption(
    cacheData: import('@features/offers/types').OfflineCacheData
  ): Promise<import('@features/offers/types').RedemptionResult> {
    // Verify claim exists and matches promo code
    const claimResult = await this.db.query<{
      id: number;
      offer_id: number;
      promo_code: string;
      status: string;
    }>(
      'SELECT id, offer_id, promo_code, status FROM offer_claims WHERE id = ?',
      [cacheData.claim_id]
    );

    if (claimResult.rows.length === 0) {
      return {
        success: false,
        claimId: cacheData.claim_id,
        redemptionMethod: 'in_app',
        redeemedAt: new Date(),
        message: 'Invalid claim ID'
      };
    }

    const claim = claimResult.rows[0]!;

    if (claim.promo_code !== cacheData.promo_code) {
      return {
        success: false,
        claimId: cacheData.claim_id,
        redemptionMethod: 'in_app',
        redeemedAt: new Date(),
        message: 'Promo code mismatch'
      };
    }

    if (claim.status === 'redeemed') {
      return {
        success: false,
        claimId: cacheData.claim_id,
        redemptionMethod: 'in_app',
        redeemedAt: new Date(),
        message: 'Offer already redeemed'
      };
    }

    // Complete redemption
    await this.db.query(
      `UPDATE offer_claims
       SET status = 'redeemed',
           redeemed_at = NOW(),
           redemption_method = 'in_app'
       WHERE id = ?`,
      [cacheData.claim_id]
    );

    return {
      success: true,
      claimId: cacheData.claim_id,
      redemptionMethod: 'in_app',
      redeemedAt: new Date(),
      message: 'Redemption successful'
    };
  }

  // ==========================================================================
  // Phase 4.5.5: Review System Helper Methods (TD-P4-011)
  // ==========================================================================
  // NOTE: submitReview, getOfferReviews, and canReviewOffer already exist from Phase 4
  // getOfferReviewSummary is the new addition for Phase 4.5.5

  /**
   * Get review summary statistics for an offer
   * @param offerId - Offer ID
   * @returns Review summary or null if no reviews
   * @phase Phase 4.5.5 - TD-P4-011
   */
  async getOfferReviewSummary(
    offerId: number
  ): Promise<import('@features/offers/types').ReviewSummary | null> {
    const summaryResult = await this.db.query<{
      total_reviews: bigint | number;
      average_rating: number | null;
      as_described_count: bigint | number;
      easy_to_redeem_count: bigint | number;
    }>(
      `SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN was_as_described = 1 THEN 1 ELSE 0 END) as as_described_count,
        SUM(CASE WHEN was_easy_to_redeem = 1 THEN 1 ELSE 0 END) as easy_to_redeem_count
       FROM offer_reviews
       WHERE offer_id = ?`,
      [offerId]
    );

    const totalReviews = bigIntToNumber(summaryResult.rows[0]?.total_reviews);

    if (totalReviews === 0) {
      return null;
    }

    const row = summaryResult.rows[0]!;
    const averageRating = row.average_rating || 0;
    const asDescribedCount = bigIntToNumber(row.as_described_count);
    const easyToRedeemCount = bigIntToNumber(row.easy_to_redeem_count);

    // Get rating breakdown
    const breakdownResult = await this.db.query<{
      rating: number;
      count: bigint | number;
    }>(
      `SELECT rating, COUNT(*) as count
       FROM offer_reviews
       WHERE offer_id = ?
       GROUP BY rating`,
      [offerId]
    );

    const ratingsBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    breakdownResult.rows.forEach(row => {
      const rating = row.rating as 1 | 2 | 3 | 4 | 5;
      ratingsBreakdown[rating] = bigIntToNumber(row.count);
    });

    return {
      offer_id: offerId,
      average_rating: Math.round(averageRating * 10) / 10,
      total_reviews: totalReviews,
      ratings_breakdown: ratingsBreakdown,
      as_described_percentage: totalReviews > 0 ? Math.round((asDescribedCount / totalReviews) * 100) : 0,
      easy_to_redeem_percentage: totalReviews > 0 ? Math.round((easyToRedeemCount / totalReviews) * 100) : 0
    };
  }

  // ============================================================================
  // Offer Media Methods
  // ============================================================================

  /**
   * Get all media for an offer, sorted by sort_order
   * @param offerId Offer ID
   * @returns Array of offer media
   */
  async getMedia(offerId: number): Promise<OfferMedia[]> {
    const result: DbResult<OfferMediaRow> = await this.db.query<OfferMediaRow>(
      'SELECT * FROM offer_media WHERE offer_id = ? ORDER BY sort_order ASC',
      [offerId]
    );
    return result.rows.map(row => this.mapRowToOfferMedia(row));
  }

  /**
   * Get single media item by ID
   * @param mediaId Media ID
   * @returns Offer media or null
   */
  async getMediaById(mediaId: number): Promise<OfferMedia | null> {
    const result: DbResult<OfferMediaRow> = await this.db.query<OfferMediaRow>(
      'SELECT * FROM offer_media WHERE id = ?',
      [mediaId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToOfferMedia(row);
  }

  /**
   * Add media to an offer
   * @param offerId Offer ID
   * @param input Media input data
   * @returns Created media
   */
  async addMedia(offerId: number, input: CreateOfferMediaInput): Promise<OfferMedia> {
    // Verify offer exists
    const offer = await this.getById(offerId);
    if (!offer) {
      throw BizError.notFound('Offer', offerId);
    }

    // Check tier limits
    const tierCheck = await this.checkMediaLimit(offerId, input.media_type);
    if (!tierCheck.allowed) {
      throw BizError.badRequest(
        `Media limit reached for ${input.media_type}s (current: ${tierCheck.current}, limit: ${tierCheck.limit}) on tier: ${tierCheck.tier}`
      );
    }

    // Get next sort_order
    const countResult = await this.db.query<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM offer_media WHERE offer_id = ?',
      [offerId]
    );
    const nextOrder = (countResult.rows[0]?.max_order ?? -1) + 1;

    const result = await this.db.query(
      `INSERT INTO offer_media (offer_id, media_type, file_url, sort_order, alt_text, embed_url, platform, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offerId,
        input.media_type,
        input.file_url,
        input.sort_order ?? nextOrder,
        input.alt_text || null,
        input.embed_url || null,
        input.platform || null,
        input.source || null,
      ]
    );

    const created = await this.getMediaById(result.insertId!);
    if (!created) {
      throw BizError.databaseError('add media', new Error('Failed to retrieve created media'));
    }
    return created;
  }

  /**
   * Update media metadata (sort_order, alt_text)
   * @param mediaId Media ID
   * @param input Update data
   * @returns Updated media
   */
  async updateMedia(mediaId: number, input: { sort_order?: number; alt_text?: string }): Promise<OfferMedia> {
    const existing = await this.getMediaById(mediaId);
    if (!existing) {
      throw BizError.notFound('OfferMedia', mediaId);
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(input.sort_order);
    }
    if (input.alt_text !== undefined) {
      updates.push('alt_text = ?');
      params.push(input.alt_text);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(mediaId);
    await this.db.query(`UPDATE offer_media SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await this.getMediaById(mediaId);
    if (!updated) {
      throw BizError.notFound('OfferMedia', mediaId);
    }
    return updated;
  }

  /**
   * Delete media from an offer
   * @param mediaId Media ID
   */
  async deleteMedia(mediaId: number): Promise<void> {
    const existing = await this.getMediaById(mediaId);
    if (!existing) {
      throw BizError.notFound('OfferMedia', mediaId);
    }
    await this.db.query('DELETE FROM offer_media WHERE id = ?', [mediaId]);
  }

  /**
   * Reorder media items
   * @param offerId Offer ID
   * @param mediaIds Array of media IDs in desired order
   */
  async reorderMedia(offerId: number, mediaIds: number[]): Promise<void> {
    // Verify offer exists
    const offer = await this.getById(offerId);
    if (!offer) {
      throw BizError.notFound('Offer', offerId);
    }

    // Update sort_order for each media item
    for (let i = 0; i < mediaIds.length; i++) {
      await this.db.query(
        'UPDATE offer_media SET sort_order = ? WHERE id = ? AND offer_id = ?',
        [i, mediaIds[i], offerId]
      );
    }
  }

  /**
   * Check if offer can add more media based on tier limits
   * @param offerId Offer ID
   * @param mediaType image or video
   */
  async checkMediaLimit(offerId: number, mediaType: 'image' | 'video'): Promise<OfferMediaLimitCheckResult> {
    const offer = await this.getById(offerId);
    if (!offer) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }

    const listing = await this.listingService.getById(offer.listing_id);
    if (!listing) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }

    const tier = listing.tier || 'essentials';
    const limit: number = mediaType === 'image'
      ? (OFFER_TIER_IMAGE_LIMITS[tier] ?? OFFER_TIER_IMAGE_LIMITS['essentials'] ?? 1)
      : (OFFER_TIER_VIDEO_LIMITS[tier] ?? OFFER_TIER_VIDEO_LIMITS['essentials'] ?? 0);

    // Count current media of this type
    const countResult = await this.db.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM offer_media WHERE offer_id = ? AND media_type = ?',
      [offerId, mediaType]
    );
    const current = bigIntToNumber(countResult.rows[0]?.count);

    // -1 means unlimited
    const unlimited = limit === -1;
    const allowed = unlimited || current < limit;

    return { allowed, current, limit, unlimited, tier };
  }

  /**
   * Get media limits for an offer (for UI display)
   * @param offerId Offer ID
   * @returns Current and limit counts for images and videos
   */
  async getMediaLimits(offerId: number): Promise<OfferMediaLimits> {
    const imageCheck = await this.checkMediaLimit(offerId, 'image');
    const videoCheck = await this.checkMediaLimit(offerId, 'video');

    return {
      images: {
        current: imageCheck.current,
        limit: imageCheck.limit,
        unlimited: imageCheck.unlimited,
      },
      videos: {
        current: videoCheck.current,
        limit: videoCheck.limit,
        unlimited: videoCheck.unlimited,
      },
    };
  }

  /**
   * Map database row to OfferMedia object
   */
  private mapRowToOfferMedia(row: OfferMediaRow): OfferMedia {
    return {
      id: row.id,
      offer_id: row.offer_id,
      media_type: row.media_type,
      file_url: row.file_url,
      sort_order: row.sort_order,
      alt_text: row.alt_text,
      embed_url: row.embed_url,
      platform: row.platform,
      source: row.source,
      thumbnail_url: row.thumbnail_url,
      created_at: new Date(row.created_at),
    };
  }
}
