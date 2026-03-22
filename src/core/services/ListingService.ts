/**
 * ListingService - Listing Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - UMM integration for media operations
 * - Tier enforcement at service layer
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @phase Phase 4 - Task 4.2: ListingService Implementation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { CategoryService } from '@core/services/CategoryService';
import { MediaService, MediaFile } from '@core/services/media/MediaService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { ListingRow } from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import { getEffectiveLimits } from '@core/utils/billing/tierLimitsCache';
import type { ListingSectionLayout } from '@features/listings/types/listing-section-layout';
import { getListingNotificationService } from '@core/services/ServiceRegistry';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Listing {
  id: number;
  user_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  year_established: number | null;
  employee_count: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  category_id: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_images: string[]; // Parsed from JSON
  video_gallery: string[]; // Parsed from JSON - tier-limited video URLs
  video_url: string | null;
  audio_url: string | null;
  business_hours: BusinessHour[] | null; // Parsed from JSON
  social_media: SocialMedia | null; // Parsed from JSON
  features: string[] | null; // Parsed from JSON
  amenities: string[] | null; // Parsed from JSON
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  add_ons: string[] | null; // Parsed from JSON
  claimed: boolean;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | 'paused';
  approved: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  admin_reviewer_id: number | null;
  admin_notes: string | null;
  admin_decision_at: Date | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  custom_fields: Record<string, unknown> | null; // Parsed from JSON
  metadata: Record<string, unknown> | null; // Parsed from JSON
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  annual_revenue: number | null;
  certifications: string[] | null; // Parsed from JSON
  languages_spoken: string[] | null; // Parsed from JSON
  payment_methods: string[] | null; // Parsed from JSON
  view_count: number;
  click_count: number;
  favorite_count: number;
  import_source: string | null;
  import_date: Date | null;
  import_batch_id: string | null;
  mock: boolean;
  keywords: string[] | null; // Parsed from JSON
  slogan: string | null;
  active_categories: number[] | null; // Parsed from JSON - ALL active category IDs
  bank_categories: number[] | null; // Parsed from JSON - Bank/reserve category IDs
  section_layout: ListingSectionLayout | null; // Parsed from JSON - Page layout configuration
  gallery_layout: 'grid' | 'masonry' | 'carousel' | 'justified' | null; // ENUM - Gallery display layout preference
  video_gallery_layout: 'grid' | 'masonry' | 'carousel' | 'inline' | 'showcase' | null; // ENUM - Video gallery display layout
  combine_video_gallery: boolean; // Whether to combine video gallery with image gallery
  is_featured: boolean; // Admin-controlled featured flag
  date_created: Date;
  last_update: Date;
  created_at: Date;
  updated_at: Date;
}

export interface BusinessHour {
  day: string;
  open: string;
  close: string;
}

export interface SocialMedia {
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
}

export interface CreateListingInput {
  name: string;
  slug?: string;
  description?: string;
  type: string;
  tier?: Listing['tier'];
  year_established?: number;
  employee_count?: number;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  category_id?: number;
  business_hours?: BusinessHour[];
  social_media?: SocialMedia;
  features?: string[];
  amenities?: string[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  annual_revenue?: number;
  certifications?: string[];
  languages_spoken?: string[];
  payment_methods?: string[];
  slogan?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  keywords?: string[];
  is_mock?: boolean;
  // Category storage
  active_categories?: number[]; // ALL active category IDs as JSON array
  bank_categories?: number[];   // ONLY bank/reserve category IDs
  // Admin-only fields for direct assignment
  claimed?: boolean;
  approved?: Listing['approved'];
}

export interface UpdateListingInput {
  name?: string;
  slug?: string;
  description?: string;
  type?: string;
  year_established?: number;
  employee_count?: number;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  category_id?: number;
  business_hours?: BusinessHour[];
  social_media?: SocialMedia;
  features?: string[];
  amenities?: string[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  annual_revenue?: number;
  certifications?: string[];
  languages_spoken?: string[];
  payment_methods?: string[];
  slogan?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  keywords?: string[];
  status?: Listing['status'];
  claimed?: boolean;
  approved?: Listing['approved'];
}

export interface ListingFilters {
  userId?: number;
  categoryId?: number;
  type?: string;
  tier?: Listing['tier'];
  status?: Listing['status'];
  approved?: Listing['approved'];
  city?: string;
  state?: string;
  isFeatured?: boolean;
  isMock?: boolean;
  searchQuery?: string;
  // Sorting parameters - server-side sorting for full database ordering
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

export interface ListingLimits {
  categories: number;
  images: number;
  videos: number;
  offers: number;
  events: number;
  projects: number;
  jobPostings: number;
}

export interface TierCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  unlimited?: boolean;
  tier?: Listing['tier'];
}

export interface ListingStats {
  views: number;
  clicks: number;
  favorites: number;
  reviews: number;
  averageRating: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export enum ListingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

/** Phase 4A: Additional listing lifecycle statuses */
export const LISTING_STATUS_DRAFT = 'draft' as const;
export const LISTING_STATUS_PAUSED = 'paused' as const;

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ListingNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'LISTING_NOT_FOUND',
      message: `Listing not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested listing was not found'
    });
  }
}

export class UnauthorizedAccessError extends BizError {
  constructor(userId: number, listingId: number) {
    super({
      code: 'UNAUTHORIZED_ACCESS',
      message: `User ${userId} is not authorized to access listing ${listingId}`,
      context: { userId, listingId },
      userMessage: 'You do not have permission to perform this action'
    });
  }
}

export class TierLimitExceededError extends BizError {
  constructor(feature: string, tier: string, limit: number) {
    super({
      code: 'TIER_LIMIT_EXCEEDED',
      message: `${feature} limit exceeded for tier ${tier} (limit: ${limit})`,
      context: { feature, tier, limit },
      userMessage: `You have reached the ${feature} limit for your ${tier} tier`
    });
  }
}

export class DuplicateSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_SLUG',
      message: `Listing slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'A listing with this URL slug already exists'
    });
  }
}

export class InvalidListingStatusError extends BizError {
  constructor(currentStatus: string, targetStatus: string) {
    super({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      context: { currentStatus, targetStatus },
      userMessage: 'Invalid status transition'
    });
  }
}

export class CategoryLimitExceededError extends BizError {
  constructor(tier: string, limit: number) {
    super({
      code: 'CATEGORY_LIMIT_EXCEEDED',
      message: `Category limit exceeded for tier ${tier} (limit: ${limit})`,
      context: { tier, limit },
      userMessage: `You have reached the category limit for your ${tier} tier`
    });
  }
}

export class MediaLimitExceededError extends BizError {
  constructor(mediaType: string, tier: string, limit: number) {
    super({
      code: 'MEDIA_LIMIT_EXCEEDED',
      message: `${mediaType} limit exceeded for tier ${tier} (limit: ${limit})`,
      context: { mediaType, tier, limit },
      userMessage: `You have reached the ${mediaType} limit for your ${tier} tier`
    });
  }
}

// ============================================================================
// ListingService Implementation
// ============================================================================

export class ListingService {
  private db: DatabaseService;
  private mediaService: MediaService;
  private categoryService: CategoryService;

  // FALLBACK: Used when DB is unavailable. Primary source: subscription_plans.features via tierLimitsCache
  private readonly TIER_LIMITS: Record<Listing['tier'], ListingLimits> = {
    essentials: {
      categories: 6,
      images: 6,
      videos: 1,
      offers: 4,
      events: 4,
      projects: 0,
      jobPostings: 0
    },
    plus: {
      categories: 12,
      images: 12,
      videos: 10,
      offers: 10,
      events: 10,
      projects: 0,
      jobPostings: 5
    },
    preferred: {
      categories: 20,
      images: 100,
      videos: 50,
      offers: 50,
      events: 50,
      projects: 50,
      jobPostings: 50
    },
    premium: {
      categories: 999999, // Unlimited
      images: 100,
      videos: 50,
      offers: 50,
      events: 50,
      projects: 50,
      jobPostings: 999999 // Unlimited
    }
  };

  constructor(
    db: DatabaseService,
    mediaService: MediaService,
    categoryService: CategoryService
  ) {
    this.db = db;
    this.mediaService = mediaService;
    this.categoryService = categoryService;
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  /**
   * Get all listings with optional filters and pagination
   * @param filters Optional filters
   * @param pagination Optional pagination parameters
   * @returns Paginated result of listings
   */
  async getAll(
    filters?: ListingFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Listing>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM listings';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.userId !== undefined) {
        conditions.push('user_id = ?');
        params.push(filters.userId);
      }

      if (filters.categoryId !== undefined) {
        conditions.push('category_id = ?');
        params.push(filters.categoryId);
      }

      if (filters.type !== undefined) {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      if (filters.tier !== undefined) {
        conditions.push('tier = ?');
        params.push(filters.tier);
      }

      if (filters.status !== undefined) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.approved !== undefined) {
        conditions.push('approved = ?');
        params.push(filters.approved);
      }

      if (filters.city !== undefined) {
        conditions.push('city = ?');
        params.push(filters.city);
      }

      if (filters.state !== undefined) {
        conditions.push('state = ?');
        params.push(filters.state);
      }

      if (filters.isMock !== undefined) {
        conditions.push('mock = ?');
        params.push(filters.isMock ? 1 : 0);
      }

      if (filters.searchQuery) {
        conditions.push('(name LIKE ? OR description LIKE ?)');
        params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM listings${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{total: bigint | number}> = await this.db.query<{total: bigint | number}>(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Server-side sorting - whitelist of sortable columns to prevent SQL injection
    const sortableColumns: Record<string, string> = {
      'id': 'id',
      'name': 'name',
      'type': 'type',
      'tier': 'tier',
      'status': 'status',
      'approved': 'approved',
      'claimed': 'claimed',
      'mock': 'mock',
      'category_id': 'category_id',
      'user_id': 'user_id',
      'last_update': 'last_update',
      'created_at': 'created_at'
    };

    // Determine sort column and direction
    const sortColumn = filters?.sortBy && sortableColumns[filters.sortBy]
      ? sortableColumns[filters.sortBy]
      : 'created_at';
    const sortDirection = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get paginated data with dynamic ORDER BY
    sql += ` ORDER BY ${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result: DbResult<ListingRow> = await this.db.query<ListingRow>(sql, params);

    return {
      data: result.rows.map(this.mapRowToListing),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get listing by ID
   * @param id Listing ID
   * @returns Listing or null if not found
   */
  async getById(id: number): Promise<Listing | null> {
    const result: DbResult<ListingRow> = await this.db.query<ListingRow>(
      'SELECT * FROM listings WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToListing(row);
  }

  /**
   * Get listing by slug
   * @param slug Listing slug
   * @returns Listing or null if not found
   */
  async getBySlug(slug: string): Promise<Listing | null> {
    const result: DbResult<ListingRow> = await this.db.query<ListingRow>(
      'SELECT * FROM listings WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToListing(row);
  }

  /**
   * Get all listings by user ID
   * @param userId User ID
   * @returns Array of listings
   */
  async getByUserId(userId: number): Promise<Listing[]> {
    const result: DbResult<ListingRow> = await this.db.query<ListingRow>(
      'SELECT * FROM listings WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(this.mapRowToListing);
  }

  /**
   * Get listings by category with pagination
   * @param categoryId Category ID
   * @param pagination Pagination parameters
   * @returns Paginated result
   */
  async getByCategory(
    categoryId: number,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Listing>> {
    return this.getAll({ categoryId }, pagination);
  }

  /**
   * Get featured listings
   * @param limit Optional limit (default: 10)
   * @returns Array of featured listings
   */
  async getFeatured(limit: number = 10): Promise<Listing[]> {
    const result: DbResult<ListingRow> = await this.db.query<ListingRow>(
      `SELECT * FROM listings
       WHERE status = 'active' AND approved = 'approved'
       ORDER BY is_featured DESC, view_count DESC, favorite_count DESC
       LIMIT ?`,
      [limit]
    );

    return result.rows.map(this.mapRowToListing);
  }

  /**
   * Get sub-entity counts for a listing (events, offers, job postings)
   * Used for JSON-LD enrichment and SearchResultBadges display
   * @param listingId - Listing ID
   * @returns Object with jobCount, eventCount, offerCount
   */
  async getSubEntityCounts(listingId: number): Promise<{
    jobCount: number;
    eventCount: number;
    offerCount: number;
  }> {
    const [eventsResult, offersResult, jobsResult] = await Promise.all([
      this.db.query<{ cnt: bigint | number }>(
        `SELECT COUNT(*) AS cnt FROM events WHERE listing_id = ? AND status = 'active'`,
        [listingId]
      ),
      this.db.query<{ cnt: bigint | number }>(
        `SELECT COUNT(*) AS cnt FROM offers WHERE listing_id = ? AND status = 'active'`,
        [listingId]
      ),
      this.db.query<{ cnt: bigint | number }>(
        `SELECT COUNT(*) AS cnt FROM job_postings WHERE business_id = ? AND status = 'active'`,
        [listingId]
      ),
    ]);

    return {
      eventCount: bigIntToNumber(eventsResult.rows[0]?.cnt ?? 0),
      offerCount: bigIntToNumber(offersResult.rows[0]?.cnt ?? 0),
      jobCount: bigIntToNumber(jobsResult.rows[0]?.cnt ?? 0),
    };
  }

  /**
   * Get cross-feature completeness bonus scoring for a listing
   * Extends base completeness with bonuses for having events, jobs, and offers
   * @param listingId - Listing ID
   * @returns Cross-feature completeness data with suggestions
   */
  async getCrossFeatureCompleteness(listingId: number): Promise<{
    subEntityCounts: { jobCount: number; eventCount: number; offerCount: number };
    bonusPoints: number;
    maxBonusPoints: number;
    suggestions: Array<{ type: string; message: string; href: string; boostPercent: number }>;
  }> {
    const counts = await this.getSubEntityCounts(listingId);

    const suggestions: Array<{ type: string; message: string; href: string; boostPercent: number }> = [];
    let bonusPoints = 0;
    const maxBonusPoints = 15; // 5% events + 5% jobs + 3% offers + 2% reviews

    if (counts.eventCount > 0) {
      bonusPoints += 5;
    } else {
      suggestions.push({
        type: 'event',
        message: 'Add an event to boost engagement by 5%',
        href: '/dashboard/listings/[listingId]/events',
        boostPercent: 5
      });
    }

    if (counts.jobCount > 0) {
      bonusPoints += 5;
    } else {
      suggestions.push({
        type: 'job',
        message: 'Post a job to get the Hiring badge and boost by 5%',
        href: '/dashboard/listings/[listingId]/jobs',
        boostPercent: 5
      });
    }

    if (counts.offerCount > 0) {
      bonusPoints += 3;
    } else {
      suggestions.push({
        type: 'offer',
        message: 'Create an offer to attract customers (+3%)',
        href: '/dashboard/listings/[listingId]/offers',
        boostPercent: 3
      });
    }

    // Check for reviews
    const reviewResult = await this.db.query<{ cnt: bigint | number }>(
      `SELECT COUNT(*) AS cnt FROM reviews WHERE listing_id = ? AND status = 'approved'`,
      [listingId]
    );
    const reviewCount = bigIntToNumber(reviewResult.rows[0]?.cnt ?? 0);

    if (reviewCount > 0) {
      bonusPoints += 2;
    } else {
      suggestions.push({
        type: 'review',
        message: 'Get your first review for a 2% completeness boost',
        href: '/dashboard/listings/[listingId]/reviews',
        boostPercent: 2
      });
    }

    return {
      subEntityCounts: counts,
      bonusPoints,
      maxBonusPoints,
      suggestions
    };
  }

  /**
   * Get category average metrics for benchmarking a listing against its peers
   * Computes average views, engagements, and conversions for all listings in the same category
   * @param listingId - Listing ID to benchmark
   * @returns Category averages and listing's own metrics for comparison
   */
  async getCategoryAverages(listingId: number): Promise<{
    listingMetrics: { views: number; engagements: number; conversions: number };
    categoryMetrics: { views: number; engagements: number; conversions: number; listingCount: number };
    categoryName: string;
  }> {
    // Get listing's category
    const listingResult = await this.db.query<{ category_id: number | null }>(
      'SELECT category_id FROM listings WHERE id = ?',
      [listingId]
    );
    const categoryId = listingResult.rows[0]?.category_id;

    // Get category name
    let categoryName = 'All Listings';
    if (categoryId) {
      const catResult = await this.db.query<{ name: string }>(
        'SELECT name FROM categories WHERE id = ?',
        [categoryId]
      );
      categoryName = catResult.rows[0]?.name ?? 'All Listings';
    }

    // Get this listing's metrics from listing_analytics_daily (last 30 days)
    const listingMetricsResult = await this.db.query<{
      total_views: bigint | number;
      total_engagements: bigint | number;
      total_conversions: bigint | number;
    }>(
      `SELECT
         COALESCE(SUM(page_views), 0) AS total_views,
         COALESCE(SUM(engagements), 0) AS total_engagements,
         COALESCE(SUM(conversions), 0) AS total_conversions
       FROM listing_analytics_daily
       WHERE listing_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [listingId]
    );
    const lm = listingMetricsResult.rows[0];

    // Get category average metrics (all listings in same category, last 30 days)
    const categoryQuery = categoryId
      ? `SELECT
           COALESCE(AVG(sub.total_views), 0) AS avg_views,
           COALESCE(AVG(sub.total_engagements), 0) AS avg_engagements,
           COALESCE(AVG(sub.total_conversions), 0) AS avg_conversions,
           COUNT(*) AS listing_count
         FROM (
           SELECT
             lad.listing_id,
             SUM(lad.page_views) AS total_views,
             SUM(lad.engagements) AS total_engagements,
             SUM(lad.conversions) AS total_conversions
           FROM listing_analytics_daily lad
           JOIN listings l ON l.id = lad.listing_id
           WHERE l.category_id = ? AND lad.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY lad.listing_id
         ) sub`
      : `SELECT
           COALESCE(AVG(sub.total_views), 0) AS avg_views,
           COALESCE(AVG(sub.total_engagements), 0) AS avg_engagements,
           COALESCE(AVG(sub.total_conversions), 0) AS avg_conversions,
           COUNT(*) AS listing_count
         FROM (
           SELECT
             listing_id,
             SUM(page_views) AS total_views,
             SUM(engagements) AS total_engagements,
             SUM(conversions) AS total_conversions
           FROM listing_analytics_daily
           WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY listing_id
         ) sub`;

    const categoryParams = categoryId ? [categoryId] : [];
    const categoryResult = await this.db.query<{
      avg_views: number;
      avg_engagements: number;
      avg_conversions: number;
      listing_count: bigint | number;
    }>(categoryQuery, categoryParams);
    const cm = categoryResult.rows[0];

    return {
      listingMetrics: {
        views: bigIntToNumber(lm?.total_views ?? 0),
        engagements: bigIntToNumber(lm?.total_engagements ?? 0),
        conversions: bigIntToNumber(lm?.total_conversions ?? 0),
      },
      categoryMetrics: {
        views: Math.round(Number(cm?.avg_views ?? 0)),
        engagements: Math.round(Number(cm?.avg_engagements ?? 0)),
        conversions: Math.round(Number(cm?.avg_conversions ?? 0)),
        listingCount: bigIntToNumber(cm?.listing_count ?? 0),
      },
      categoryName,
    };
  }

  /**
   * Search listings by query with filters
   * @param query Search query
   * @param filters Optional filters
   * @param pagination Optional pagination
   * @returns Paginated search results
   */
  async search(
    query: string,
    filters?: ListingFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Listing>> {
    return this.getAll({ ...filters, searchQuery: query }, pagination);
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new listing
   * @param userId Owner user ID
   * @param data Listing data
   * @returns Created listing
   */
  async create(userId: number, data: CreateListingInput): Promise<Listing> {
    // Generate slug if not provided
    const slug = data.slug || (await this.generateSlug(data.name));

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError(slug);
    }

    // Validate category exists
    if (data.category_id) {
      const category = await this.categoryService.getById(data.category_id);
      if (!category) {
        throw BizError.notFound('Category', data.category_id);
      }
    }

    // Prepare JSON fields
    const galleryImages = JSON.stringify([]);
    const businessHours = data.business_hours
      ? JSON.stringify(data.business_hours)
      : null;
    const socialMedia = data.social_media
      ? JSON.stringify(data.social_media)
      : null;
    const features = data.features ? JSON.stringify(data.features) : null;
    const amenities = data.amenities ? JSON.stringify(data.amenities) : null;
    const addOns = JSON.stringify([]);
    const customFields = JSON.stringify({});
    const metadata = JSON.stringify({});
    const certifications = data.certifications
      ? JSON.stringify(data.certifications)
      : null;
    const languagesSpoken = data.languages_spoken
      ? JSON.stringify(data.languages_spoken)
      : null;
    const paymentMethods = data.payment_methods
      ? JSON.stringify(data.payment_methods)
      : null;
    const keywords = data.keywords ? JSON.stringify(data.keywords) : null;
    // active_categories stores ALL active category IDs as JSON array
    const activeCategories = data.active_categories ? JSON.stringify(data.active_categories) : null;
    // bank_categories stores ONLY the bank/reserve category IDs
    const bankCategories = data.bank_categories ? JSON.stringify(data.bank_categories) : null;

    // Insert listing
    const result: DbResult<ListingRow> = await this.db.query<ListingRow>(
      `INSERT INTO listings (
        user_id, name, slug, description, type, tier,
        year_established, employee_count, email, phone, website,
        address, city, state, zip_code, country,
        latitude, longitude, category_id, active_categories, bank_categories,
        gallery_images, business_hours, social_media,
        features, amenities, add_ons, custom_fields, metadata,
        contact_name, contact_email, contact_phone,
        annual_revenue, certifications, languages_spoken, payment_methods,
        slogan, meta_title, meta_description, meta_keywords, keywords,
        claimed, status, approved, mock
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )`,
      [
        userId,
        data.name,
        slug,
        data.description || null,
        data.type,
        data.tier || 'essential',
        data.year_established || null,
        data.employee_count || null,
        data.email || null,
        data.phone || null,
        data.website || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.country || 'US',
        data.latitude || null,
        data.longitude || null,
        data.category_id || null,
        activeCategories,
        bankCategories,
        galleryImages,
        businessHours,
        socialMedia,
        features,
        amenities,
        addOns,
        customFields,
        metadata,
        data.contact_name || null,
        data.contact_email || null,
        data.contact_phone || null,
        data.annual_revenue || null,
        certifications,
        languagesSpoken,
        paymentMethods,
        data.slogan || null,
        data.meta_title || null,
        data.meta_description || null,
        data.meta_keywords || null,
        keywords,
        data.claimed !== undefined ? data.claimed : false, // claimed - default false unless admin-assigned
        'pending', // status
        data.approved || 'pending', // approved - can be set by admin
        data.is_mock ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create listing',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create listing',
        new Error('Failed to retrieve created listing')
      );
    }

    // Send notifications (non-blocking)
    // 1. User confirmation email
    getListingNotificationService()
      .sendListingSubmitted(userId, created.id, created.name)
      .catch(() => {});

    // 2. Admin alert
    const user = await this.getUserInfo(userId);
    const category = data.category_id
      ? await this.categoryService.getById(data.category_id)
      : null;

    getListingNotificationService()
      .sendAdminNewListingAlert(
        created.id,
        created.name,
        user?.display_name || user?.first_name || 'Unknown',
        user?.email || 'No email',
        category?.name || 'Uncategorized'
      )
      .catch(() => {});

    return created;
  }

  /**
   * Update a listing
   * @param id Listing ID
   * @param userId User ID (for ownership verification)
   * @param data Update data
   * @returns Updated listing
   */
  async update(
    id: number,
    userId: number,
    data: UpdateListingInput
  ): Promise<Listing> {
    // Check listing exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new ListingNotFoundError(id);
    }

    // Verify ownership (owner or admin)
    if (existing.user_id !== userId) {
      // TODO: Check if user is admin
      throw new UnauthorizedAccessError(userId, id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateSlugError(data.slug);
      }
    }

    // Validate category if being updated
    if (data.category_id) {
      const category = await this.categoryService.getById(data.category_id);
      if (!category) {
        throw BizError.notFound('Category', data.category_id);
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.type !== undefined) {
      updates.push('type = ?');
      params.push(data.type);
    }

    if (data.year_established !== undefined) {
      updates.push('year_established = ?');
      params.push(data.year_established);
    }

    if (data.employee_count !== undefined) {
      updates.push('employee_count = ?');
      params.push(data.employee_count);
    }

    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }

    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }

    if (data.website !== undefined) {
      updates.push('website = ?');
      params.push(data.website);
    }

    if (data.address !== undefined) {
      updates.push('address = ?');
      params.push(data.address);
    }

    if (data.city !== undefined) {
      updates.push('city = ?');
      params.push(data.city);
    }

    if (data.state !== undefined) {
      updates.push('state = ?');
      params.push(data.state);
    }

    if (data.zip_code !== undefined) {
      updates.push('zip_code = ?');
      params.push(data.zip_code);
    }

    if (data.country !== undefined) {
      updates.push('country = ?');
      params.push(data.country);
    }

    if (data.latitude !== undefined) {
      updates.push('latitude = ?');
      params.push(data.latitude);
    }

    if (data.longitude !== undefined) {
      updates.push('longitude = ?');
      params.push(data.longitude);
    }

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(data.category_id);
    }

    if (data.business_hours !== undefined) {
      updates.push('business_hours = ?');
      params.push(JSON.stringify(data.business_hours));
    }

    if (data.social_media !== undefined) {
      updates.push('social_media = ?');
      params.push(JSON.stringify(data.social_media));
    }

    if (data.features !== undefined) {
      updates.push('features = ?');
      params.push(JSON.stringify(data.features));
    }

    if (data.amenities !== undefined) {
      updates.push('amenities = ?');
      params.push(JSON.stringify(data.amenities));
    }

    if (data.contact_name !== undefined) {
      updates.push('contact_name = ?');
      params.push(data.contact_name);
    }

    if (data.contact_email !== undefined) {
      updates.push('contact_email = ?');
      params.push(data.contact_email);
    }

    if (data.contact_phone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(data.contact_phone);
    }

    if (data.annual_revenue !== undefined) {
      updates.push('annual_revenue = ?');
      params.push(data.annual_revenue);
    }

    if (data.certifications !== undefined) {
      updates.push('certifications = ?');
      params.push(JSON.stringify(data.certifications));
    }

    if (data.languages_spoken !== undefined) {
      updates.push('languages_spoken = ?');
      params.push(JSON.stringify(data.languages_spoken));
    }

    if (data.payment_methods !== undefined) {
      updates.push('payment_methods = ?');
      params.push(JSON.stringify(data.payment_methods));
    }

    if (data.slogan !== undefined) {
      updates.push('slogan = ?');
      params.push(data.slogan);
    }

    if (data.meta_title !== undefined) {
      updates.push('meta_title = ?');
      params.push(data.meta_title);
    }

    if (data.meta_description !== undefined) {
      updates.push('meta_description = ?');
      params.push(data.meta_description);
    }

    if (data.meta_keywords !== undefined) {
      updates.push('meta_keywords = ?');
      params.push(data.meta_keywords);
    }

    if (data.keywords !== undefined) {
      updates.push('keywords = ?');
      params.push(JSON.stringify(data.keywords));
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    params.push(id);

    await this.db.query(
      `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update listing',
        new Error('Failed to retrieve updated listing')
      );
    }

    return updated;
  }

  /**
   * Delete a listing
   * @param id Listing ID
   * @param userId User ID (for ownership verification)
   */
  async delete(id: number, userId: number): Promise<void> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }

    // Verify ownership
    if (listing.user_id !== userId) {
      throw new UnauthorizedAccessError(userId, id);
    }

    await this.db.query('DELETE FROM listings WHERE id = ?', [id]);
  }

  /**
   * Update listing status
   * @param id Listing ID
   * @param status New status
   * @returns Updated listing
   */
  async updateStatus(id: number, status: ListingStatus): Promise<Listing> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }

    await this.db.query('UPDATE listings SET status = ? WHERE id = ?', [
      status,
      id
    ]);

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update listing status',
        new Error('Failed to retrieve updated listing')
      );
    }

    return updated;
  }

  // ==========================================================================
  // TIER ENFORCEMENT Operations
  // ==========================================================================

  /**
   * Get actual feature count for a listing.
   * Replaces hardcoded currentCount = 0 placeholders.
   *
   * @param listingId - Listing ID
   * @param feature   - Feature key to count
   * @returns Current count of that feature for the listing
   */
  private async getFeatureCount(listingId: number, feature: string): Promise<number> {
    try {
      switch (feature) {
        case 'categories': {
          // categories is a single category_id column on the listing row
          const result = await this.db.query<{ c: bigint | number }>(
            'SELECT COUNT(category_id) as c FROM listings WHERE id = ? AND category_id IS NOT NULL',
            [listingId]
          );
          return bigIntToNumber(result.rows[0]?.c ?? 0);
        }
        case 'images': {
          const result = await this.db.query<{ c: bigint | number }>(
            "SELECT COUNT(*) as c FROM entity_media_relationships WHERE entity_type = 'listing' AND entity_id = ?",
            [listingId]
          );
          return bigIntToNumber(result.rows[0]?.c ?? 0);
        }
        case 'offers': {
          const result = await this.db.query<{ c: bigint | number }>(
            "SELECT COUNT(*) as c FROM offers WHERE listing_id = ? AND status != 'archived'",
            [listingId]
          );
          return bigIntToNumber(result.rows[0]?.c ?? 0);
        }
        case 'events': {
          const result = await this.db.query<{ c: bigint | number }>(
            "SELECT COUNT(*) as c FROM events WHERE listing_id = ? AND status != 'cancelled'",
            [listingId]
          );
          return bigIntToNumber(result.rows[0]?.c ?? 0);
        }
        default:
          return 0;
      }
    } catch {
      return 0; // Fail open — allow by default if count query fails
    }
  }

  /**
   * Check if user can perform action based on tier limits
   * @param userId User ID (legacy) or listing ID depending on call site
   * @param feature Feature to check
   * @returns Tier check result
   */
  async checkTierLimit(
    userId: number,
    feature: keyof ListingLimits
  ): Promise<TierCheckResult> {
    // userId here is treated as a listingId for DB-driven checks.
    // Legacy callers passing userId will get the first listing's limit via getByUserId fallback.
    const listingId = userId;

    const listing = await this.getById(listingId);
    if (!listing) {
      // Fallback: treat argument as userId and get first listing
      const listings = await this.getByUserId(listingId);
      const tier = listings[0]?.tier ?? 'essentials';
      return {
        allowed: true,
        current: 0,
        limit: this.TIER_LIMITS[tier][feature],
        unlimited: false,
        tier
      };
    }

    // Try DB-driven limits first, fallback to hardcoded
    let limits: Record<string, number | boolean | undefined>;
    try {
      const effectiveLimits = await getEffectiveLimits(listingId, this.db);
      limits = effectiveLimits as unknown as Record<string, number | boolean | undefined>;
    } catch {
      limits = this.TIER_LIMITS[listing.tier] as unknown as Record<string, number | boolean | undefined>;
    }

    const limit = limits[feature as string];

    if (limit === undefined || typeof limit === 'boolean') {
      return { allowed: true, current: 0, limit: 0, unlimited: true, tier: listing.tier };
    }

    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1, unlimited: true, tier: listing.tier };
    }

    const current = await this.getFeatureCount(listingId, feature as string);
    const numLimit = typeof limit === 'number' ? limit : 0;

    return {
      allowed: current < numLimit,
      current,
      limit: numLimit,
      unlimited: false,
      tier: listing.tier
    };
  }

  /**
   * Check if listing can add another category
   * @param listingId Listing ID
   * @returns True if allowed
   */
  async canAddCategory(listingId: number): Promise<boolean> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const limit = this.TIER_LIMITS[listing.tier].categories;

    // Count current categories (placeholder)
    const currentCount = listing.category_id ? 1 : 0;

    return currentCount < limit;
  }

  /**
   * Check if listing can add another image
   * @param listingId Listing ID
   * @returns True if allowed
   */
  async canAddImage(listingId: number): Promise<boolean> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const limit = this.TIER_LIMITS[listing.tier].images;
    const currentCount = listing.gallery_images.length;

    return currentCount < limit;
  }

  /**
   * Check if listing can add another video
   * @param listingId Listing ID
   * @returns True if allowed
   */
  async canAddVideo(listingId: number): Promise<boolean> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const limit = this.TIER_LIMITS[listing.tier].videos;

    // Count current videos (placeholder)
    const currentCount = listing.video_url ? 1 : 0;

    return currentCount < limit;
  }

  /**
   * Check if listing can add another offer
   * @param listingId Listing ID
   * @returns True if allowed
   */
  async canAddOffer(listingId: number): Promise<boolean> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const limit = this.TIER_LIMITS[listing.tier].offers;

    const currentCount = await this.getFeatureCount(listingId, 'offers');

    return currentCount < limit;
  }

  /**
   * Check if listing can add another event
   * @param listingId Listing ID
   * @returns True if allowed
   */
  async canAddEvent(listingId: number): Promise<boolean> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const limit = this.TIER_LIMITS[listing.tier].events;

    const currentCount = await this.getFeatureCount(listingId, 'events');

    return currentCount < limit;
  }

  // ==========================================================================
  // MEDIA INTEGRATION Operations
  // ==========================================================================

  /**
   * Update listing logo
   * @param listingId Listing ID
   * @param file File buffer
   * @returns MediaFile
   */
  async updateLogo(
    listingId: number,
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaFile> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const mediaFile = await this.mediaService.uploadMedia({
      entityType: 'listing',
      entityId: listingId,
      mediaType: 'logo',
      listingTier: listing.tier as 'essentials' | 'preferred' | 'premium' | 'plus' | undefined,
      file,
      filename,
      mimeType
    });

    // Update listing logo_url
    await this.db.query('UPDATE listings SET logo_url = ? WHERE id = ?', [
      mediaFile.url,
      listingId
    ]);

    return mediaFile;
  }

  /**
   * Update listing cover image
   * @param listingId Listing ID
   * @param file File buffer
   * @returns MediaFile
   */
  async updateCover(
    listingId: number,
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaFile> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    const mediaFile = await this.mediaService.uploadMedia({
      entityType: 'listing',
      entityId: listingId,
      mediaType: 'cover',
      listingTier: listing.tier as 'essentials' | 'preferred' | 'premium' | 'plus' | undefined,
      file,
      filename,
      mimeType
    });

    // Update listing cover_image_url
    await this.db.query(
      'UPDATE listings SET cover_image_url = ? WHERE id = ?',
      [mediaFile.url, listingId]
    );

    return mediaFile;
  }

  /**
   * Update listing logo URL directly (for UMM-uploaded files)
   * @param listingId Listing ID
   * @param logoUrl Cloudinary URL from /api/media/upload
   */
  async updateLogoUrl(listingId: number, logoUrl: string): Promise<void> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    await this.db.query('UPDATE listings SET logo_url = ? WHERE id = ?', [
      logoUrl,
      listingId
    ]);
  }

  /**
   * Update listing cover image URL directly (for UMM-uploaded files)
   * @param listingId Listing ID
   * @param coverImageUrl Cloudinary URL from /api/media/upload
   */
  async updateCoverImageUrl(listingId: number, coverImageUrl: string): Promise<void> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    await this.db.query('UPDATE listings SET cover_image_url = ? WHERE id = ?', [
      coverImageUrl,
      listingId
    ]);
  }

  /**
   * Add image to listing gallery
   * @param listingId Listing ID
   * @param file File buffer
   * @returns MediaFile
   */
  async addGalleryImage(
    listingId: number,
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaFile> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    // Check tier limit
    const canAdd = await this.canAddImage(listingId);
    if (!canAdd) {
      throw new MediaLimitExceededError(
        'image',
        listing.tier,
        this.TIER_LIMITS[listing.tier].images
      );
    }

    const mediaFile = await this.mediaService.uploadMedia({
      entityType: 'listing',
      entityId: listingId,
      mediaType: 'gallery',
      listingTier: listing.tier as 'essentials' | 'preferred' | 'premium' | 'plus' | undefined,
      file,
      filename,
      mimeType
    });

    // Update listing gallery_images
    const galleryImages = [...listing.gallery_images, mediaFile.url];
    await this.db.query(
      'UPDATE listings SET gallery_images = ? WHERE id = ?',
      [JSON.stringify(galleryImages), listingId]
    );

    return mediaFile;
  }

  // ==========================================================================
  // ADMIN Operations
  // ==========================================================================

  /**
   * Approve a listing
   * @param id Listing ID
   * @param adminId Admin user ID
   * @param adminNotes Optional admin notes
   * @returns Updated listing
   * @deprecated Use ListingApprovalService.approve() instead for unified approval logic with role upgrades and activity logging
   */
  async approveListing(id: number, adminId: number, adminNotes?: string): Promise<Listing> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }

    await this.db.query(
      `UPDATE listings
       SET approved = 'approved',
           status = 'active',
           admin_reviewer_id = ?,
           admin_notes = ?,
           admin_decision_at = NOW()
       WHERE id = ?`,
      [adminId, adminNotes || null, id]
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'approve listing',
        new Error('Failed to retrieve updated listing')
      );
    }

    return updated;
  }

  /**
   * Reject a listing
   * @param id Listing ID
   * @param adminId Admin user ID
   * @param reason Rejection reason
   * @param adminNotes Optional admin notes
   * @returns Updated listing
   * @deprecated Use ListingApprovalService.reject() instead for unified rejection logic with activity logging
   */
  async rejectListing(
    id: number,
    adminId: number,
    reason: string,
    adminNotes?: string
  ): Promise<Listing> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }

    await this.db.query(
      `UPDATE listings
       SET approved = 'rejected',
           status = 'inactive',
           rejection_reason = ?,
           admin_reviewer_id = ?,
           admin_notes = ?,
           admin_decision_at = NOW()
       WHERE id = ?`,
      [reason, adminId, adminNotes || null, id]
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'reject listing',
        new Error('Failed to retrieve updated listing')
      );
    }

    return updated;
  }

  /**
   * Feature/unfeature a listing
   * @param id Listing ID
   * @param featured Featured status
   * @returns Updated listing
   */
  async featureListing(id: number, featured: boolean): Promise<Listing> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }

    await this.db.query(
      'UPDATE listings SET is_featured = ? WHERE id = ?',
      [featured ? 1 : 0, id]
    );

    return { ...listing, is_featured: featured };
  }

  // ==========================================================================
  // UTILITY Operations
  // ==========================================================================

  /**
   * Generate URL-safe slug from name
   * @param name Listing name
   * @returns URL-safe slug
   */
  async generateSlug(name: string): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    let slug = name
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
          'ListingService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Increment listing view count
   * @param id Listing ID
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE listings SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Get listing statistics
   * @param listingId Listing ID
   * @param dateRange Optional date range
   * @returns Listing statistics
   */
  async getStatistics(
    listingId: number,
    dateRange?: DateRange
  ): Promise<ListingStats> {
    const listing = await this.getById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }

    // For now, return basic stats from listing record
    // TODO: Implement date range filtering and review aggregation
    return {
      views: listing.view_count,
      clicks: listing.click_count,
      favorites: listing.favorite_count,
      reviews: 0, // Would come from reviews table
      averageRating: 0 // Would come from reviews table
    };
  }

  // ==========================================================================
  // Phase 4A: Lifecycle Methods (Pause / Resume)
  // ==========================================================================

  /**
   * Pause an active listing — hides it from public search results.
   * Verifies ownership and that the listing is currently active.
   */
  async pauseListing(id: number, userId: number): Promise<Listing> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }
    if (listing.user_id !== userId) {
      throw new UnauthorizedAccessError(userId, id);
    }
    if (listing.status !== 'active') {
      throw new InvalidListingStatusError(listing.status, LISTING_STATUS_PAUSED);
    }

    await this.db.query(
      'UPDATE listings SET status = ?, updated_at = NOW() WHERE id = ?',
      [LISTING_STATUS_PAUSED, id]
    );

    return { ...listing, status: 'paused' };
  }

  /**
   * Resume a paused listing — makes it visible in public search results again.
   * Verifies ownership and that the listing is currently paused.
   */
  async resumeListing(id: number, userId: number): Promise<Listing> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }
    if (listing.user_id !== userId) {
      throw new UnauthorizedAccessError(userId, id);
    }
    if (listing.status !== LISTING_STATUS_PAUSED) {
      throw new InvalidListingStatusError(listing.status, 'active');
    }

    await this.db.query(
      'UPDATE listings SET status = ?, updated_at = NOW() WHERE id = ?',
      ['active', id]
    );

    return { ...listing, status: 'active' };
  }

  /**
   * Publish a draft listing — validates required fields before making it active.
   * Verifies ownership and that the listing is currently in draft status.
   *
   * Required fields for publishing: name, slug, type, description, category_id
   */
  async publishDraftListing(id: number, userId: number): Promise<{ listing: Listing; warnings: string[] }> {
    const listing = await this.getById(id);
    if (!listing) {
      throw new ListingNotFoundError(id);
    }
    if (listing.user_id !== userId) {
      throw new UnauthorizedAccessError(userId, id);
    }
    if (listing.status !== LISTING_STATUS_DRAFT) {
      throw new InvalidListingStatusError(listing.status, 'active');
    }

    // Validate required fields before publishing
    const missingFields: string[] = [];
    if (!listing.name?.trim()) missingFields.push('Listing Name');
    if (!listing.slug?.trim()) missingFields.push('URL Slug');
    if (!listing.type?.trim()) missingFields.push('Listing Type');
    if (!listing.description?.trim()) missingFields.push('Description');
    if (!listing.category_id) missingFields.push('Category');

    if (missingFields.length > 0) {
      throw new BizError({
        code: 'DRAFT_INCOMPLETE',
        message: `Cannot publish: missing required fields: ${missingFields.join(', ')}`,
        context: { missingFields },
        userMessage: `Please complete the following before publishing: ${missingFields.join(', ')}`
      });
    }

    // Optional warnings for recommended-but-not-required fields
    const warnings: string[] = [];
    if (!listing.phone && !listing.email) warnings.push('No contact information (phone or email)');
    if (!listing.address) warnings.push('No address set');
    if (!listing.logo_url) warnings.push('No logo uploaded');

    await this.db.query(
      'UPDATE listings SET status = ?, approved = ?, updated_at = NOW() WHERE id = ?',
      ['active', 'pending', id]
    );

    return { listing: { ...listing, status: 'active', approved: 'pending' }, warnings };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to Listing interface
   * Parses JSON fields
   * @param row - Typed ListingRow from database
   * @returns Listing - Application-level Listing object
   */
  private mapRowToListing(row: ListingRow): Listing {
    // GOVERNANCE: mariadb auto-parses JSON columns - use safeJsonParse for all JSON fields
    return {
      id: row.id,
      user_id: row.user_id || null,
      name: row.name,
      slug: row.slug,
      description: row.description || null,
      type: row.type,
      year_established: row.year_established || null,
      employee_count: row.employee_count || null,
      email: row.email || null,
      phone: row.phone || null,
      website: row.website || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      zip_code: row.zip_code || null,
      country: row.country || 'US',
      latitude: row.latitude || null,
      longitude: row.longitude || null,
      category_id: row.category_id || null,
      logo_url: row.logo_url || null,
      cover_image_url: row.cover_image_url || null,
      gallery_images: safeJsonParse(row.gallery_images, []),
      video_gallery: safeJsonParse(row.video_gallery, []),
      video_url: row.video_url || null,
      audio_url: row.audio_url || null,
      business_hours: safeJsonParse(row.business_hours, null),
      social_media: safeJsonParse(row.social_media, null),
      features: safeJsonParse(row.features, null),
      amenities: safeJsonParse(row.amenities, null),
      tier: row.tier,
      add_ons: safeJsonParse(row.add_ons, null),
      claimed: Boolean(row.claimed),
      status: row.status,
      approved: row.approved,
      rejection_reason: row.rejection_reason || null,
      admin_reviewer_id: row.admin_reviewer_id || null,
      admin_notes: row.admin_notes || null,
      admin_decision_at: row.admin_decision_at ? new Date(row.admin_decision_at) : null,
      meta_title: row.meta_title || null,
      meta_description: row.meta_description || null,
      meta_keywords: row.meta_keywords || null,
      custom_fields: safeJsonParse(row.custom_fields, null),
      metadata: safeJsonParse(row.metadata, null),
      contact_name: row.contact_name || null,
      contact_email: row.contact_email || null,
      contact_phone: row.contact_phone || null,
      annual_revenue: row.annual_revenue || null,
      certifications: safeJsonParse(row.certifications, null),
      languages_spoken: safeJsonParse(row.languages_spoken, null),
      payment_methods: safeJsonParse(row.payment_methods, null),
      view_count: row.view_count || 0,
      click_count: row.click_count || 0,
      favorite_count: row.favorite_count || 0,
      import_source: row.import_source || null,
      import_date: row.import_date ? new Date(row.import_date) : null,
      import_batch_id: row.import_batch_id || null,
      mock: Boolean(row.mock),
      keywords: safeJsonParse(row.keywords, null),
      slogan: row.slogan || null,
      active_categories: safeJsonParse(row.active_categories, null),
      bank_categories: safeJsonParse(row.bank_categories, null),
      section_layout: safeJsonParse(row.section_layout, null),
      gallery_layout: row.gallery_layout ?? null,
      video_gallery_layout: row.video_gallery_layout ?? null,
      combine_video_gallery: Boolean(row.combine_video_gallery),
      is_featured: Boolean(row.is_featured),
      date_created: new Date(row.date_created),
      last_update: new Date(row.last_update),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Get user information for notifications
   * @param userId User ID
   * @returns User info or null if not found
   */
  private async getUserInfo(userId: number): Promise<{
    email: string;
    first_name: string | null;
    display_name: string | null;
  } | null> {
    const result = await this.db.query<{
      email: string;
      first_name: string | null;
      display_name: string | null;
    }>(
      'SELECT email, first_name, display_name FROM users WHERE id = ?',
      [userId]
    );
    return result.rows[0] || null;
  }
}
