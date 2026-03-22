/**
 * EventService - Event Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Tier enforcement at service layer
 * - RSVP tracking with duplicate prevention
 * - Multi-tier ticketing system
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @phase Phase 4 - Task 4.4: EventService Implementation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ListingService, TierCheckResult } from '@core/services/ListingService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { EventRow, EventRsvpRow, EventTicketRow, EventMediaRow, EventCheckInRow, EventTicketPurchaseRow, EventServiceRequestRow } from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import { ErrorService } from '@core/services/ErrorService';
import type {
  EventDetailData,
  EventAnalyticsMetricType,
  EventAnalyticsSource,
  EventAnalyticsFunnel,
  EventSharePlatformData,
  RecordEventShareInput,
  EventFollowType,
  EventNotificationFrequency,
  EventFollowState,
  EventSharePlatform,
  EventReview,
  EventReviewDistribution,
  EventSponsor,
  CreateEventSponsorInput,
  UpdateEventSponsorInput,
  EventSponsorAnalytics,
  AdminEventSponsor,
  UserEventItem,
  CalendarEvent,
  EventWaitlistEntry,
  WaitlistStatus,
  AttendeeDetail,
  AttendeeDetailRow,
  EventCheckIn,
  CheckInMethod,
  CheckInStats,
  TicketPurchase,
  PurchaseStatus,
  EventRevenue,
  PlatformTicketSalesStats,
  EnrichedTicketPurchase,
  AdminTicketSale,
  EventCoHost,
  CreateEventCoHostInput,
  UpdateEventCoHostInput,
  AdminEventCoHost,
  EventExhibitor,
  CreateEventExhibitorInput,
  UpdateEventExhibitorInput,
  AdminEventExhibitor,
  EventServiceRequest,
  CreateEventServiceRequestInput,
  UpdateEventServiceRequestInput,
  AdminEventServiceRequest,
  OrganizerAnalyticsData,
  AdminOrganizerStats,
  EventKPIStats,
} from '@features/events/types';
import { getQuoteService } from '@core/services/ServiceRegistry';
import { getTierLimitsForTier } from '@core/utils/billing/tierLimitsCache';

// Phase 1A: Tier-gated feature limits (Feature Map Section 3.3)
// NOTE: Event-specific sub-limits. Not yet in subscription_plans.features JSON.
// Future migration: Add to features JSON with keys like event_media_limit, event_co_host_limit.
// For now: Keep hardcoded as authoritative source for event-specific limits.
const TIER_MEDIA_LIMITS: Record<string, number> = {
  essentials: 1,
  plus: 3,
  preferred: 6,
  premium: 6,
};

// NOTE: Event-specific sub-limits. Not yet in subscription_plans.features JSON.
const TIER_CO_HOST_LIMITS: Record<string, number> = {
  essentials: 0,
  plus: 2,
  preferred: 10,
  premium: 999, // unlimited
};

// NOTE: Event-specific sub-limits. Not yet in subscription_plans.features JSON.
// Phase 6B: Exhibitor tier limits (more generous than co-hosts — vendor floor concept)
const TIER_EXHIBITOR_LIMITS: Record<string, number> = {
  essentials: 0,
  plus: 3,
  preferred: 15,
  premium: 999, // unlimited
};

// NOTE: Event-specific sub-limits. Not yet in subscription_plans.features JSON.
// Phase 6C: Service request limits (Preferred/Premium only — key tier differentiator)
// Service procurement is NOT available on essentials or plus — differentiator for preferred
const TIER_SERVICE_REQUEST_LIMITS: Record<string, number> = {
  essentials: 0,
  plus: 0,        // NOT available on plus — differentiator for preferred
  preferred: 5,
  premium: 999,   // unlimited
};

// NOTE: Event-specific sub-limits. Not yet in subscription_plans.features JSON.
// Premium is capped at 6 (not unlimited) unlike Jobs which allows unlimited media.
// See JobService checkMediaLimit for rationale on why Jobs differs.
const TIER_IMAGE_LIMITS: Record<string, number> = {
  essentials: 1,
  plus: 3,
  preferred: 6,
  premium: 6,
};

// NOTE: Event-specific sub-limits. Not yet in subscription_plans.features JSON.
const TIER_VIDEO_LIMITS: Record<string, number> = {
  essentials: 0,
  plus: 1,
  preferred: 3,
  premium: 3,
};

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Event {
  id: number;
  listing_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  event_type: string | null;
  start_date: Date;
  end_date: Date;
  timezone: string;
  location_type: LocationType;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  virtual_link: string | null;
  banner_image: string | null;
  thumbnail: string | null;
  is_ticketed: boolean;
  ticket_price: number | null;
  total_capacity: number | null;
  remaining_capacity: number | null;
  rsvp_count: number;
  status: EventStatus;
  is_featured: boolean;
  is_mock: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  // Phase 1A Gap-Fill: Feature Map Section 3.1 fields
  external_ticket_url: string | null;
  age_restrictions: string | null;
  parking_notes: string | null;
  weather_contingency: string | null;
  waitlist_enabled: boolean;
  check_in_enabled: boolean;
  // Phase 3A: Community event fields
  is_community_event: boolean;
  submitted_by_user_id: number | null;
  moderation_notes: string | null;
  // Phase 3B: Recurring event fields
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_days: number[] | null;
  recurrence_end_date: Date | null;
  parent_event_id: number | null;
  series_index: number | null;
}

export interface CreateCommunityEventInput {
  title: string;
  description?: string;
  event_type?: string;
  start_date: Date | string;
  end_date: Date | string;
  timezone?: string;
  location_type?: LocationType;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  virtual_link?: string;
  total_capacity?: number;
}

export interface CreateEventInput {
  title: string;
  slug?: string;
  description?: string;
  event_type?: string;
  start_date: Date | string;
  end_date: Date | string;
  timezone?: string;
  location_type?: LocationType;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  virtual_link?: string;
  banner_image?: string;
  thumbnail?: string;
  is_ticketed?: boolean;
  ticket_price?: number;
  total_capacity?: number;
  status?: 'draft' | 'published';
  is_featured?: boolean;
  is_mock?: boolean;
  // Phase 1A Gap-Fill fields
  external_ticket_url?: string;
  age_restrictions?: string;
  parking_notes?: string;
  weather_contingency?: string;
  waitlist_enabled?: boolean;
  check_in_enabled?: boolean;
  // Phase 3B: Recurring event fields
  is_recurring?: boolean;
  recurrence_type?: string;
  recurrence_days?: number[];
  recurrence_end_date?: string;
  parent_event_id?: number;
  series_index?: number;
  /** Internal use only — skip tier check when creating child instances */
  _skipTierCheck?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  slug?: string;
  description?: string;
  event_type?: string;
  start_date?: Date | string;
  end_date?: Date | string;
  timezone?: string;
  location_type?: LocationType;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  virtual_link?: string;
  banner_image?: string;
  thumbnail?: string;
  is_ticketed?: boolean;
  ticket_price?: number;
  total_capacity?: number;
  status?: EventStatus;
  is_featured?: boolean;
  // Phase 1A Gap-Fill fields
  external_ticket_url?: string | null;
  age_restrictions?: string | null;
  parking_notes?: string | null;
  weather_contingency?: string | null;
  waitlist_enabled?: boolean;
  check_in_enabled?: boolean;
}

/**
 * Tier-gated feature access for events (Feature Map Section 3.3)
 * Used by EventFormModal to show/hide/disable fields by tier
 * @phase Phase 1A Gap-Fill
 */
export interface TierFeatureAccess {
  tier: string;
  maxMediaPerEvent: number;
  allowExternalTicketLink: boolean;
  allowNativeTicketing: boolean;
  maxTicketTiers: number;
  allowRecurring: boolean;
  maxCoHosts: number;
  allowCheckIn: boolean;
  allowWaitlist: boolean;
  allowFeatured: boolean;
}

export interface EventTypeRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface EventFilters {
  id?: number;
  listingId?: number;
  eventType?: string;
  status?: EventStatus;
  locationType?: LocationType;
  isFeatured?: boolean;
  isMock?: boolean;
  isUpcoming?: boolean;
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

export interface RSVP {
  id: number;
  event_id: number;
  user_id: number;
  ticket_id: number | null;
  rsvp_status: RSVPStatus;
  rsvp_date: Date;
  attended: boolean;
}

export interface TicketTier {
  id?: number;
  event_id: number;
  ticket_name: string;
  ticket_price: number;
  quantity_total: number;
  quantity_sold: number;
}

export enum LocationType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
  HYBRID = 'hybrid'
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  PENDING_MODERATION = 'pending_moderation'
}

export enum RSVPStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class EventNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'EVENT_NOT_FOUND',
      message: `Event not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested event was not found'
    });
  }
}

export class EventFullError extends BizError {
  constructor(eventId: number, capacity: number) {
    super({
      code: 'EVENT_FULL',
      message: `Event ${eventId} is at full capacity (${capacity})`,
      context: { eventId, capacity },
      userMessage: 'This event is at full capacity'
    });
  }
}

export class EventPastError extends BizError {
  constructor(eventId: number, endDate: Date) {
    super({
      code: 'EVENT_PAST',
      message: `Event ${eventId} ended on ${endDate}`,
      context: { eventId, endDate },
      userMessage: 'This event has already ended'
    });
  }
}

export class EventCancelledError extends BizError {
  constructor(eventId: number) {
    super({
      code: 'EVENT_CANCELLED',
      message: `Event ${eventId} has been cancelled`,
      context: { eventId },
      userMessage: 'This event has been cancelled'
    });
  }
}

export class DuplicateRsvpError extends BizError {
  constructor(eventId: number, userId: number) {
    super({
      code: 'DUPLICATE_RSVP',
      message: `User ${userId} has already RSVPed to event ${eventId}`,
      context: { eventId, userId },
      userMessage: 'You have already RSVPed to this event'
    });
  }
}

export class TierLimitExceededError extends BizError {
  constructor(tier: string, limit: number) {
    super({
      code: 'TIER_LIMIT_EXCEEDED',
      message: `Event limit exceeded for tier ${tier} (limit: ${limit})`,
      context: { tier, limit },
      userMessage: `You have reached the event limit for your ${tier} tier`
    });
  }
}

export class InvalidEventDatesError extends BizError {
  constructor(startDate: Date, endDate: Date) {
    super({
      code: 'INVALID_EVENT_DATES',
      message: `Invalid event dates: start_date (${startDate}) must be before end_date (${endDate})`,
      context: { startDate, endDate },
      userMessage: 'The event start date must be before the end date'
    });
  }
}

export class DuplicateSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_SLUG',
      message: `Event slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'An event with this URL slug already exists'
    });
  }
}

export class EventReviewNotEligibleError extends BizError {
  constructor(reason: string) {
    super({
      code: 'EVENT_REVIEW_NOT_ELIGIBLE',
      message: `User is not eligible to review this event: ${reason}`,
      context: { reason },
      userMessage: reason
    });
  }
}

export class DuplicateEventReviewError extends BizError {
  constructor(eventId: number, userId: number) {
    super({
      code: 'DUPLICATE_EVENT_REVIEW',
      message: `User ${userId} has already reviewed event ${eventId}`,
      context: { eventId, userId },
      userMessage: 'You have already reviewed this event'
    });
  }
}

export class EventReviewNotFoundError extends BizError {
  constructor(reviewId: number) {
    super({
      code: 'EVENT_REVIEW_NOT_FOUND',
      message: `Event review not found: ${reviewId}`,
      context: { reviewId },
      userMessage: 'Review not found'
    });
  }
}

// ============================================================================
// Event Media Interfaces
// ============================================================================

export interface EventMedia {
  id: number;
  event_id: number;
  media_type: 'image' | 'video';
  file_url: string;
  sort_order: number;
  alt_text: string | null;
  embed_url: string | null;
  platform: string | null;
  source: 'upload' | 'embed' | null;
  created_at: Date;
}

export interface CreateEventMediaInput {
  media_type: 'image' | 'video';
  file_url: string;
  alt_text?: string;
  sort_order?: number;
  embed_url?: string;
  platform?: string;
  source?: 'upload' | 'embed';
}

export interface EventMediaLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  unlimited: boolean;
  tier: string;
}

export interface EventMediaLimits {
  images: { current: number; limit: number; unlimited: boolean };
  videos: { current: number; limit: number; unlimited: boolean };
}

// ============================================================================
// EventService Implementation
// ============================================================================

export class EventService {
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
   * Get all events with optional filters and pagination
   * @param filters Optional filters
   * @param pagination Optional pagination parameters
   * @returns Paginated result of events
   */
  async getAll(
    filters?: EventFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Event>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM events';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.id !== undefined) {
        conditions.push('id = ?');
        params.push(filters.id);
      }

      if (filters.listingId !== undefined) {
        conditions.push('listing_id = ?');
        params.push(filters.listingId);
      }

      if (filters.eventType !== undefined) {
        conditions.push('event_type = ?');
        params.push(filters.eventType);
      }

      if (filters.status !== undefined) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.locationType !== undefined) {
        conditions.push('location_type = ?');
        params.push(filters.locationType);
      }

      if (filters.isFeatured !== undefined) {
        conditions.push('is_featured = ?');
        params.push(filters.isFeatured ? 1 : 0);
      }

      if (filters.isMock !== undefined) {
        conditions.push('is_mock = ?');
        params.push(filters.isMock ? 1 : 0);
      }

      if (filters.isUpcoming) {
        conditions.push('status = ?');
        conditions.push('start_date > NOW()');
        params.push('published');
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
    const countSql = `SELECT COUNT(*) as total FROM events${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const row = countResult.rows[0];
    const total = row ? bigIntToNumber(row.total) : 0;

    // Get paginated data
    sql += ' ORDER BY start_date ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result: DbResult<EventRow> = await this.db.query(sql, params);

    return {
      data: result.rows.map((r) => this.mapRowToEvent(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get event by ID
   * @param id Event ID
   * @returns Event or null if not found
   */
  async getById(id: number): Promise<Event | null> {
    const result: DbResult<EventRow> = await this.db.query(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToEvent(row);
  }

  /**
   * Get event by slug
   * @param slug Event slug
   * @returns Event or null if not found
   */
  async getBySlug(slug: string): Promise<Event | null> {
    const result: DbResult<EventRow> = await this.db.query(
      'SELECT * FROM events WHERE slug = ?',
      [slug]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToEvent(row);
  }

  /**
   * Get all events for a listing
   * @param listingId Listing ID
   * @returns Array of events
   */
  async getByListingId(listingId: number): Promise<Event[]> {
    const result: DbResult<EventRow> = await this.db.query(
      'SELECT * FROM events WHERE listing_id = ? ORDER BY start_date ASC',
      [listingId]
    );

    return result.rows.map((r) => this.mapRowToEvent(r));
  }

  /**
   * Get upcoming events
   * @param limit Optional limit (default: 10)
   * @returns Array of upcoming events
   */
  async getUpcoming(limit: number = 10): Promise<Event[]> {
    const result: DbResult<EventRow> = await this.db.query(
      `SELECT * FROM events
       WHERE status = 'published'
         AND start_date > NOW()
       ORDER BY start_date ASC
       LIMIT ?`,
      [limit]
    );

    return result.rows.map((r) => this.mapRowToEvent(r));
  }

  /**
   * Search events by date range
   * @param startDate Range start date
   * @param endDate Range end date
   * @returns Array of events in date range
   */
  async searchByDate(startDate: Date, endDate: Date): Promise<Event[]> {
    const result: DbResult<EventRow> = await this.db.query(
      `SELECT * FROM events
       WHERE start_date >= ?
         AND end_date <= ?
       ORDER BY start_date ASC`,
      [startDate, endDate]
    );

    return result.rows.map((r) => this.mapRowToEvent(r));
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new event
   * @param listingId Listing ID
   * @param data Event data
   * @returns Created event
   */
  async create(listingId: number, data: CreateEventInput): Promise<Event> {
    // Validate listing exists
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Check tier limit (skip for recurring child instances)
    if (!data._skipTierCheck) {
      const tierCheck = await this.checkEventLimit(listingId);
      if (!tierCheck.allowed) {
        throw new TierLimitExceededError(tierCheck.tier ?? 'unknown', tierCheck.limit);
      }
    }

    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (startDate >= endDate) {
      throw new InvalidEventDatesError(startDate, endDate);
    }

    // Reject past dates
    const now = new Date();
    if (startDate < now) {
      throw BizError.badRequest(
        'Event start date cannot be in the past',
        { startDate }
      );
    }

    // Generate slug if not provided
    const slug = data.slug || (await this.generateSlug(data.title));

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError(slug);
    }

    // Insert event
    const result: DbResult<EventRow> = await this.db.query(
      `INSERT INTO events (
        listing_id, title, slug, description, event_type,
        start_date, end_date, timezone,
        location_type, venue_name, address, city, state, zip, virtual_link,
        banner_image, thumbnail,
        is_ticketed, ticket_price, total_capacity, remaining_capacity,
        status, is_featured, is_mock,
        external_ticket_url, age_restrictions, parking_notes, weather_contingency,
        waitlist_enabled, check_in_enabled,
        is_recurring, recurrence_type, recurrence_days, recurrence_end_date,
        parent_event_id, series_index
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )`,
      [
        listingId,
        data.title,
        slug,
        data.description || null,
        data.event_type || null,
        startDate,
        endDate,
        data.timezone || 'America/New_York',
        data.location_type || LocationType.PHYSICAL,
        data.venue_name || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.virtual_link || null,
        data.banner_image || null,
        data.thumbnail || null,
        data.is_ticketed ? 1 : 0,
        data.ticket_price || null,
        data.total_capacity || null,
        data.total_capacity || null, // remaining_capacity = total_capacity initially
        data.status || 'draft',
        data.is_featured ? 1 : 0,
        data.is_mock ? 1 : 0,
        data.external_ticket_url || null,
        data.age_restrictions || null,
        data.parking_notes || null,
        data.weather_contingency || null,
        data.waitlist_enabled ? 1 : 0,
        data.check_in_enabled ? 1 : 0,
        data.is_recurring ? 1 : 0,
        data.is_recurring ? (data.recurrence_type || 'none') : 'none',
        data.is_recurring && data.recurrence_days?.length ? JSON.stringify(data.recurrence_days) : null,
        data.is_recurring && data.recurrence_end_date ? data.recurrence_end_date : null,
        data.parent_event_id ?? null,
        data.series_index ?? null
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create event',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create event',
        new Error('Failed to retrieve created event')
      );
    }

    return created;
  }

  // ==========================================================================
  // Phase 3B: RECURRING EVENT Operations
  // ==========================================================================

  /**
   * Calculate the next N occurrence dates starting from a base date
   * Adapted from useRecurrenceSchedule.getNextOccurrence() for server-side use
   */
  private getNextOccurrenceDates(
    baseStartDate: Date,
    baseEndDate: Date,
    recurrenceType: string,
    recurrenceDays: number[] | null,
    endDate: Date | null,
    count: number
  ): Array<{ startDate: Date; endDate: Date }> {
    const results: Array<{ startDate: Date; endDate: Date }> = [];
    const durationMs = baseEndDate.getTime() - baseStartDate.getTime();
    let current = new Date(baseStartDate);
    const maxIterations = count * 30; // Safety cap
    let iterations = 0;

    while (results.length < count && iterations < maxIterations) {
      iterations++;

      // Advance to next occurrence
      switch (recurrenceType) {
        case 'daily':
          current = new Date(current);
          current.setDate(current.getDate() + 1);
          break;

        case 'weekly':
          if (recurrenceDays && recurrenceDays.length > 0) {
            // Find next matching day of week
            const sortedDays = [...recurrenceDays].sort((a, b) => a - b);
            const currentDay = current.getDay();
            const nextDayCandidate = sortedDays.find(d => d > currentDay);
            const nextDay = nextDayCandidate !== undefined ? nextDayCandidate : sortedDays[0]!;
            const daysUntil = nextDay > currentDay
              ? nextDay - currentDay
              : 7 - currentDay + nextDay;
            current = new Date(current);
            current.setDate(current.getDate() + daysUntil);
          } else {
            current = new Date(current);
            current.setDate(current.getDate() + 7);
          }
          break;

        case 'monthly':
          current = new Date(current);
          current.setMonth(current.getMonth() + 1);
          break;

        case 'yearly':
          current = new Date(current);
          current.setFullYear(current.getFullYear() + 1);
          break;

        default:
          return results; // Unknown type — stop
      }

      // Check end date constraint
      if (endDate && current > endDate) {
        break;
      }

      results.push({
        startDate: new Date(current),
        endDate: new Date(current.getTime() + durationMs),
      });
    }

    return results;
  }

  /**
   * Generate recurring instances for a parent event
   * Creates child events for the next N weeks (default: 4 weeks ahead)
   * Deduplicates by checking existing parent_event_id + series_index combinations
   *
   * @param parentEventId Parent event ID
   * @param weeksAhead How many weeks ahead to generate (default: 4)
   * @returns Array of created child events
   * @phase Phase 3B
   */
  async generateRecurringInstances(parentEventId: number, weeksAhead = 4): Promise<Event[]> {
    const parent = await this.getById(parentEventId);
    if (!parent) {
      throw BizError.notFound('Event', parentEventId);
    }

    if (!parent.is_recurring || !parent.recurrence_type || parent.recurrence_type === 'none') {
      throw BizError.badRequest('Event is not configured for recurrence', { parentEventId });
    }

    // Find the cutoff date (how far ahead to generate)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + weeksAhead * 7);

    // Get existing instances to determine last series_index and avoid duplicates
    const existingResult: DbResult<EventRow> = await this.db.query(
      `SELECT series_index FROM events WHERE parent_event_id = ? ORDER BY series_index DESC`,
      [parentEventId]
    );
    const existingIndices = new Set(existingResult.rows.map(r => r.series_index));
    const lastIndex = existingResult.rows.length > 0
      ? Math.max(...existingResult.rows.map(r => r.series_index ?? 0))
      : 0;

    // Determine the base date for generating new occurrences
    // Start from the last existing instance's date, or from the parent event date
    let baseStartDate: Date;
    let baseEndDate: Date;

    if (existingResult.rows.length > 0) {
      // Get the last instance's dates
      const lastInstanceResult: DbResult<EventRow> = await this.db.query(
        `SELECT start_date, end_date FROM events WHERE parent_event_id = ? ORDER BY series_index DESC LIMIT 1`,
        [parentEventId]
      );
      const lastRow = lastInstanceResult.rows[0];
      if (!lastRow) {
        baseStartDate = new Date(parent.start_date);
        baseEndDate = new Date(parent.end_date);
      } else {
        baseStartDate = new Date(lastRow.start_date);
        baseEndDate = new Date(lastRow.end_date);
      }
    } else {
      baseStartDate = new Date(parent.start_date);
      baseEndDate = new Date(parent.end_date);
    }

    // Calculate occurrence dates
    const occurrenceDates = this.getNextOccurrenceDates(
      baseStartDate,
      baseEndDate,
      parent.recurrence_type,
      parent.recurrence_days,
      parent.recurrence_end_date,
      weeksAhead * 7 // Max instances
    );

    // Filter to only include dates within the cutoff window
    const datesToCreate = occurrenceDates.filter(d => d.startDate <= cutoffDate);

    const created: Event[] = [];
    let seriesIndex = lastIndex;

    for (const { startDate, endDate } of datesToCreate) {
      seriesIndex++;

      // Skip if already exists (deduplication)
      if (existingIndices.has(seriesIndex)) {
        continue;
      }

      // Generate unique slug for this instance
      const instanceSlug = await this.generateSlug(`${parent.title}-instance-${seriesIndex}`);

      const instanceData: CreateEventInput = {
        title: parent.title,
        slug: instanceSlug,
        description: parent.description ?? undefined,
        event_type: parent.event_type ?? undefined,
        start_date: startDate,
        end_date: endDate,
        timezone: parent.timezone,
        location_type: parent.location_type,
        venue_name: parent.venue_name ?? undefined,
        address: parent.address ?? undefined,
        city: parent.city ?? undefined,
        state: parent.state ?? undefined,
        zip: parent.zip ?? undefined,
        virtual_link: parent.virtual_link ?? undefined,
        banner_image: parent.banner_image ?? undefined,
        thumbnail: parent.thumbnail ?? undefined,
        is_ticketed: parent.is_ticketed,
        ticket_price: parent.ticket_price ?? undefined,
        total_capacity: parent.total_capacity ?? undefined,
        status: parent.status === 'published' ? 'published' : 'draft',
        is_featured: parent.is_featured,
        is_mock: parent.is_mock,
        external_ticket_url: parent.external_ticket_url ?? undefined,
        age_restrictions: parent.age_restrictions ?? undefined,
        parking_notes: parent.parking_notes ?? undefined,
        weather_contingency: parent.weather_contingency ?? undefined,
        waitlist_enabled: parent.waitlist_enabled,
        check_in_enabled: parent.check_in_enabled,
        is_recurring: false, // Instances are not themselves recurring
        parent_event_id: parentEventId,
        series_index: seriesIndex,
        _skipTierCheck: true, // Child instances don't count toward tier limits
      };

      if (parent.listing_id) {
        const instance = await this.create(parent.listing_id, instanceData);
        created.push(instance);
      }
    }

    return created;
  }

  /**
   * Get all child instances of a recurring series
   * @param parentEventId Parent event ID
   * @returns Array of child events ordered by series_index
   * @phase Phase 3B
   */
  async getSeriesEvents(parentEventId: number): Promise<Event[]> {
    const result: DbResult<EventRow> = await this.db.query(
      `SELECT * FROM events WHERE parent_event_id = ? ORDER BY series_index ASC`,
      [parentEventId]
    );
    return result.rows.map(r => this.mapRowToEvent(r));
  }

  /**
   * Get the parent event for a child instance
   * @param childEventId Child event ID
   * @returns Parent event or null if not a child
   * @phase Phase 3B
   */
  async getParentEvent(childEventId: number): Promise<Event | null> {
    const child = await this.getById(childEventId);
    if (!child || !child.parent_event_id) {
      return null;
    }
    return this.getById(child.parent_event_id);
  }

  /**
   * Update the recurrence pattern of a series
   * Cancels all future instances and regenerates them from the updated pattern
   * @param parentEventId Parent event ID
   * @param data Updated recurrence fields
   * @phase Phase 3B
   */
  async updateRecurringSeries(parentEventId: number, data: Partial<CreateEventInput>): Promise<void> {
    const parent = await this.getById(parentEventId);
    if (!parent) {
      throw BizError.notFound('Event', parentEventId);
    }

    // Update parent event's recurrence fields
    await this.db.query(
      `UPDATE events SET
        recurrence_type = ?,
        recurrence_days = ?,
        recurrence_end_date = ?
       WHERE id = ?`,
      [
        data.recurrence_type || parent.recurrence_type,
        data.recurrence_days ? JSON.stringify(data.recurrence_days) : null,
        data.recurrence_end_date || null,
        parentEventId,
      ]
    );

    // Cancel all future instances (preserve past/completed)
    await this.db.query(
      `UPDATE events SET status = 'cancelled'
       WHERE parent_event_id = ?
         AND status NOT IN ('completed', 'cancelled')
         AND start_date > NOW()`,
      [parentEventId]
    );

    // Regenerate instances from updated pattern
    await this.generateRecurringInstances(parentEventId);
  }

  /**
   * Cancel all future instances of a recurring series
   * Past/completed instances remain unchanged
   * @param parentEventId Parent event ID
   * @phase Phase 3B
   */
  async cancelRecurringSeries(parentEventId: number): Promise<void> {
    // Cancel parent
    await this.db.query(
      `UPDATE events SET status = 'cancelled' WHERE id = ?`,
      [parentEventId]
    );

    // Cancel all future instances
    await this.db.query(
      `UPDATE events SET status = 'cancelled'
       WHERE parent_event_id = ?
         AND status NOT IN ('completed', 'cancelled')
         AND start_date > NOW()`,
      [parentEventId]
    );
  }

  /**
   * Update an event
   * @param id Event ID
   * @param data Update data
   * @returns Updated event
   */
  async update(id: number, data: UpdateEventInput): Promise<Event> {
    // Check event exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new EventNotFoundError(id);
    }

    // Validate dates if being updated
    if (data.start_date || data.end_date) {
      const startDate = data.start_date
        ? new Date(data.start_date)
        : existing.start_date;
      const endDate = data.end_date ? new Date(data.end_date) : existing.end_date;

      if (startDate >= endDate) {
        throw new InvalidEventDatesError(startDate, endDate);
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

    if (data.event_type !== undefined) {
      updates.push('event_type = ?');
      params.push(data.event_type);
    }

    if (data.start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(new Date(data.start_date));
    }

    if (data.end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(new Date(data.end_date));
    }

    if (data.timezone !== undefined) {
      updates.push('timezone = ?');
      params.push(data.timezone);
    }

    if (data.location_type !== undefined) {
      updates.push('location_type = ?');
      params.push(data.location_type);
    }

    if (data.venue_name !== undefined) {
      updates.push('venue_name = ?');
      params.push(data.venue_name);
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

    if (data.zip !== undefined) {
      updates.push('zip = ?');
      params.push(data.zip);
    }

    if (data.virtual_link !== undefined) {
      updates.push('virtual_link = ?');
      params.push(data.virtual_link);
    }

    if (data.banner_image !== undefined) {
      updates.push('banner_image = ?');
      params.push(data.banner_image);
    }

    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }

    if (data.is_ticketed !== undefined) {
      updates.push('is_ticketed = ?');
      params.push(data.is_ticketed ? 1 : 0);
    }

    if (data.ticket_price !== undefined) {
      updates.push('ticket_price = ?');
      params.push(data.ticket_price);
    }

    if (data.total_capacity !== undefined) {
      updates.push('total_capacity = ?');
      params.push(data.total_capacity);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.external_ticket_url !== undefined) {
      updates.push('external_ticket_url = ?');
      params.push(data.external_ticket_url);
    }

    if (data.age_restrictions !== undefined) {
      updates.push('age_restrictions = ?');
      params.push(data.age_restrictions);
    }

    if (data.parking_notes !== undefined) {
      updates.push('parking_notes = ?');
      params.push(data.parking_notes);
    }

    if (data.weather_contingency !== undefined) {
      updates.push('weather_contingency = ?');
      params.push(data.weather_contingency);
    }

    if (data.waitlist_enabled !== undefined) {
      updates.push('waitlist_enabled = ?');
      params.push(data.waitlist_enabled ? 1 : 0);
    }

    if (data.check_in_enabled !== undefined) {
      updates.push('check_in_enabled = ?');
      params.push(data.check_in_enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    params.push(id);

    try {
      await this.db.query(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    } catch (error: unknown) {
      // ER_LOCK_WAIT_TIMEOUT: another transaction holds a lock on this row
      if (error && typeof error === 'object' && 'errno' in error && (error as { errno: number }).errno === 1205) {
        throw new BizError({
          code: 'CONFLICT',
          message: 'Event is currently being modified by another operation. Please try again in a moment.'
        });
      }
      throw error;
    }

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update event',
        new Error('Failed to retrieve updated event')
      );
    }

    // Notify RSVPs of significant changes (date, location, status)
    const significantFields = ['start_date', 'end_date', 'venue_name', 'address', 'virtual_link', 'location_type', 'status'];
    const hasSignificantChange = significantFields.some(field => data[field as keyof typeof data] !== undefined);

    if (hasSignificantChange) {
      try {
        const { getNotificationService } = await import('@core/services/ServiceRegistry');
        const notificationService = getNotificationService();

        const rsvpResult = await this.db.query<{ user_id: number }>(
          `SELECT DISTINCT user_id FROM event_rsvps
           WHERE event_id = ? AND rsvp_status IN ('confirmed', 'pending')`,
          [id]
        );

        for (const rsvp of rsvpResult.rows) {
          notificationService.dispatch({
            type: 'event.updated',
            recipientId: rsvp.user_id,
            title: `Event updated: ${updated.title}`,
            message: 'Event details have been changed. Please review the updated information.',
            entityType: 'event',
            entityId: id,
            actionUrl: `/events/${updated.slug || id}`,
            priority: 'normal',
            metadata: {
              event_id: id,
              changed_fields: significantFields.filter(f => data[f as keyof typeof data] !== undefined)
            }
          }).catch(err => {
            ErrorService.capture(`[EventService] Failed to notify user ${rsvp.user_id} of update:`, err);
          });
        }
      } catch (err) {
        // Notification failure must not break update
      }
    }

    return updated;
  }

  /**
   * Delete an event
   * @param id Event ID
   */
  async delete(id: number): Promise<void> {
    const event = await this.getById(id);
    if (!event) {
      throw new EventNotFoundError(id);
    }

    await this.db.query('DELETE FROM events WHERE id = ?', [id]);
  }

  /**
   * Cancel an event
   * @param id Event ID
   * @param reason Optional cancellation reason
   * @returns Updated event
   */
  async cancel(id: number, reason?: string): Promise<Event> {
    const event = await this.getById(id);
    if (!event) {
      throw new EventNotFoundError(id);
    }

    await this.db.query(
      `UPDATE events SET status = 'cancelled' WHERE id = ?`,
      [id]
    );

    // Notify all RSVPs about cancellation
    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      // Get all confirmed/pending RSVPs
      const rsvpResult = await this.db.query<{ user_id: number }>(
        `SELECT DISTINCT user_id FROM event_rsvps
         WHERE event_id = ? AND rsvp_status IN ('confirmed', 'pending')`,
        [id]
      );

      // Dispatch to each attendee (fire-and-forget)
      for (const rsvp of rsvpResult.rows) {
        notificationService.dispatch({
          type: 'event.cancelled',
          recipientId: rsvp.user_id,
          title: `Event cancelled: ${event.title}`,
          message: reason || 'This event has been cancelled.',
          entityType: 'event',
          entityId: id,
          actionUrl: `/events/${event.slug || id}`,
          priority: 'urgent',
          metadata: {
            event_id: id,
            event_title: event.title,
            cancellation_reason: reason || null,
            original_start_date: event.start_date
          }
        }).catch(err => {
          ErrorService.capture(`[EventService] Failed to notify user ${rsvp.user_id} of cancellation:`, err);
        });
      }
    } catch (err) {
      // Notification failure must not break cancellation
    }

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'cancel event',
        new Error('Failed to retrieve updated event')
      );
    }

    return updated;
  }

  // ==========================================================================
  // RSVP MANAGEMENT Operations
  // ==========================================================================

  /**
   * RSVP to an event
   * @param eventId Event ID
   * @param userId User ID
   * @param ticketId Optional ticket tier ID
   * @returns RSVP record
   */
  async rsvp(
    eventId: number,
    userId: number,
    ticketId?: number
  ): Promise<RSVP> {
    const event = await this.getById(eventId);
    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    // Check if event is published
    if (event.status !== EventStatus.PUBLISHED) {
      throw BizError.badRequest(
        `Event is ${event.status}`,
        { eventId, status: event.status }
      );
    }

    // Check if event has ended
    if (new Date() > event.end_date) {
      throw new EventPastError(eventId, event.end_date);
    }

    // Check if event is at capacity
    if (
      event.remaining_capacity !== null &&
      event.remaining_capacity <= 0
    ) {
      throw new EventFullError(eventId, event.total_capacity!);
    }

    // Check if user has already RSVPed (excludes cancelled)
    const hasRsvped = await this.hasRsvped(eventId, userId);
    if (hasRsvped) {
      throw new DuplicateRsvpError(eventId, userId);
    }

    // Use transaction to ensure consistency
    return this.db.transaction(async (client) => {
      // Check for a previously cancelled RSVP (unique constraint on user_id + event_id)
      const existingResult: DbResult<EventRsvpRow> = await client.query(
        `SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ? AND rsvp_status = 'cancelled'`,
        [eventId, userId]
      );

      let rsvpId: number;

      if (existingResult.rows.length > 0 && existingResult.rows[0]) {
        // Reactivate cancelled RSVP
        rsvpId = existingResult.rows[0].id;
        await client.query(
          `UPDATE event_rsvps SET rsvp_status = 'confirmed', ticket_id = ?, rsvp_date = NOW() WHERE id = ?`,
          [ticketId || null, rsvpId]
        );
      } else {
        // Insert new RSVP record
        const result: DbResult<EventRsvpRow> = await client.query(
          `INSERT INTO event_rsvps (event_id, user_id, ticket_id, rsvp_status)
           VALUES (?, ?, ?, 'confirmed')`,
          [eventId, userId, ticketId || null]
        );

        if (!result.insertId) {
          throw BizError.databaseError(
            'create RSVP',
            new Error('No insert ID returned')
          );
        }
        rsvpId = result.insertId;
      }

      // Update event statistics
      const updates: string[] = ['rsvp_count = rsvp_count + 1'];
      if (event.remaining_capacity !== null) {
        updates.push('remaining_capacity = remaining_capacity - 1');
      }

      await client.query(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
        [eventId]
      );

      // Update ticket inventory if ticketed
      if (ticketId) {
        await client.query(
          `UPDATE event_tickets
           SET quantity_sold = quantity_sold + 1
           WHERE id = ?`,
          [ticketId]
        );
      }

      // Get RSVP record
      const rsvpResult: DbResult<EventRsvpRow> = await client.query(
        'SELECT * FROM event_rsvps WHERE id = ?',
        [rsvpId]
      );

      const row = rsvpResult.rows[0];
      if (!row) {
        throw BizError.databaseError(
          'create RSVP',
          new Error('Failed to retrieve created RSVP')
        );
      }

      return this.mapRowToRSVP(row);
    });
  }

  /**
   * Cancel an RSVP
   * @param eventId Event ID
   * @param userId User ID
   */
  async cancelRsvp(eventId: number, userId: number): Promise<void> {
    const event = await this.getById(eventId);
    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    // Get existing RSVP
    const rsvps = await this.getRsvps(eventId);
    const rsvp = rsvps.find((r) => r.user_id === userId);

    if (!rsvp) {
      throw BizError.notFound('RSVP', `user ${userId} for event ${eventId}`);
    }

    // Use transaction to ensure consistency
    await this.db.transaction(async (client) => {
      // Update RSVP status
      await client.query(
        `UPDATE event_rsvps SET rsvp_status = 'cancelled' WHERE id = ?`,
        [rsvp.id]
      );

      // Update event statistics
      const updates: string[] = ['rsvp_count = GREATEST(rsvp_count - 1, 0)'];
      if (event.remaining_capacity !== null) {
        updates.push('remaining_capacity = remaining_capacity + 1');
      }

      await client.query(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
        [eventId]
      );

      // Update ticket inventory if ticketed
      if (rsvp.ticket_id) {
        await client.query(
          `UPDATE event_tickets
           SET quantity_sold = quantity_sold - 1
           WHERE id = ?`,
          [rsvp.ticket_id]
        );
      }
    });
  }

  /**
   * Get all RSVPs for an event
   * @param eventId Event ID
   * @returns Array of RSVPs
   */
  async getRsvps(eventId: number): Promise<RSVP[]> {
    const result: DbResult<EventRsvpRow> = await this.db.query(
      'SELECT * FROM event_rsvps WHERE event_id = ? ORDER BY rsvp_date DESC',
      [eventId]
    );

    return result.rows.map((r) => this.mapRowToRSVP(r));
  }

  /**
   * Get all RSVPs for a user
   * @param userId User ID
   * @returns Array of RSVPs
   */
  async getUserRsvps(userId: number): Promise<RSVP[]> {
    const result: DbResult<EventRsvpRow> = await this.db.query(
      'SELECT * FROM event_rsvps WHERE user_id = ? ORDER BY rsvp_date DESC',
      [userId]
    );

    return result.rows.map((r) => this.mapRowToRSVP(r));
  }

  /**
   * Check if user has RSVPed to an event
   * @param eventId Event ID
   * @param userId User ID
   * @returns True if user has RSVPed
   */
  async hasRsvped(eventId: number, userId: number): Promise<boolean> {
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count FROM event_rsvps
       WHERE event_id = ? AND user_id = ? AND rsvp_status != 'cancelled'`,
      [eventId, userId]
    );

    const row = result.rows[0];
    return row ? bigIntToNumber(row.count) > 0 : false;
  }

  // ==========================================================================
  // TICKETING Operations
  // ==========================================================================

  /**
   * Add a ticket tier to an event
   * @param eventId Event ID
   * @param ticket Ticket tier data
   * @returns Created ticket tier
   */
  async addTicketTier(eventId: number, ticket: Omit<TicketTier, 'id' | 'event_id'>): Promise<TicketTier> {
    const event = await this.getById(eventId);
    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    const result: DbResult<EventTicketRow> = await this.db.query(
      `INSERT INTO event_tickets (event_id, ticket_name, ticket_price, quantity_total, quantity_sold)
       VALUES (?, ?, ?, ?, 0)`,
      [eventId, ticket.ticket_name, ticket.ticket_price, ticket.quantity_total]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'add ticket tier',
        new Error('No insert ID returned')
      );
    }

    const ticketResult: DbResult<EventTicketRow> = await this.db.query(
      'SELECT * FROM event_tickets WHERE id = ?',
      [result.insertId]
    );

    const row = ticketResult.rows[0];
    if (!row) {
      throw BizError.databaseError(
        'add ticket tier',
        new Error('Failed to retrieve created ticket')
      );
    }

    return this.mapRowToTicketTier(row);
  }

  /**
   * Update ticket inventory
   * @param ticketId Ticket tier ID
   * @param sold Quantity sold
   */
  async updateTicketInventory(ticketId: number, sold: number): Promise<void> {
    await this.db.query(
      `UPDATE event_tickets SET quantity_sold = ? WHERE id = ?`,
      [sold, ticketId]
    );
  }

  /**
   * Get available tickets for an event
   * @param eventId Event ID
   * @returns Array of ticket tiers
   */
  async getAvailableTickets(eventId: number): Promise<TicketTier[]> {
    const result: DbResult<EventTicketRow> = await this.db.query(
      `SELECT * FROM event_tickets
       WHERE event_id = ?
         AND quantity_sold < quantity_total
       ORDER BY ticket_price ASC`,
      [eventId]
    );

    return result.rows.map((r) => this.mapRowToTicketTier(r));
  }

  // ==========================================================================
  // SAVE/BOOKMARK Operations (Phase 2)
  // ==========================================================================

  /**
   * Save an event bookmark for a user
   * @param eventId Event ID
   * @param userId User ID
   */
  async saveEvent(eventId: number, userId: number): Promise<void> {
    await this.db.query(
      `INSERT IGNORE INTO event_saves (event_id, user_id) VALUES (?, ?)`,
      [eventId, userId]
    );
  }

  /**
   * Remove a saved event bookmark for a user
   * @param eventId Event ID
   * @param userId User ID
   */
  async unsaveEvent(eventId: number, userId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM event_saves WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );
  }

  /**
   * Check if a user has saved an event
   * @param eventId Event ID
   * @param userId User ID
   * @returns true if saved
   */
  async isEventSaved(eventId: number, userId: number): Promise<boolean> {
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count FROM event_saves WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );
    const row = result.rows[0];
    return row ? bigIntToNumber(row.count) > 0 : false;
  }

  /**
   * Get all saved event IDs for a user
   * @param userId User ID
   * @returns Array of event IDs
   */
  async getUserSavedEvents(userId: number): Promise<number[]> {
    const result: DbResult<{ event_id: number }> = await this.db.query(
      `SELECT event_id FROM event_saves WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map((r) => r.event_id);
  }

  // ==========================================================================
  // TIER ENFORCEMENT Operations
  // ==========================================================================

  /**
   * Check if listing can add another event based on tier limits
   * @param listingId Listing ID
   * @returns Tier check result
   */
  async checkEventLimit(listingId: number): Promise<TierCheckResult> {
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Count current events for listing
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      "SELECT COUNT(*) as count FROM events WHERE listing_id = ? AND status IN ('draft', 'published')",
      [listingId]
    );
    const row = result.rows[0];
    const current = row ? bigIntToNumber(row.count) : 0;

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

  /**
   * Check tier-gated feature access for events (Feature Map Section 3.3)
   * Returns per-feature access flags based on listing tier.
   * Used by EventFormModal UI to show/hide/disable fields by tier.
   *
   * @param listingId Listing ID
   * @returns TierFeatureAccess with per-feature flags
   * @phase Phase 1A Gap-Fill
   */
  async checkTierFeatureAccess(listingId: number): Promise<TierFeatureAccess> {
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    const tier = listing.tier;

    // Load base tier limits from DB (for reference/future use)
    let _baseLimits: Record<string, unknown> | null = null;
    try {
      _baseLimits = await getTierLimitsForTier(tier, this.db) as unknown as Record<string, unknown>;
    } catch {
      // DB limits not available — using hardcoded constants
    }

    return {
      tier,
      maxMediaPerEvent: TIER_MEDIA_LIMITS[tier] ?? 1,
      allowExternalTicketLink: tier !== 'essentials',
      allowNativeTicketing: tier === 'preferred' || tier === 'premium',
      maxTicketTiers: (tier === 'preferred' || tier === 'premium') ? 5 : 0,
      allowRecurring: tier !== 'essentials',
      maxCoHosts: TIER_CO_HOST_LIMITS[tier] ?? 0,
      allowCheckIn: tier !== 'essentials',
      allowWaitlist: tier !== 'essentials',
      allowFeatured: tier === 'preferred' || tier === 'premium',
    };
  }

  // ==========================================================================
  // UTILITY Operations
  // ==========================================================================

  /**
   * Generate URL-safe slug from title
   * @param title Event title
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
          'EventService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Get event by slug with parent listing data for detail page
   * Single query with JOIN for optimal performance
   *
   * @param slug Event slug
   * @returns EventDetailData or null
   * @phase Phase 1 - Event Detail Page Core
   */
  async getBySlugWithListing(slug: string): Promise<EventDetailData | null> {
    const result = await this.db.query(
      `SELECT
        e.*,
        l.name AS listing_name,
        l.slug AS listing_slug,
        l.logo_url AS listing_logo,
        l.cover_image_url AS listing_cover_image,
        l.tier AS listing_tier,
        l.claimed AS listing_claimed,
        l.phone AS listing_phone,
        l.email AS listing_email,
        l.website AS listing_website,
        l.city AS listing_city,
        l.state AS listing_state
      FROM events e
      LEFT JOIN listings l ON e.listing_id = l.id
      WHERE e.slug = ?`,
      [slug]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToEventDetail(row);
  }

  /**
   * Get upcoming events from the same listing, excluding current event
   * Used for "Other Events" sidebar section
   *
   * @param listingId Listing ID
   * @param excludeEventId Current event ID to exclude
   * @param limit Maximum events to return (default: 3)
   * @returns Array of upcoming events
   * @phase Phase 1 - Event Detail Page Core
   */
  async getUpcomingByListing(
    listingId: number,
    excludeEventId: number,
    limit: number = 3
  ): Promise<Event[]> {
    const result: DbResult<EventRow> = await this.db.query(
      `SELECT * FROM events
       WHERE listing_id = ?
         AND id != ?
         AND status = 'published'
         AND start_date > NOW()
       ORDER BY start_date ASC
       LIMIT ?`,
      [listingId, excludeEventId, limit]
    );

    return result.rows.map((r) => this.mapRowToEvent(r));
  }

  /**
   * Increment event view count
   * @param id Event ID
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE events SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Send RSVP confirmation email
   * @param rsvpId RSVP ID
   */
  async sendRsvpConfirmation(rsvpId: number): Promise<void> {
    try {
      const rsvpResult = await this.db.query<{ event_id: number; user_id: number }>(
        'SELECT event_id, user_id FROM event_rsvps WHERE id = ?',
        [rsvpId]
      );
      const rsvp = rsvpResult.rows[0];
      if (!rsvp) return;

      const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();
      const eventNotificationService = new EventNotificationService(this.db, notificationService);
      await eventNotificationService.notifyRsvpConfirmed(rsvp.event_id, rsvp.user_id);
    } catch (err) {
      ErrorService.capture('[EventService] sendRsvpConfirmation failed:', err);
    }
  }

  /**
   * Send event reminder to all RSVPs
   * @param eventId Event ID
   */
  async sendEventReminder(eventId: number): Promise<void> {
    // Event reminders are handled by the cron endpoint:
    // POST /api/admin/notifications/cron/event-reminders
    // This method is retained for programmatic trigger if needed.
    try {
      const rsvps = await this.db.query<{ user_id: number }>(
        "SELECT user_id FROM event_rsvps WHERE event_id = ? AND rsvp_status IN ('confirmed', 'pending')",
        [eventId]
      );
      const event = await this.getById(eventId);
      if (!event) return;

      const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();
      const eventNotificationService = new EventNotificationService(this.db, notificationService);

      for (const rsvp of rsvps.rows) {
        await eventNotificationService.notifyRsvpConfirmed(rsvp.user_id, eventId);
      }
    } catch (err) {
      ErrorService.capture('[EventService] sendEventReminder failed:', err);
    }
  }

  /**
   * Mark completed events (cron job)
   * @returns Number of events marked as completed
   */
  async markCompletedEvents(): Promise<number> {
    const result: DbResult<EventRow> = await this.db.query(
      `UPDATE events
       SET status = 'completed'
       WHERE status = 'published'
         AND end_date <= NOW()`
    );

    return result.rowCount || 0;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map a joined event+listing row to EventDetailData
   * @param row Raw database row with event and listing columns
   * @phase Phase 1 - Event Detail Page Core
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToEventDetail(row: any): EventDetailData {
    const event = this.mapRowToEvent(row as EventRow);
    return {
      ...event,
      listing_name: row.listing_name || null,
      listing_slug: row.listing_slug || null,
      listing_logo: row.listing_logo || null,
      listing_cover_image: row.listing_cover_image || null,
      listing_tier: row.listing_tier || null,
      listing_claimed: Boolean(row.listing_claimed),
      listing_rating: row.listing_rating ? Number(row.listing_rating) : null,
      listing_review_count: row.listing_review_count
        ? bigIntToNumber(row.listing_review_count)
        : null,
      listing_phone: row.listing_phone || null,
      listing_email: row.listing_email || null,
      listing_website: row.listing_website || null,
      listing_city: row.listing_city || null,
      listing_state: row.listing_state || null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
    };
  }

  /**
   * Get aggregate event statistics for admin dashboard
   */
  async getEventStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    cancelled: number;
    featured: number;
    upcoming: number;
    byType: Record<string, number>;
  }> {
    const [totalResult, statusResult, featuredResult, upcomingResult, typeResult] = await Promise.all([
      this.db.query<{ total: bigint | number }>('SELECT COUNT(*) as total FROM events'),
      this.db.query<{ status: string; count: bigint | number }>(
        'SELECT status, COUNT(*) as count FROM events GROUP BY status'
      ),
      this.db.query<{ total: bigint | number }>(
        'SELECT COUNT(*) as total FROM events WHERE is_featured = 1'
      ),
      this.db.query<{ total: bigint | number }>(
        "SELECT COUNT(*) as total FROM events WHERE start_date > NOW() AND status = 'published'"
      ),
      this.db.query<{ event_type: string; count: bigint | number }>(
        'SELECT event_type, COUNT(*) as count FROM events WHERE event_type IS NOT NULL GROUP BY event_type'
      ),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of statusResult.rows) {
      statusCounts[row.status] = bigIntToNumber(row.count);
    }

    const byType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      if (row.event_type) {
        byType[row.event_type] = bigIntToNumber(row.count);
      }
    }

    return {
      total: bigIntToNumber(totalResult.rows[0]?.total ?? 0),
      approved: statusCounts['published'] || 0,
      pending: statusCounts['draft'] || 0,
      cancelled: statusCounts['cancelled'] || 0,
      featured: bigIntToNumber(featuredResult.rows[0]?.total ?? 0),
      upcoming: bigIntToNumber(upcomingResult.rows[0]?.total ?? 0),
      byType,
    };
  }

  /**
   * Toggle the featured status of an event
   */
  async featureEvent(eventId: number, featured: boolean): Promise<void> {
    const existing = await this.db.query<EventRow>('SELECT id FROM events WHERE id = ?', [eventId]);
    if (existing.rows.length === 0) {
      throw BizError.notFound('Event', eventId);
    }
    await this.db.query('UPDATE events SET is_featured = ? WHERE id = ?', [featured ? 1 : 0, eventId]);
  }

  /**
   * Update the status of an event
   */
  async updateEventStatus(eventId: number, status: string): Promise<void> {
    const validStatuses = ['draft', 'published', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      throw BizError.badRequest(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    const existing = await this.db.query<EventRow>('SELECT id FROM events WHERE id = ?', [eventId]);
    if (existing.rows.length === 0) {
      throw BizError.notFound('Event', eventId);
    }
    try {
      await this.db.query('UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?', [status, eventId]);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errno' in error && (error as { errno: number }).errno === 1205) {
        throw new BizError({
          code: 'CONFLICT',
          message: 'Event is currently being modified by another operation. Please try again in a moment.'
        });
      }
      throw error;
    }
  }

  /**
   * Bulk delete events with cascade cleanup
   */
  async bulkDeleteEvents(eventIds: number[]): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{ id: number; success: boolean; error?: string }>;
  }> {
    let successCount = 0;
    let failureCount = 0;
    const results: Array<{ id: number; success: boolean; error?: string }> = [];

    for (const eventId of eventIds) {
      try {
        const existing = await this.db.query<EventRow>('SELECT id FROM events WHERE id = ?', [eventId]);
        if (existing.rows.length === 0) {
          results.push({ id: eventId, success: false, error: 'Event not found' });
          failureCount++;
          continue;
        }

        const relatedTables = [
          'event_rsvps', 'event_saves', 'event_analytics', 'event_shares',
          'event_follows', 'event_reviews', 'event_sponsors', 'event_waitlist', 'event_tickets'
        ];
        for (const table of relatedTables) {
          await this.db.query(`DELETE FROM ${table} WHERE event_id = ?`, [eventId]);
        }

        await this.db.query('DELETE FROM events WHERE id = ?', [eventId]);

        results.push({ id: eventId, success: true });
        successCount++;
      } catch (error) {
        results.push({
          id: eventId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }

    return { successCount, failureCount, results };
  }

  // ==========================================================================
  // Community Event Methods (Phase 3A)
  // ==========================================================================

  /**
   * Create a community event submitted by a general user
   * @param userId User ID of the submitter
   * @param data Community event data
   * @returns Created event
   */
  async createCommunityEvent(userId: number, data: CreateCommunityEventInput): Promise<Event> {
    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (startDate >= endDate) {
      throw new InvalidEventDatesError(startDate, endDate);
    }

    const now = new Date();
    if (startDate < now) {
      throw BizError.badRequest('Event start date cannot be in the past', { startDate });
    }

    // Generate slug
    const slug = await this.generateSlug(data.title);

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError(slug);
    }

    const result: DbResult<EventRow> = await this.db.query(
      `INSERT INTO events (
        listing_id, title, slug, description, event_type,
        start_date, end_date, timezone,
        location_type, venue_name, address, city, state, zip, virtual_link,
        total_capacity, remaining_capacity,
        status, is_community_event, submitted_by_user_id
      ) VALUES (
        NULL, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?,
        'pending_moderation', 1, ?
      )`,
      [
        data.title,
        slug,
        data.description || null,
        data.event_type || null,
        startDate,
        endDate,
        data.timezone || 'America/New_York',
        data.location_type || LocationType.PHYSICAL,
        data.venue_name || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.virtual_link || null,
        data.total_capacity || null,
        data.total_capacity || null,
        userId
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create community event', new Error('No insert ID returned'));
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create community event', new Error('Failed to retrieve created event'));
    }

    return created;
  }

  /**
   * Get community events pending moderation
   * @returns Array of events pending moderation
   */
  async getCommunityEventsPendingModeration(): Promise<Event[]> {
    const result: DbResult<EventRow> = await this.db.query<EventRow>(
      `SELECT * FROM events
       WHERE is_community_event = 1
         AND status = 'pending_moderation'
       ORDER BY created_at ASC`
    );

    return result.rows.map((r) => this.mapRowToEvent(r));
  }

  /**
   * Approve a community event
   * @param eventId Event ID
   */
  async approveCommunityEvent(eventId: number): Promise<void> {
    await this.db.query(
      'UPDATE events SET status = ? WHERE id = ?',
      ['published', eventId]
    );
  }

  /**
   * Reject a community event
   * @param eventId Event ID
   * @param notes Rejection reason
   */
  async rejectCommunityEvent(eventId: number, notes: string): Promise<void> {
    await this.db.query(
      'UPDATE events SET status = ?, moderation_notes = ? WHERE id = ?',
      ['cancelled', notes, eventId]
    );
  }

  /**
   * Map database row to Event interface
   */
  private mapRowToEvent(row: EventRow): Event {
    return {
      id: row.id,
      listing_id: row.listing_id,
      title: row.title,
      slug: row.slug,
      description: row.description || null,
      event_type: row.event_type || null,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      timezone: row.timezone || 'America/New_York',
      // @fixed 2026-01-04 - Use location_type enum instead of is_virtual
      location_type: row.location_type as LocationType,
      venue_name: row.venue_name || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      zip: row.zip || null,  // CORRECT: zip not zip_code
      virtual_link: row.virtual_link || null,  // CORRECT: virtual_link not virtual_url
      banner_image: row.banner_image || null,  // CORRECT: banner_image not image_url
      thumbnail: row.thumbnail || null,
      is_ticketed: Boolean(row.is_ticketed),  // CORRECT: is_ticketed not registration_required
      ticket_price: row.ticket_price || null,  // CORRECT: ticket_price not price
      total_capacity: row.total_capacity || null,  // CORRECT: total_capacity not capacity
      remaining_capacity: row.remaining_capacity || null,
      rsvp_count: row.rsvp_count || 0,
      status: row.status as EventStatus,
      is_featured: Boolean(row.is_featured),
      is_mock: Boolean(row.is_mock),
      view_count: row.view_count || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      // Phase 1A Gap-Fill fields
      external_ticket_url: row.external_ticket_url || null,
      age_restrictions: row.age_restrictions || null,
      parking_notes: row.parking_notes || null,
      weather_contingency: row.weather_contingency || null,
      waitlist_enabled: Boolean(row.waitlist_enabled),
      check_in_enabled: Boolean(row.check_in_enabled),
      // Phase 3A: Community event fields
      is_community_event: Boolean(row.is_community_event),
      submitted_by_user_id: row.submitted_by_user_id ?? null,
      moderation_notes: row.moderation_notes ?? null,
      // Phase 3B: Recurring event fields
      is_recurring: Boolean(row.is_recurring),
      recurrence_type: row.recurrence_type || null,
      recurrence_days: row.recurrence_days ? safeJsonParse<number[]>(row.recurrence_days, []) : null,
      recurrence_end_date: row.recurrence_end_date ? new Date(row.recurrence_end_date) : null,
      parent_event_id: row.parent_event_id ?? null,
      series_index: row.series_index ?? null,
    };
  }

  /**
   * Map database row to RSVP interface
   */
  private mapRowToRSVP(row: EventRsvpRow): RSVP {
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      ticket_id: row.ticket_id || null,
      rsvp_status: row.rsvp_status as RSVPStatus,
      rsvp_date: new Date(row.rsvp_date),
      attended: Boolean(row.attended)
    };
  }

  /**
   * Map database row to TicketTier interface
   */
  private mapRowToTicketTier(row: EventTicketRow): TicketTier {
    return {
      id: row.id,
      event_id: row.event_id,
      ticket_name: row.ticket_name,
      ticket_price: parseFloat(row.ticket_price),
      quantity_total: row.quantity_total,
      quantity_sold: row.quantity_sold || 0
    };
  }

  // ============================================================================
  // Phase 3: Analytics, Shares & Follows
  // ============================================================================

  /**
   * Record an analytics event with server-side deduplication for page_view/impression
   */
  async recordAnalyticsEvent(
    eventId: number,
    metricType: EventAnalyticsMetricType,
    userId: number | null,
    source?: EventAnalyticsSource,
    platform?: string
  ): Promise<void> {
    // Dedup page_view/impression within 30 seconds
    if (metricType === 'page_view' || metricType === 'impression') {
      const recentDup = await this.db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM event_analytics
         WHERE event_id = ? AND metric_type = ?
         AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))
         AND created_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)`,
        [eventId, metricType, userId, userId]
      );
      if (bigIntToNumber(recentDup.rows[0]?.count ?? 0) > 0) return;
    }

    await this.db.query(
      `INSERT INTO event_analytics (event_id, metric_type, user_id, source, platform)
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, metricType, userId, source || null, platform || null]
    );
  }

  /**
   * Get analytics funnel data for an event
   */
  async getEventAnalyticsFunnel(eventId: number): Promise<EventAnalyticsFunnel> {
    const [impressions, pageViews, saves, shares, externalClicks, rsvps] = await Promise.all([
      this.db.query<{ count: bigint }>(
        "SELECT COUNT(*) as count FROM event_analytics WHERE event_id = ? AND metric_type = 'impression'",
        [eventId]
      ),
      this.db.query<{ count: bigint }>(
        "SELECT COUNT(*) as count FROM event_analytics WHERE event_id = ? AND metric_type = 'page_view'",
        [eventId]
      ),
      this.db.query<{ count: bigint }>(
        "SELECT COUNT(*) as count FROM event_saves WHERE event_id = ?",
        [eventId]
      ),
      this.db.query<{ count: bigint }>(
        "SELECT COUNT(*) as count FROM event_shares WHERE event_id = ?",
        [eventId]
      ),
      this.db.query<{ count: bigint }>(
        "SELECT COUNT(*) as count FROM event_analytics WHERE event_id = ? AND metric_type = 'external_click'",
        [eventId]
      ),
      this.db.query<{ count: bigint }>(
        "SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = ? AND rsvp_status = 'confirmed'",
        [eventId]
      ),
    ]);

    const imp = bigIntToNumber(impressions.rows[0]?.count ?? 0);
    const pv = bigIntToNumber(pageViews.rows[0]?.count ?? 0);
    const sv = bigIntToNumber(saves.rows[0]?.count ?? 0);
    const sh = bigIntToNumber(shares.rows[0]?.count ?? 0);
    const ec = bigIntToNumber(externalClicks.rows[0]?.count ?? 0);
    const rs = bigIntToNumber(rsvps.rows[0]?.count ?? 0);

    return {
      event_id: eventId,
      impressions: imp,
      page_views: pv,
      saves: sv,
      shares: sh,
      external_clicks: ec,
      rsvps: rs,
      conversion_rates: {
        view_rate: imp > 0 ? pv / imp : 0,
        save_rate: pv > 0 ? sv / pv : 0,
        rsvp_rate: pv > 0 ? rs / pv : 0,
      },
    };
  }

  /**
   * Record a share event
   */
  async recordShare(input: RecordEventShareInput): Promise<void> {
    await this.db.query(
      `INSERT INTO event_shares (event_id, user_id, share_type, platform, share_url)
       VALUES (?, ?, ?, ?, ?)`,
      [input.event_id, input.user_id || null, input.share_type, input.platform, input.share_url]
    );
  }

  /**
   * Get shares grouped by platform for an event
   */
  async getSharesByPlatform(eventId: number): Promise<EventSharePlatformData[]> {
    const result = await this.db.query<{
      platform: string;
      share_count: bigint;
      total_clicks: bigint;
    }>(
      `SELECT platform, COUNT(*) as share_count, SUM(clicks) as total_clicks
       FROM event_shares WHERE event_id = ?
       GROUP BY platform ORDER BY share_count DESC`,
      [eventId]
    );

    return result.rows.map(row => {
      const shares = bigIntToNumber(row.share_count);
      const clicks = bigIntToNumber(row.total_clicks ?? 0);
      return {
        platform: row.platform as EventSharePlatform,
        shares,
        clicks,
        clickRate: shares > 0 ? clicks / shares : 0,
      };
    });
  }

  /**
   * Follow a business/category for event notifications (upsert)
   */
  async followBusiness(
    userId: number,
    followType: EventFollowType,
    targetId: number | null,
    frequency: EventNotificationFrequency = 'realtime'
  ): Promise<{ id: number }> {
    await this.db.query(
      `INSERT INTO event_follows (user_id, follow_type, target_id, notification_frequency)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE notification_frequency = VALUES(notification_frequency)`,
      [userId, followType, targetId, frequency]
    );

    const result = await this.db.query<{ id: number }>(
      `SELECT id FROM event_follows WHERE user_id = ? AND follow_type = ? AND (target_id = ? OR (target_id IS NULL AND ? IS NULL))`,
      [userId, followType, targetId, targetId]
    );

    return { id: result.rows[0]?.id ?? 0 };
  }

  /**
   * Unfollow — delete from event_follows by id
   */
  async unfollowBusiness(followId: number): Promise<void> {
    await this.db.query('DELETE FROM event_follows WHERE id = ?', [followId]);
  }

  /**
   * Check follow status for a user
   */
  async getFollowStatus(
    userId: number,
    followType: EventFollowType,
    targetId: number | null
  ): Promise<EventFollowState> {
    const result = await this.db.query<{ id: number; notification_frequency: string }>(
      `SELECT id, notification_frequency FROM event_follows
       WHERE user_id = ? AND follow_type = ? AND (target_id = ? OR (target_id IS NULL AND ? IS NULL))`,
      [userId, followType, targetId, targetId]
    );

    if (result.rows.length === 0) {
      return { isFollowing: false, followId: null, frequency: 'realtime' };
    }

    const row = result.rows[0]!;
    return {
      isFollowing: true,
      followId: row.id,
      frequency: row.notification_frequency as EventNotificationFrequency,
    };
  }

  /**
   * Update notification frequency on an existing follow
   */
  async updateFollowFrequency(followId: number, frequency: EventNotificationFrequency): Promise<void> {
    await this.db.query(
      'UPDATE event_follows SET notification_frequency = ? WHERE id = ?',
      [frequency, followId]
    );
  }

  // ==========================================================================
  // Phase 4: Event Review Methods
  // ==========================================================================

  /**
   * Check if a user is eligible to review an event
   * Eligibility: must have RSVP'd (confirmed) + event must be past + not already reviewed + not listing owner
   */
  async canUserReviewEvent(userId: number, eventId: number): Promise<{ canReview: boolean; reason?: string }> {
    // Check if event exists and is past
    const eventResult = await this.db.query<{
      id: number;
      end_date: Date;
      status: string;
      listing_id: number;
    }>(
      'SELECT id, end_date, status, listing_id FROM events WHERE id = ?',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return { canReview: false, reason: 'Event not found' };
    }

    const event = eventResult.rows[0]!;
    const isPast = new Date(event.end_date) < new Date() || event.status === 'completed';
    if (!isPast) {
      return { canReview: false, reason: 'Event has not ended yet' };
    }

    // Check if user is the listing owner
    const ownerResult = await this.db.query<{ user_id: number }>(
      'SELECT user_id FROM listings WHERE id = ?',
      [event.listing_id]
    );
    if (ownerResult.rows.length > 0 && ownerResult.rows[0]!.user_id === userId) {
      return { canReview: false, reason: 'Listing owners cannot review their own events' };
    }

    // Check RSVP status
    const rsvpResult = await this.db.query<{ rsvp_status: string }>(
      "SELECT rsvp_status FROM event_rsvps WHERE event_id = ? AND user_id = ? AND rsvp_status = 'confirmed'",
      [eventId, userId]
    );
    if (rsvpResult.rows.length === 0) {
      return { canReview: false, reason: 'You must have attended this event to leave a review' };
    }

    // Check if already reviewed
    const existingResult = await this.db.query<{ id: number }>(
      'SELECT id FROM event_reviews WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    if (existingResult.rows.length > 0) {
      return { canReview: false, reason: 'You have already reviewed this event' };
    }

    return { canReview: true };
  }

  /**
   * Create an event review
   * Auto-approves reviews for attended events (no moderation queue per Feature Map)
   */
  async createEventReview(
    eventId: number,
    userId: number,
    data: { rating: number; review_text?: string; images?: string[] }
  ): Promise<EventReview> {
    try {
      await this.db.query(
        `INSERT INTO event_reviews (event_id, user_id, rating, review_text, images, status)
         VALUES (?, ?, ?, ?, ?, 'approved')`,
        [eventId, userId, data.rating, data.review_text || null, data.images ? JSON.stringify(data.images) : null]
      );
    } catch (error: unknown) {
      // Catch unique constraint violation (duplicate review)
      const mysqlError = error as { code?: string; errno?: number };
      if (mysqlError?.code === 'ER_DUP_ENTRY' || mysqlError?.errno === 1062) {
        throw new DuplicateEventReviewError(eventId, userId);
      }
      throw error;
    }

    // Fetch the created review with user data
    const result = await this.db.query<EventReview & { id: number }>(
      `SELECT er.*, COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name, u.avatar_url as user_avatar
       FROM event_reviews er
       LEFT JOIN users u ON u.id = er.user_id
       WHERE er.event_id = ? AND er.user_id = ?
       ORDER BY er.created_at DESC
       LIMIT 1`,
      [eventId, userId]
    );

    return result.rows[0] as EventReview;
  }

  /**
   * Get paginated reviews for an event (with user data joined)
   */
  async getEventReviews(
    eventId: number,
    page: number = 1,
    limit: number = 5
  ): Promise<{ reviews: EventReview[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.db.query<{ total: bigint | number }>(
      "SELECT COUNT(*) as total FROM event_reviews WHERE event_id = ? AND status = 'approved'",
      [eventId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    // Get paginated reviews with user data
    const result = await this.db.query<EventReview>(
      `SELECT er.id, er.event_id, er.user_id, er.rating, er.review_text,
              er.is_testimonial_approved, er.status, er.created_at, er.updated_at,
              COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name, u.avatar_url as user_avatar
       FROM event_reviews er
       LEFT JOIN users u ON u.id = er.user_id
       WHERE er.event_id = ? AND er.status = 'approved'
       ORDER BY er.created_at DESC
       LIMIT ? OFFSET ?`,
      [eventId, limit, offset]
    );

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get rating distribution for an event
   * Returns counts per star level (1-5), total, and average
   */
  async getEventReviewDistribution(eventId: number): Promise<EventReviewDistribution> {
    const result = await this.db.query<{ rating: number; count: bigint | number }>(
      "SELECT rating, COUNT(*) as count FROM event_reviews WHERE event_id = ? AND status = 'approved' GROUP BY rating",
      [eventId]
    );

    const distribution: EventReviewDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0, average: 0 };

    let totalStars = 0;
    for (const row of result.rows) {
      const count = bigIntToNumber(row.count);
      const rating = row.rating as 1 | 2 | 3 | 4 | 5;
      distribution[rating] = count;
      distribution.total += count;
      totalStars += rating * count;
    }

    distribution.average = distribution.total > 0
      ? Math.round((totalStars / distribution.total) * 10) / 10
      : 0;

    return distribution;
  }

  /**
   * Approve a review as a testimonial (author only)
   * Sets is_testimonial_approved = 1 for the given review
   */
  async approveTestimonial(reviewId: number, userId: number): Promise<void> {
    // Verify review exists and belongs to user
    const result = await this.db.query<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM event_reviews WHERE id = ?',
      [reviewId]
    );

    if (result.rows.length === 0) {
      throw new EventReviewNotFoundError(reviewId);
    }

    if (result.rows[0]!.user_id !== userId) {
      throw new EventReviewNotEligibleError('Only the review author can approve testimonials');
    }

    await this.db.query(
      'UPDATE event_reviews SET is_testimonial_approved = 1 WHERE id = ?',
      [reviewId]
    );
  }

  /**
   * Get approved testimonials for a listing (across all events)
   * Used for surfacing testimonials on listing pages
   */
  async getTestimonials(listingId: number, limit: number = 5): Promise<EventReview[]> {
    const result = await this.db.query<EventReview>(
      `SELECT er.id, er.event_id, er.user_id, er.rating, er.review_text,
              er.is_testimonial_approved, er.status, er.created_at, er.updated_at,
              COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name, u.avatar_url as user_avatar
       FROM event_reviews er
       INNER JOIN events e ON e.id = er.event_id
       LEFT JOIN users u ON u.id = er.user_id
       WHERE e.listing_id = ?
         AND er.is_testimonial_approved = 1
         AND er.status = 'approved'
       ORDER BY er.created_at DESC
       LIMIT ?`,
      [listingId, limit]
    );

    return result.rows;
  }

  // ==========================================================================
  // Phase 5: Event Sponsor Methods
  // ==========================================================================

  /**
   * Get active sponsors for an event ordered by tier rank then display_order
   * Used for public display on event detail page
   */
  async getEventSponsors(eventId: number, includeAll = false): Promise<EventSponsor[]> {
    const statusFilter = includeAll ? '' : "AND es.status = 'active'";
    const result = await this.db.query<EventSponsor>(
      `SELECT es.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_sponsors es
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       WHERE es.event_id = ? ${statusFilter}
       ORDER BY FIELD(es.sponsor_tier,'title','gold','silver','bronze','community'), es.display_order ASC`,
      [eventId]
    );

    return result.rows;
  }

  /**
   * Create a new sponsor relationship for an event
   * Checks uniqueness before inserting (throws on duplicate)
   */
  async createEventSponsor(input: CreateEventSponsorInput): Promise<EventSponsor> {
    try {
      await this.db.query(
        `INSERT INTO event_sponsors
           (event_id, sponsor_listing_id, sponsor_tier, display_order, sponsor_logo, sponsor_message, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.event_id,
          input.sponsor_listing_id,
          input.sponsor_tier,
          input.display_order ?? 0,
          input.sponsor_logo ?? null,
          input.sponsor_message ?? null,
          input.start_date ?? null,
          input.end_date ?? null,
        ]
      );
    } catch (error: unknown) {
      const mysqlError = error as { code?: string; errno?: number };
      if (mysqlError?.code === 'ER_DUP_ENTRY' || mysqlError?.errno === 1062) {
        throw new Error('This listing is already a sponsor for this event');
      }
      throw error;
    }

    // Fetch the created sponsor with listing data
    const result = await this.db.query<EventSponsor>(
      `SELECT es.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_sponsors es
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       WHERE es.event_id = ? AND es.sponsor_listing_id = ?
       ORDER BY es.created_at DESC
       LIMIT 1`,
      [input.event_id, input.sponsor_listing_id]
    );

    return result.rows[0] as EventSponsor;
  }

  /**
   * Update sponsor details or status
   */
  async updateEventSponsor(sponsorId: number, input: UpdateEventSponsorInput): Promise<EventSponsor> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.sponsor_tier !== undefined) { fields.push('sponsor_tier = ?'); values.push(input.sponsor_tier); }
    if (input.display_order !== undefined) { fields.push('display_order = ?'); values.push(input.display_order); }
    if (input.sponsor_logo !== undefined) { fields.push('sponsor_logo = ?'); values.push(input.sponsor_logo); }
    if (input.sponsor_message !== undefined) { fields.push('sponsor_message = ?'); values.push(input.sponsor_message); }
    if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
    if (input.start_date !== undefined) { fields.push('start_date = ?'); values.push(input.start_date); }
    if (input.end_date !== undefined) { fields.push('end_date = ?'); values.push(input.end_date); }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(sponsorId);
    await this.db.query(
      `UPDATE event_sponsors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const result = await this.db.query<EventSponsor>(
      `SELECT es.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_sponsors es
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       WHERE es.id = ?`,
      [sponsorId]
    );

    if (result.rows.length === 0) {
      throw new Error('Sponsor not found');
    }

    return result.rows[0] as EventSponsor;
  }

  /**
   * Delete a sponsor relationship
   */
  async deleteEventSponsor(sponsorId: number): Promise<void> {
    await this.db.query('DELETE FROM event_sponsors WHERE id = ?', [sponsorId]);
  }

  /**
   * Increment click count for a sponsor (fire-and-forget)
   */
  async incrementSponsorClick(sponsorId: number): Promise<void> {
    await this.db.query(
      'UPDATE event_sponsors SET click_count = click_count + 1 WHERE id = ?',
      [sponsorId]
    );
  }

  /**
   * Bulk increment impression count for multiple sponsors
   */
  async incrementSponsorImpressions(sponsorIds: number[]): Promise<void> {
    if (sponsorIds.length === 0) return;
    const placeholders = sponsorIds.map(() => '?').join(', ');
    await this.db.query(
      `UPDATE event_sponsors SET impression_count = impression_count + 1 WHERE id IN (${placeholders})`,
      sponsorIds
    );
  }

  /**
   * Get analytics per sponsor for an event (clicks, impressions, CTR)
   */
  async getSponsorAnalytics(eventId: number): Promise<EventSponsorAnalytics[]> {
    const result = await this.db.query<{
      id: number;
      listing_name: string;
      sponsor_tier: string;
      click_count: number;
      impression_count: number;
    }>(
      `SELECT es.id, l.name as listing_name, es.sponsor_tier, es.click_count, es.impression_count
       FROM event_sponsors es
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       WHERE es.event_id = ?
       ORDER BY FIELD(es.sponsor_tier,'title','gold','silver','bronze','community')`,
      [eventId]
    );

    return result.rows.map(row => ({
      sponsor_id: row.id,
      listing_name: row.listing_name,
      sponsor_tier: row.sponsor_tier as EventSponsorAnalytics['sponsor_tier'],
      click_count: row.click_count,
      impression_count: row.impression_count,
      click_through_rate: row.impression_count > 0
        ? Math.round((row.click_count / row.impression_count) * 10000) / 100
        : 0,
    }));
  }

  /**
   * Get all sponsors with pagination for admin view
   */
  async getAdminSponsors(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    sponsor_tier?: string;
    sortColumn?: string;
    sortDirection?: string;
  } = {}): Promise<{ sponsors: AdminEventSponsor[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = '',
      sponsor_tier = '',
      sortColumn = 'created_at',
      sortDirection = 'desc',
    } = filters;

    const offset = (page - 1) * pageSize;
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (search) {
      whereClauses.push('(e.title LIKE ? OR l.name LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClauses.push('es.status = ?');
      values.push(status);
    }
    if (sponsor_tier) {
      whereClauses.push('es.sponsor_tier = ?');
      values.push(sponsor_tier);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSort = ['created_at', 'sponsor_tier', 'status', 'click_count', 'impression_count'];
    const safeSort = allowedSort.includes(sortColumn) ? `es.${sortColumn}` : 'es.created_at';
    const safeDir = sortDirection === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total
       FROM event_sponsors es
       LEFT JOIN events e ON e.id = es.event_id
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       ${where}`,
      values
    );
    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<AdminEventSponsor>(
      `SELECT es.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date, e.status as event_status
       FROM event_sponsors es
       LEFT JOIN events e ON e.id = es.event_id
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       ${where}
       ORDER BY ${safeSort} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { sponsors: result.rows, total };
  }

  /**
   * Get all sponsorships for a listing (dashboard view for the sponsoring business)
   */
  async getSponsorsByListing(listingId: number): Promise<EventSponsor[]> {
    const result = await this.db.query<EventSponsor>(
      `SELECT es.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier,
              e.title as event_title, e.slug as event_slug
       FROM event_sponsors es
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       LEFT JOIN events e ON e.id = es.event_id
       WHERE es.sponsor_listing_id = ?
       ORDER BY es.created_at DESC`,
      [listingId]
    );

    return result.rows;
  }

  /**
   * Get the active title-tier sponsor for an event (for hero badge display)
   */
  async getTitleSponsor(eventId: number): Promise<EventSponsor | null> {
    const result = await this.db.query<EventSponsor>(
      `SELECT es.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_sponsors es
       LEFT JOIN listings l ON l.id = es.sponsor_listing_id
       WHERE es.event_id = ? AND es.sponsor_tier = 'title' AND es.status = 'active'
       LIMIT 1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  // ============================================================================
  // Phase 6A: User Dashboard Event Queries
  // ============================================================================

  /**
   * Get upcoming events the user has RSVPed to (confirmed, future start date)
   */
  async getUserUpcomingEvents(
    userId: number,
    page: number,
    limit: number
  ): Promise<{ items: UserEventItem[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ total: bigint }>(
      `SELECT COUNT(*) AS total
       FROM events e
       JOIN event_rsvps r ON r.event_id = e.id
       WHERE r.user_id = ? AND r.rsvp_status = 'confirmed'
         AND e.start_date > NOW() AND e.status = 'published'`,
      [userId]
    );

    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<UserEventItem>(
      `SELECT e.id, e.listing_id, e.title, e.slug, e.description, e.event_type,
              e.start_date, e.end_date, e.timezone, e.location_type,
              e.venue_name, e.city, e.state, e.banner_image, e.thumbnail,
              e.is_ticketed, e.ticket_price, e.total_capacity, e.rsvp_count,
              e.status, e.is_featured,
              l.name AS listing_name, l.slug AS listing_slug, l.logo_url AS listing_logo,
              r.rsvp_status, r.rsvp_date
       FROM events e
       JOIN event_rsvps r ON r.event_id = e.id
       LEFT JOIN listings l ON l.id = e.listing_id
       WHERE r.user_id = ? AND r.rsvp_status = 'confirmed'
         AND e.start_date > NOW() AND e.status = 'published'
       ORDER BY e.start_date ASC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { items: result.rows, total };
  }

  /**
   * Get saved events with full event details for dashboard display
   */
  async getUserSavedEventsWithDetails(
    userId: number,
    page: number,
    limit: number
  ): Promise<{ items: UserEventItem[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ total: bigint }>(
      `SELECT COUNT(*) AS total
       FROM events e
       JOIN event_saves s ON s.event_id = e.id
       WHERE s.user_id = ? AND e.status = 'published'`,
      [userId]
    );

    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<UserEventItem>(
      `SELECT e.id, e.listing_id, e.title, e.slug, e.description, e.event_type,
              e.start_date, e.end_date, e.timezone, e.location_type,
              e.venue_name, e.city, e.state, e.banner_image, e.thumbnail,
              e.is_ticketed, e.ticket_price, e.total_capacity, e.rsvp_count,
              e.status, e.is_featured,
              l.name AS listing_name, l.slug AS listing_slug, l.logo_url AS listing_logo
       FROM events e
       JOIN event_saves s ON s.event_id = e.id
       LEFT JOIN listings l ON l.id = e.listing_id
       WHERE s.user_id = ? AND e.status = 'published'
       ORDER BY e.start_date ASC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { items: result.rows, total };
  }

  /**
   * Get past events the user attended (confirmed RSVP, event ended)
   */
  async getUserPastEvents(
    userId: number,
    page: number,
    limit: number
  ): Promise<{ items: UserEventItem[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ total: bigint }>(
      `SELECT COUNT(*) AS total
       FROM events e
       JOIN event_rsvps r ON r.event_id = e.id
       WHERE r.user_id = ? AND r.rsvp_status = 'confirmed'
         AND e.end_date < NOW()`,
      [userId]
    );

    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<UserEventItem>(
      `SELECT e.id, e.listing_id, e.title, e.slug, e.description, e.event_type,
              e.start_date, e.end_date, e.timezone, e.location_type,
              e.venue_name, e.city, e.state, e.banner_image, e.thumbnail,
              e.is_ticketed, e.ticket_price, e.total_capacity, e.rsvp_count,
              e.status, e.is_featured,
              l.name AS listing_name, l.slug AS listing_slug, l.logo_url AS listing_logo,
              r.rsvp_status, r.rsvp_date,
              (SELECT COUNT(*) FROM event_reviews rev
               WHERE rev.event_id = e.id AND rev.user_id = ?) AS has_reviewed
       FROM events e
       JOIN event_rsvps r ON r.event_id = e.id
       LEFT JOIN listings l ON l.id = e.listing_id
       WHERE r.user_id = ? AND r.rsvp_status = 'confirmed'
         AND e.end_date < NOW()
       ORDER BY e.end_date DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    return { items: result.rows, total };
  }

  /**
   * Get events created/managed by listings the user owns or manages
   */
  async getUserCreatedEvents(
    userId: number,
    page: number,
    limit: number
  ): Promise<{ items: UserEventItem[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ total: bigint }>(
      `SELECT COUNT(*) AS total
       FROM events e
       JOIN listings l ON l.id = e.listing_id
       JOIN listing_users lu ON lu.listing_id = l.id
       WHERE lu.user_id = ? AND lu.role IN ('owner', 'manager')`,
      [userId]
    );

    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<UserEventItem>(
      `SELECT e.id, e.listing_id, e.title, e.slug, e.description, e.event_type,
              e.start_date, e.end_date, e.timezone, e.location_type,
              e.venue_name, e.city, e.state, e.banner_image, e.thumbnail,
              e.is_ticketed, e.ticket_price, e.total_capacity, e.rsvp_count,
              e.status, e.is_featured,
              l.name AS listing_name, l.slug AS listing_slug, l.logo_url AS listing_logo,
              (SELECT COUNT(*) FROM event_analytics ea
               WHERE ea.event_id = e.id AND ea.metric_type = 'page_view') AS page_views,
              (SELECT COUNT(*) FROM event_shares es WHERE es.event_id = e.id) AS shares
       FROM events e
       JOIN listings l ON l.id = e.listing_id
       JOIN listing_users lu ON lu.listing_id = l.id
       WHERE lu.user_id = ? AND lu.role IN ('owner', 'manager')
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { items: result.rows, total };
  }

  // ============================================================================
  // Phase 6B: Calendar Queries
  // ============================================================================

  /**
   * Get all user-related events within a date range for calendar display.
   * Combines: RSVP'd (going), saved, and created events via UNION query.
   * Returns lightweight CalendarEvent[] without pagination (calendar shows all in range).
   *
   * Priority: going > saved > created (UNION deduplicates by event ID)
   *
   * @param userId - Authenticated user ID
   * @param startDate - Range start (ISO string, inclusive)
   * @param endDate - Range end (ISO string, inclusive)
   */
  async getUserCalendarEvents(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const result = await this.db.query<CalendarEvent>(
      `SELECT e.id, e.title, e.slug, e.start_date, e.end_date, e.timezone,
              e.location_type, e.venue_name, e.city, e.state,
              e.banner_image, e.thumbnail, e.is_ticketed, e.ticket_price,
              e.total_capacity, e.rsvp_count, e.status,
              l.name AS listing_name, l.slug AS listing_slug,
              'going' AS calendar_status
       FROM events e
       JOIN event_rsvps r ON r.event_id = e.id
       LEFT JOIN listings l ON l.id = e.listing_id
       WHERE r.user_id = ? AND r.rsvp_status = 'confirmed'
         AND e.start_date <= ? AND e.end_date >= ?
         AND e.status IN ('published', 'completed')

       UNION

       SELECT e.id, e.title, e.slug, e.start_date, e.end_date, e.timezone,
              e.location_type, e.venue_name, e.city, e.state,
              e.banner_image, e.thumbnail, e.is_ticketed, e.ticket_price,
              e.total_capacity, e.rsvp_count, e.status,
              l.name AS listing_name, l.slug AS listing_slug,
              'saved' AS calendar_status
       FROM events e
       JOIN event_saves s ON s.event_id = e.id
       LEFT JOIN listings l ON l.id = e.listing_id
       WHERE s.user_id = ? AND e.status = 'published'
         AND e.start_date <= ? AND e.end_date >= ?
         AND e.id NOT IN (
           SELECT event_id FROM event_rsvps
           WHERE user_id = ? AND rsvp_status = 'confirmed'
         )

       UNION

       SELECT e.id, e.title, e.slug, e.start_date, e.end_date, e.timezone,
              e.location_type, e.venue_name, e.city, e.state,
              e.banner_image, e.thumbnail, e.is_ticketed, e.ticket_price,
              e.total_capacity, e.rsvp_count, e.status,
              l.name AS listing_name, l.slug AS listing_slug,
              'created' AS calendar_status
       FROM events e
       JOIN listings l ON l.id = e.listing_id
       JOIN listing_users lu ON lu.listing_id = l.id
       WHERE lu.user_id = ? AND lu.role IN ('owner', 'manager')
         AND e.start_date <= ? AND e.end_date >= ?
         AND e.id NOT IN (
           SELECT event_id FROM event_rsvps
           WHERE user_id = ? AND rsvp_status = 'confirmed'
         )
         AND e.id NOT IN (
           SELECT event_id FROM event_saves WHERE user_id = ?
         )

       ORDER BY start_date ASC`,
      [
        // going
        userId, endDate, startDate,
        // saved
        userId, endDate, startDate, userId,
        // created
        userId, endDate, startDate, userId, userId,
      ]
    );

    return result.rows;
  }

  // ==========================================================================
  // Phase 8C: Event Waitlist Methods
  // ==========================================================================

  /**
   * Join the waitlist for an event (FCFS ordering)
   * Position is auto-assigned as max + 1
   */
  async joinWaitlist(eventId: number, userId: number): Promise<EventWaitlistEntry> {
    // Get current max position
    const maxResult = await this.db.query<{ max_pos: number | null }>(
      `SELECT MAX(position) as max_pos FROM event_waitlist WHERE event_id = ? AND status IN ('waiting', 'offered')`,
      [eventId]
    );
    const nextPosition = (maxResult.rows[0]?.max_pos != null ? bigIntToNumber(maxResult.rows[0].max_pos) : 0) + 1;

    try {
      await this.db.query(
        `INSERT INTO event_waitlist (event_id, user_id, position, status) VALUES (?, ?, ?, 'waiting')`,
        [eventId, userId, nextPosition]
      );
    } catch (error: unknown) {
      const mysqlError = error as { code?: string; errno?: number };
      if (mysqlError?.code === 'ER_DUP_ENTRY' || mysqlError?.errno === 1062) {
        throw BizError.badRequest('Already on waitlist for this event');
      }
      throw error;
    }

    // Fetch the created entry
    const result = await this.db.query<EventWaitlistEntry>(
      `SELECT * FROM event_waitlist WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );

    return result.rows[0] as EventWaitlistEntry;
  }

  /**
   * Leave the waitlist for an event
   */
  async leaveWaitlist(eventId: number, userId: number): Promise<void> {
    await this.db.query(
      `UPDATE event_waitlist SET status = 'cancelled' WHERE event_id = ? AND user_id = ? AND status = 'waiting'`,
      [eventId, userId]
    );
  }

  /**
   * Get user's waitlist position and total active waitlist size
   */
  async getWaitlistPosition(eventId: number, userId: number): Promise<{ position: number | null; total: number; status: WaitlistStatus | null }> {
    const userResult = await this.db.query<{ position: number; status: WaitlistStatus }>(
      `SELECT position, status FROM event_waitlist WHERE event_id = ? AND user_id = ? AND status IN ('waiting', 'offered')`,
      [eventId, userId]
    );

    const totalResult = await this.db.query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM event_waitlist WHERE event_id = ? AND status IN ('waiting', 'offered')`,
      [eventId]
    );

    const total = bigIntToNumber(totalResult.rows[0]?.cnt ?? 0);

    if (userResult.rows.length === 0) {
      return { position: null, total, status: null };
    }

    return {
      position: userResult.rows[0]!.position,
      total,
      status: userResult.rows[0]!.status,
    };
  }

  /**
   * Get full waitlist for an event (for admin/owner views)
   */
  async getWaitlistForEvent(eventId: number): Promise<EventWaitlistEntry[]> {
    const result = await this.db.query<EventWaitlistEntry>(
      `SELECT ew.*, COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name, u.avatar_url as user_avatar
       FROM event_waitlist ew
       JOIN users u ON ew.user_id = u.id
       WHERE ew.event_id = ? AND ew.status IN ('waiting', 'offered')
       ORDER BY ew.position ASC`,
      [eventId]
    );

    return result.rows;
  }

  /**
   * Get attendees with user details for owner/admin views
   * Follows getWaitlistForEvent() JOIN pattern
   * @param eventId Event ID
   * @returns Enriched attendee list with names, emails, avatars
   */
  async getAttendeesWithDetails(eventId: number): Promise<AttendeeDetail[]> {
    const result = await this.db.query<AttendeeDetailRow>(
      `SELECT er.id, er.event_id, er.user_id, er.ticket_id, er.rsvp_status,
              er.rsvp_date, er.attended,
              COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as user_name,
              u.email as user_email, u.avatar_url as user_avatar
       FROM event_rsvps er
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ?
       ORDER BY er.rsvp_date DESC`,
      [eventId]
    );
    return result.rows.map(r => ({
      id: r.id,
      event_id: r.event_id,
      user_id: r.user_id,
      ticket_id: r.ticket_id || null,
      rsvp_status: r.rsvp_status as RSVPStatus,
      rsvp_date: r.rsvp_date,
      attended: Boolean(r.attended),
      user_name: r.user_name,
      user_email: r.user_email,
      user_avatar: r.user_avatar ?? null
    }));
  }

  /**
   * Promote a user from waitlist to confirmed RSVP
   * Uses transaction for atomicity (follows rsvp() pattern)
   * @param eventId Event ID
   * @param userId User ID to promote
   */
  async promoteFromWaitlist(eventId: number, userId: number): Promise<RSVP> {
    const event = await this.getById(eventId);
    if (!event) throw new EventNotFoundError(eventId);

    return this.db.transaction(async (client) => {
      // 1. Verify user is on waitlist with status 'waiting' or 'offered'
      const waitlistResult = await client.query<EventWaitlistEntry>(
        `SELECT * FROM event_waitlist WHERE event_id = ? AND user_id = ? AND status IN ('waiting', 'offered')`,
        [eventId, userId]
      );
      if (waitlistResult.rows.length === 0) {
        throw BizError.badRequest('User is not on the waitlist for this event');
      }

      // 2. Update waitlist entry status to 'claimed'
      await client.query(
        `UPDATE event_waitlist SET status = 'claimed' WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
      );

      // 3. Insert RSVP with status 'confirmed'
      const rsvpResult: DbResult<EventRsvpRow> = await client.query(
        `INSERT INTO event_rsvps (event_id, user_id, rsvp_status) VALUES (?, ?, 'confirmed')`,
        [eventId, userId]
      );

      if (!rsvpResult.insertId) {
        throw BizError.databaseError('create RSVP from waitlist promotion', new Error('No insert ID returned'));
      }

      // 4. Update event rsvp_count and remaining_capacity
      const updates: string[] = ['rsvp_count = rsvp_count + 1'];
      if (event.remaining_capacity !== null) {
        updates.push('remaining_capacity = remaining_capacity - 1');
      }
      await client.query(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
        [eventId]
      );

      // 5. Return created RSVP
      const newRsvp = await client.query<EventRsvpRow>(
        'SELECT * FROM event_rsvps WHERE id = ?',
        [rsvpResult.insertId]
      );
      return this.mapRowToRSVP(newRsvp.rows[0]!);
    });
  }

  /**
   * Update event capacity (increase only for safety)
   * @param eventId Event ID
   * @param newCapacity New total capacity
   */
  async updateEventCapacity(eventId: number, newCapacity: number): Promise<void> {
    const event = await this.getById(eventId);
    if (!event) throw new EventNotFoundError(eventId);

    const currentUsed = (event.total_capacity || 0) - (event.remaining_capacity || 0);
    if (newCapacity < currentUsed) {
      throw BizError.badRequest('Cannot reduce capacity below current attendance');
    }

    await this.db.query(
      'UPDATE events SET total_capacity = ?, remaining_capacity = ? WHERE id = ?',
      [newCapacity, newCapacity - currentUsed, eventId]
    );
  }

  // ==========================================================================
  // EVENT TYPES - Lookup Table CRUD
  // ==========================================================================

  /**
   * Get all event types (active only by default)
   */
  async getEventTypes(includeInactive = false): Promise<EventTypeRow[]> {
    const sql = includeInactive
      ? 'SELECT * FROM event_types ORDER BY sort_order ASC, name ASC'
      : 'SELECT * FROM event_types WHERE is_active = 1 ORDER BY sort_order ASC, name ASC';
    const result: DbResult<EventTypeRow> = await this.db.query(sql);
    return result.rows;
  }

  /**
   * Get admin event types with pagination, search, sorting
   */
  async getAdminEventTypes(filters: {
    page: number;
    pageSize: number;
    search: string;
    status: string;
    sortColumn: string;
    sortDirection: string;
  }): Promise<{ eventTypes: EventTypeRow[]; total: number }> {
    const { page, pageSize, search, status, sortColumn, sortDirection } = filters;
    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR slug LIKE ? OR description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status === 'active') {
      conditions.push('is_active = 1');
    } else if (status === 'inactive') {
      conditions.push('is_active = 0');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortColumns = ['id', 'name', 'slug', 'is_active', 'sort_order', 'created_at'];
    const safeSort = allowedSortColumns.includes(sortColumn) ? sortColumn : 'sort_order';
    const safeDir = sortDirection === 'desc' ? 'DESC' : 'ASC';

    const countResult: DbResult<{ count: number | bigint }> = await this.db.query(
      `SELECT COUNT(*) as count FROM event_types ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

    const rowsResult: DbResult<EventTypeRow> = await this.db.query(
      `SELECT * FROM event_types ${whereClause} ORDER BY ${safeSort} ${safeDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { eventTypes: rowsResult.rows, total };
  }

  /**
   * Get a single event type by ID
   */
  async getEventTypeById(id: number): Promise<EventTypeRow | null> {
    const result: DbResult<EventTypeRow> = await this.db.query(
      'SELECT * FROM event_types WHERE id = ?',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new event type
   */
  async createEventType(input: { name: string; slug: string; description?: string; is_active?: boolean; sort_order?: number }): Promise<void> {
    const { name, slug, description, is_active = true, sort_order = 0 } = input;
    await this.db.query(
      'INSERT INTO event_types (name, slug, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, slug, description || null, is_active ? 1 : 0, sort_order]
    );
  }

  /**
   * Update an event type
   */
  async updateEventType(id: number, input: { name?: string; slug?: string; description?: string; is_active?: boolean; sort_order?: number }): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name); }
    if (input.slug !== undefined) { sets.push('slug = ?'); params.push(input.slug); }
    if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description); }
    if (input.is_active !== undefined) { sets.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }
    if (input.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(input.sort_order); }

    if (sets.length === 0) throw BizError.badRequest('No fields to update');

    params.push(id);
    await this.db.query(
      `UPDATE event_types SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  /**
   * Delete an event type
   */
  async deleteEventType(id: number): Promise<void> {
    await this.db.query(
      'DELETE FROM event_types WHERE id = ?',
      [id]
    );
  }

  // ============================================================================
  // Event Media Methods
  // ============================================================================

  /**
   * Get all media for an event, sorted by sort_order
   * @param eventId Event ID
   * @returns Array of event media
   */
  async getMedia(eventId: number): Promise<EventMedia[]> {
    const result: DbResult<EventMediaRow> = await this.db.query<EventMediaRow>(
      'SELECT * FROM event_media WHERE event_id = ? ORDER BY sort_order ASC',
      [eventId]
    );
    return result.rows.map(row => this.mapRowToEventMedia(row));
  }

  /**
   * Get single media item by ID
   * @param mediaId Media ID
   * @returns Event media or null
   */
  async getMediaById(mediaId: number): Promise<EventMedia | null> {
    const result: DbResult<EventMediaRow> = await this.db.query<EventMediaRow>(
      'SELECT * FROM event_media WHERE id = ?',
      [mediaId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToEventMedia(row);
  }

  /**
   * Add media to an event
   * @param eventId Event ID
   * @param input Media input data
   * @returns Created media
   */
  async addMedia(eventId: number, input: CreateEventMediaInput): Promise<EventMedia> {
    // Verify event exists
    const event = await this.getById(eventId);
    if (!event) {
      throw BizError.notFound('Event', eventId);
    }

    // Check tier limits
    const tierCheck = await this.checkMediaLimit(eventId, input.media_type);
    if (!tierCheck.allowed) {
      throw BizError.badRequest(
        `Media limit reached for ${input.media_type}s (current: ${tierCheck.current}, limit: ${tierCheck.limit}) on tier: ${tierCheck.tier}`
      );
    }

    // Get next sort_order
    const countResult = await this.db.query<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM event_media WHERE event_id = ?',
      [eventId]
    );
    const nextOrder = (countResult.rows[0]?.max_order ?? -1) + 1;

    const result = await this.db.query(
      `INSERT INTO event_media (event_id, media_type, file_url, sort_order, alt_text, embed_url, platform, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
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
  async updateMedia(mediaId: number, input: { sort_order?: number; alt_text?: string }): Promise<EventMedia> {
    const existing = await this.getMediaById(mediaId);
    if (!existing) {
      throw BizError.notFound('EventMedia', mediaId);
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
    await this.db.query(`UPDATE event_media SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await this.getMediaById(mediaId);
    if (!updated) {
      throw BizError.notFound('EventMedia', mediaId);
    }
    return updated;
  }

  /**
   * Delete media from an event
   * @param mediaId Media ID
   */
  async deleteMedia(mediaId: number): Promise<void> {
    const existing = await this.getMediaById(mediaId);
    if (!existing) {
      throw BizError.notFound('EventMedia', mediaId);
    }
    await this.db.query('DELETE FROM event_media WHERE id = ?', [mediaId]);
  }

  /**
   * Reorder media items
   * @param eventId Event ID
   * @param mediaIds Array of media IDs in desired order
   */
  async reorderMedia(eventId: number, mediaIds: number[]): Promise<void> {
    // Verify event exists
    const event = await this.getById(eventId);
    if (!event) {
      throw BizError.notFound('Event', eventId);
    }

    // Update sort_order for each media item
    for (let i = 0; i < mediaIds.length; i++) {
      await this.db.query(
        'UPDATE event_media SET sort_order = ? WHERE id = ? AND event_id = ?',
        [i, mediaIds[i], eventId]
      );
    }
  }

  /**
   * Check if event can add more media based on tier limits
   * @param eventId Event ID
   * @param mediaType image or video
   */
  async checkMediaLimit(eventId: number, mediaType: 'image' | 'video'): Promise<EventMediaLimitCheckResult> {
    const event = await this.getById(eventId);
    if (!event) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }

    if (!event.listing_id) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }
    const listing = await this.listingService.getById(event.listing_id);
    if (!listing) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }

    const tier = listing.tier || 'essentials';
    const limit: number = mediaType === 'image'
      ? (TIER_IMAGE_LIMITS[tier] ?? TIER_IMAGE_LIMITS['essentials'] ?? 1)
      : (TIER_VIDEO_LIMITS[tier] ?? TIER_VIDEO_LIMITS['essentials'] ?? 0);

    // Count current media of this type
    const countResult = await this.db.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM event_media WHERE event_id = ? AND media_type = ?',
      [eventId, mediaType]
    );
    const current = bigIntToNumber(countResult.rows[0]?.count);

    // -1 means unlimited
    const unlimited = limit === -1;
    const allowed = unlimited || current < limit;

    return { allowed, current, limit, unlimited, tier };
  }

  /**
   * Get media limits for an event (for UI display)
   * @param eventId Event ID
   * @returns Current and limit counts for images and videos
   */
  async getMediaLimits(eventId: number): Promise<EventMediaLimits> {
    const imageCheck = await this.checkMediaLimit(eventId, 'image');
    const videoCheck = await this.checkMediaLimit(eventId, 'video');

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
   * Map database row to EventMedia object
   */
  private mapRowToEventMedia(row: EventMediaRow): EventMedia {
    return {
      id: row.id,
      event_id: row.event_id,
      media_type: row.media_type,
      file_url: row.file_url,
      sort_order: row.sort_order,
      alt_text: row.alt_text,
      embed_url: row.embed_url,
      platform: row.platform,
      source: row.source,
      created_at: new Date(row.created_at),
    };
  }


  // ==========================================================================
  // CHECK-IN Operations (Phase 4)
  // ==========================================================================

  /**
   * Generate a check-in code for an RSVP
   * Stores UUID on event_rsvps.check_in_code
   */
  async generateCheckInCode(rsvpId: number): Promise<string> {
    const result = await this.db.query<EventRsvpRow>(
      'SELECT id, event_id, user_id, check_in_code FROM event_rsvps WHERE id = ?',
      [rsvpId]
    );
    if (!result.rows || result.rows.length === 0) {
      throw BizError.notFound('RSVP', rsvpId);
    }
    const rsvp = result.rows[0]!;
    if (rsvp.check_in_code) {
      return rsvp.check_in_code;
    }
    const code = crypto.randomUUID();
    await this.db.query(
      'UPDATE event_rsvps SET check_in_code = ? WHERE id = ?',
      [code, rsvpId]
    );
    return code;
  }

  /**
   * Check in an attendee by RSVP
   */
  async checkInAttendee(
    eventId: number,
    rsvpId: number,
    method: CheckInMethod,
    checkedInBy?: number
  ): Promise<EventCheckIn> {
    // Verify RSVP exists and belongs to event
    const rsvpResult = await this.db.query<EventRsvpRow>(
      'SELECT id, event_id, user_id, check_in_code, rsvp_status FROM event_rsvps WHERE id = ? AND event_id = ?',
      [rsvpId, eventId]
    );
    if (!rsvpResult.rows || rsvpResult.rows.length === 0) {
      throw BizError.notFound('RSVP', rsvpId);
    }
    const rsvp = rsvpResult.rows[0]!;

    // Verify event has check_in_enabled
    const event = await this.getById(eventId);
    if (!event) {
      throw BizError.notFound('Event', eventId);
    }
    if (!event.check_in_enabled) {
      throw BizError.badRequest('Check-in is not enabled for this event');
    }

    // Get or generate check-in code
    const checkInCode = rsvp.check_in_code || await this.generateCheckInCode(rsvpId);

    // Insert check-in record (UNIQUE constraint prevents duplicates)
    try {
      const insertResult = await this.db.query<EventCheckInRow>(
        `INSERT INTO event_check_ins (event_id, rsvp_id, user_id, check_in_code, check_in_method, checked_in_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, rsvpId, rsvp.user_id, checkInCode, method, checkedInBy || null]
      );

      // Update event_rsvps.attended = 1
      await this.db.query(
        'UPDATE event_rsvps SET attended = 1 WHERE id = ?',
        [rsvpId]
      );

      // Return the check-in record
      const checkInResult = await this.db.query<EventCheckInRow>(
        'SELECT * FROM event_check_ins WHERE id = ?',
        [insertResult.insertId]
      );

      if (!checkInResult.rows || checkInResult.rows.length === 0) {
        throw BizError.internalServerError('EventService', new Error('Failed to retrieve check-in record'));
      }

      return this.mapRowToCheckIn(checkInResult.rows[0]!);
    } catch (err: unknown) {
      // Handle duplicate check-in
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ER_DUP_ENTRY') {
        throw BizError.badRequest('Attendee has already been checked in');
      }
      throw err;
    }
  }

  /**
   * Get check-in statistics for an event
   */
  async getCheckInStats(eventId: number): Promise<CheckInStats> {
    const totalRsvpsResult = await this.db.query<{ cnt: bigint | number }>(
      "SELECT COUNT(*) as cnt FROM event_rsvps WHERE event_id = ? AND rsvp_status = 'confirmed'",
      [eventId]
    );
    const totalRsvps = bigIntToNumber(totalRsvpsResult.rows[0]?.cnt ?? 0);

    const methodResult = await this.db.query<{ check_in_method: CheckInMethod; cnt: bigint | number }>(
      'SELECT check_in_method, COUNT(*) as cnt FROM event_check_ins WHERE event_id = ? GROUP BY check_in_method',
      [eventId]
    );

    const byMethod: { qr_scan: number; manual: number; self: number } = { qr_scan: 0, manual: 0, self: 0 };
    let totalCheckedIn = 0;
    for (const row of methodResult.rows) {
      const count = bigIntToNumber(row.cnt);
      byMethod[row.check_in_method] = count;
      totalCheckedIn += count;
    }

    return {
      totalRsvps,
      totalCheckedIn,
      checkInRate: totalRsvps > 0 ? Math.round((totalCheckedIn / totalRsvps) * 100) : 0,
      byMethod,
    };
  }

  /**
   * Get all check-ins for an event with user details
   */
  async getEventCheckIns(eventId: number): Promise<(EventCheckIn & { userName: string; userEmail: string })[]> {
    const result = await this.db.query<EventCheckInRow & { user_name: string; user_email: string }>(
      `SELECT ci.*, u.name as user_name, u.email as user_email
       FROM event_check_ins ci
       JOIN users u ON ci.user_id = u.id
       WHERE ci.event_id = ?
       ORDER BY ci.checked_in_at DESC`,
      [eventId]
    );

    return result.rows.map(row => ({
      ...this.mapRowToCheckIn(row),
      userName: row.user_name,
      userEmail: row.user_email,
    }));
  }

  /**
   * Get QR data for an attendee's RSVP
   */
  async getAttendeeCheckInQR(eventId: number, userId: number): Promise<{
    checkInCode: string;
    verificationUrl: string;
    eventTitle: string;
    eventDate: Date;
    userName: string;
    rsvpId: number;
  }> {
    type RsvpQRRow = EventRsvpRow & { title: string; start_date: string; slug: string; user_name: string };
    const result = await this.db.query<RsvpQRRow>(
      `SELECT er.id, er.check_in_code, er.event_id, er.user_id,
              e.title, e.start_date, e.slug,
              u.name as user_name
       FROM event_rsvps er
       JOIN events e ON er.event_id = e.id
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ? AND er.user_id = ? AND er.rsvp_status = 'confirmed'`,
      [eventId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw BizError.notFound('RSVP for this event and user', 0);
    }
    const rsvp = result.rows[0]!;

    // Generate code if needed
    let checkInCode = rsvp.check_in_code ?? null;
    if (!checkInCode) {
      checkInCode = await this.generateCheckInCode(rsvp.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/events/${rsvp.slug}/check-in?code=${checkInCode}&rsvp=${rsvp.id}`;

    return {
      checkInCode,
      verificationUrl,
      eventTitle: rsvp.title,
      eventDate: new Date(rsvp.start_date),
      userName: rsvp.user_name,
      rsvpId: rsvp.id,
    };
  }

  /**
   * Verify a check-in code matches an RSVP
   */
  async verifyCheckInCode(checkInCode: string, rsvpId: number): Promise<boolean> {
    const result = await this.db.query<{ check_in_code: string | null }>(
      'SELECT check_in_code FROM event_rsvps WHERE id = ? AND check_in_code = ?',
      [rsvpId, checkInCode]
    );
    return result.rows.length > 0;
  }

  /**
   * Map database row to EventCheckIn
   */
  private mapRowToCheckIn(row: EventCheckInRow): EventCheckIn {
    return {
      id: row.id,
      eventId: row.event_id,
      rsvpId: row.rsvp_id,
      userId: row.user_id,
      checkInCode: row.check_in_code,
      checkInMethod: row.check_in_method,
      checkedInBy: row.checked_in_by,
      checkedInAt: new Date(row.checked_in_at),
      notes: row.notes,
    };
  }

  // ==========================================================================
  // TICKET PURCHASE Operations (Phase 5A)
  // ==========================================================================

  /**
   * Create a pending ticket purchase record before Stripe redirect
   * Validates event state, ticket availability, and calculates total.
   *
   * @param data Purchase input
   * @returns Created purchase record
   * @phase Phase 5A - Native Ticketing
   */
  async createTicketPurchase(data: {
    event_id: number;
    ticket_id: number;
    user_id: number;
    quantity?: number;
    stripe_checkout_session_id?: string;
  }): Promise<TicketPurchase> {
    const quantity = data.quantity || 1;

    // Validate event
    const event = await this.getById(data.event_id);
    if (!event) {
      throw new EventNotFoundError(data.event_id);
    }
    if (event.status !== EventStatus.PUBLISHED) {
      throw BizError.badRequest('Event is not published', { status: event.status });
    }
    if (new Date() > event.end_date) {
      throw new EventPastError(data.event_id, event.end_date);
    }

    // Validate ticket tier exists and has availability
    const ticketResult: DbResult<EventTicketRow> = await this.db.query(
      'SELECT * FROM event_tickets WHERE id = ? AND event_id = ?',
      [data.ticket_id, data.event_id]
    );
    const ticketRow = ticketResult.rows[0];
    if (!ticketRow) {
      throw BizError.notFound('Ticket tier', data.ticket_id);
    }

    const available = ticketRow.quantity_total - ticketRow.quantity_sold;
    if (available < quantity) {
      throw BizError.badRequest('Not enough tickets available', {
        requested: quantity,
        available,
      });
    }

    const unitPrice = parseFloat(ticketRow.ticket_price);
    const totalAmount = unitPrice * quantity;

    const result: DbResult<EventTicketPurchaseRow> = await this.db.query(
      `INSERT INTO event_ticket_purchases
       (event_id, ticket_id, user_id, quantity, unit_price, total_amount, currency, stripe_checkout_session_id, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, 'usd', ?, 'pending')`,
      [data.event_id, data.ticket_id, data.user_id, quantity, unitPrice, totalAmount, data.stripe_checkout_session_id || null]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create ticket purchase', new Error('No insert ID returned'));
    }

    const purchaseResult: DbResult<EventTicketPurchaseRow> = await this.db.query(
      'SELECT * FROM event_ticket_purchases WHERE id = ?',
      [result.insertId]
    );

    const row = purchaseResult.rows[0];
    if (!row) {
      throw BizError.databaseError('create ticket purchase', new Error('Failed to retrieve created purchase'));
    }

    return this.mapRowToPurchase(row);
  }

  /**
   * Confirm a ticket purchase after Stripe webhook confirms payment.
   * Uses transaction for atomicity (follows rsvp() pattern):
   * - Updates purchase status to 'completed'
   * - Increments ticket quantity_sold
   * - Creates RSVP record with ticket_id
   * - Decrements event remaining_capacity
   * - Generates check-in code if enabled
   *
   * Handles idempotency: if purchase already completed, returns existing record.
   *
   * @param sessionId Stripe checkout session ID
   * @param paymentIntentId Stripe payment intent ID
   * @returns Confirmed purchase record
   * @phase Phase 5A - Native Ticketing
   */
  async confirmTicketPurchase(sessionId: string, paymentIntentId: string): Promise<TicketPurchase> {
    // Find purchase by Stripe session ID
    const findResult: DbResult<EventTicketPurchaseRow> = await this.db.query(
      'SELECT * FROM event_ticket_purchases WHERE stripe_checkout_session_id = ?',
      [sessionId]
    );

    const purchaseRow = findResult.rows[0];
    if (!purchaseRow) {
      throw BizError.notFound('Ticket purchase for session', sessionId);
    }

    // Idempotency: if already completed, return existing
    if (purchaseRow.payment_status === 'completed') {
      return this.mapRowToPurchase(purchaseRow);
    }

    return this.db.transaction(async (client) => {
      // 1. Update purchase status
      await client.query(
        `UPDATE event_ticket_purchases
         SET payment_status = 'completed',
             purchased_at = NOW(),
             stripe_payment_intent_id = ?
         WHERE id = ?`,
        [paymentIntentId, purchaseRow.id]
      );

      // 2. Increment ticket quantity_sold
      await client.query(
        `UPDATE event_tickets
         SET quantity_sold = quantity_sold + ?
         WHERE id = ? AND quantity_sold + ? <= quantity_total`,
        [purchaseRow.quantity, purchaseRow.ticket_id, purchaseRow.quantity]
      );

      // 3. Create RSVP record (check for existing cancelled RSVP first)
      const existingRsvp: DbResult<EventRsvpRow> = await client.query(
        `SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ? AND rsvp_status = 'cancelled'`,
        [purchaseRow.event_id, purchaseRow.user_id]
      );

      let rsvpId: number;
      if (existingRsvp.rows.length > 0 && existingRsvp.rows[0]) {
        rsvpId = existingRsvp.rows[0].id;
        await client.query(
          `UPDATE event_rsvps SET rsvp_status = 'confirmed', ticket_id = ?, rsvp_date = NOW() WHERE id = ?`,
          [purchaseRow.ticket_id, rsvpId]
        );
      } else {
        // Check for existing active RSVP
        const activeRsvp: DbResult<EventRsvpRow> = await client.query(
          `SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ? AND rsvp_status != 'cancelled'`,
          [purchaseRow.event_id, purchaseRow.user_id]
        );

        if (activeRsvp.rows.length > 0 && activeRsvp.rows[0]) {
          rsvpId = activeRsvp.rows[0].id;
          // Update existing RSVP with ticket_id
          await client.query(
            `UPDATE event_rsvps SET ticket_id = ? WHERE id = ?`,
            [purchaseRow.ticket_id, rsvpId]
          );
        } else {
          const rsvpResult: DbResult<EventRsvpRow> = await client.query(
            `INSERT INTO event_rsvps (event_id, user_id, ticket_id, rsvp_status)
             VALUES (?, ?, ?, 'confirmed')`,
            [purchaseRow.event_id, purchaseRow.user_id, purchaseRow.ticket_id]
          );
          rsvpId = rsvpResult.insertId!;
        }
      }

      // 4. Update event counts
      const updates: string[] = ['rsvp_count = rsvp_count + 1'];
      // Check if event has capacity tracking
      const eventResult = await client.query<EventRow>(
        'SELECT remaining_capacity FROM events WHERE id = ?',
        [purchaseRow.event_id]
      );
      if (eventResult.rows[0] && eventResult.rows[0].remaining_capacity !== null) {
        updates.push(`remaining_capacity = remaining_capacity - ${purchaseRow.quantity}`);
      }

      await client.query(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
        [purchaseRow.event_id]
      );

      // 5. Generate check-in code if event has check-in enabled
      try {
        const event = await this.getById(purchaseRow.event_id);
        if (event && event.check_in_enabled && rsvpId) {
          await this.generateCheckInCode(rsvpId);
        }
      } catch {
        // Non-fatal: check-in code generation failure shouldn't block purchase confirmation
        ErrorService.warn('Check-in code generation failed during purchase confirmation', {
          purchaseId: purchaseRow.id,
          rsvpId,
        });
      }

      // 6. Fetch and return the updated purchase record
      const updatedResult: DbResult<EventTicketPurchaseRow> = await client.query(
        'SELECT * FROM event_ticket_purchases WHERE id = ?',
        [purchaseRow.id]
      );

      return this.mapRowToPurchase(updatedResult.rows[0]!);
    });
  }

  /**
   * Mark a ticket purchase as failed (e.g., checkout expired)
   *
   * @param sessionId Stripe checkout session ID
   * @phase Phase 5A - Native Ticketing
   */
  async failTicketPurchase(sessionId: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE event_ticket_purchases
       SET payment_status = 'failed'
       WHERE stripe_checkout_session_id = ? AND payment_status = 'pending'`,
      [sessionId]
    );

    if (result.rowCount === 0) {
      // Either already processed or doesn't exist — log but don't throw
      ErrorService.warn('failTicketPurchase: no pending purchase found for session', { sessionId });
    }
  }

  /**
   * Get a single ticket purchase by ID with event/ticket details
   *
   * @param purchaseId Purchase ID
   * @returns TicketPurchase or null
   * @phase Phase 5A - Native Ticketing
   */
  async getTicketPurchase(purchaseId: number): Promise<TicketPurchase | null> {
    const result: DbResult<EventTicketPurchaseRow> = await this.db.query(
      'SELECT * FROM event_ticket_purchases WHERE id = ?',
      [purchaseId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToPurchase(row);
  }

  /**
   * Get all ticket purchases for a user
   *
   * @param userId User ID
   * @returns Array of TicketPurchase records
   * @phase Phase 5A - Native Ticketing (used by Phase 5B "My Tickets")
   */
  async getUserTicketPurchases(userId: number): Promise<TicketPurchase[]> {
    const result: DbResult<EventTicketPurchaseRow> = await this.db.query(
      `SELECT * FROM event_ticket_purchases
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((r) => this.mapRowToPurchase(r));
  }

  /**
   * Update a purchase record with the Stripe checkout session ID
   *
   * @param purchaseId Purchase ID
   * @param sessionId Stripe checkout session ID
   * @phase Phase 5A - Native Ticketing
   */
  async updateTicketPurchaseSessionId(purchaseId: number, sessionId: string): Promise<void> {
    await this.db.query(
      'UPDATE event_ticket_purchases SET stripe_checkout_session_id = ? WHERE id = ?',
      [sessionId, purchaseId]
    );
  }

  /**
   * Find a ticket purchase by Stripe checkout session ID
   *
   * @param sessionId Stripe checkout session ID
   * @returns TicketPurchase or null
   * @phase Phase 5A - Native Ticketing
   */
  async getTicketPurchaseBySessionId(sessionId: string): Promise<TicketPurchase | null> {
    const result: DbResult<EventTicketPurchaseRow> = await this.db.query(
      'SELECT * FROM event_ticket_purchases WHERE stripe_checkout_session_id = ?',
      [sessionId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToPurchase(row);
  }

  // ============================================================
  // Phase 5B: Refund, Revenue, and Sales Methods
  // ============================================================

  /**
   * Find a ticket purchase by Stripe payment intent ID
   *
   * @param paymentIntentId Stripe payment intent ID
   * @returns TicketPurchase or null
   * @phase Phase 5B - Native Ticketing (Refunds)
   */
  async getTicketPurchaseByPaymentIntent(paymentIntentId: string): Promise<TicketPurchase | null> {
    const result: DbResult<EventTicketPurchaseRow> = await this.db.query(
      'SELECT * FROM event_ticket_purchases WHERE stripe_payment_intent_id = ?',
      [paymentIntentId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToPurchase(row);
  }

  /**
   * Process a full refund for a ticket purchase via Stripe.
   * Uses database transaction for atomicity:
   * - Validates purchase exists and is completed
   * - Calls Stripe Refunds API
   * - Updates purchase status to 'refunded'
   * - Restores ticket inventory (quantity_sold)
   * - Restores event capacity (remaining_capacity)
   * - Cancels associated RSVP
   *
   * @param purchaseId Purchase ID to refund
   * @param adminUserId Optional admin user ID (for admin-initiated refunds)
   * @returns Updated purchase record
   * @phase Phase 5B - Native Ticketing (Refunds)
   */
  async refundTicketPurchase(purchaseId: number, adminUserId?: number): Promise<TicketPurchase> {
    // 1. Validate purchase exists
    const purchase = await this.getTicketPurchase(purchaseId);
    if (!purchase) {
      throw BizError.notFound('Ticket purchase', String(purchaseId));
    }

    // 2. Validate purchase is completed (not already refunded/failed/pending)
    if (purchase.payment_status !== 'completed') {
      throw BizError.badRequest(`Cannot refund purchase with status '${purchase.payment_status}'. Only completed purchases can be refunded.`);
    }

    // 3. Validate payment intent exists (required for Stripe refund)
    if (!purchase.stripe_payment_intent_id) {
      throw BizError.badRequest('Cannot refund: no Stripe payment intent associated with this purchase');
    }

    // 4. Call Stripe Refunds API
    try {
      const { stripe } = await import('@core/config/stripe');
      await stripe.refunds.create({
        payment_intent: purchase.stripe_payment_intent_id,
      });
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      // Handle already-refunded case gracefully
      if (message.includes('has already been refunded')) {
        ErrorService.warn('Stripe refund already processed, updating local state', {
          purchaseId,
          paymentIntent: purchase.stripe_payment_intent_id,
        });
      } else {
        throw BizError.badRequest(`Stripe refund failed: ${message}`);
      }
    }

    // 5. Database transaction: update purchase + restore inventory + cancel RSVP
    return this.db.transaction(async (client) => {
      // Update purchase status
      await client.query(
        `UPDATE event_ticket_purchases
         SET payment_status = 'refunded',
             refunded_at = NOW(),
             refund_amount = total_amount
         WHERE id = ?`,
        [purchaseId]
      );

      // Restore ticket inventory
      await client.query(
        `UPDATE event_tickets
         SET quantity_sold = GREATEST(0, quantity_sold - ?)
         WHERE id = ?`,
        [purchase.quantity, purchase.ticket_id]
      );

      // Restore event capacity
      const eventResult = await client.query<EventRow>(
        'SELECT remaining_capacity FROM events WHERE id = ?',
        [purchase.event_id]
      );
      if (eventResult.rows[0] && eventResult.rows[0].remaining_capacity !== null) {
        await client.query(
          `UPDATE events
           SET remaining_capacity = remaining_capacity + ?,
               rsvp_count = GREATEST(0, rsvp_count - 1)
           WHERE id = ?`,
          [purchase.quantity, purchase.event_id]
        );
      } else {
        await client.query(
          `UPDATE events SET rsvp_count = GREATEST(0, rsvp_count - 1) WHERE id = ?`,
          [purchase.event_id]
        );
      }

      // Cancel associated RSVP
      await client.query(
        `UPDATE event_rsvps
         SET rsvp_status = 'cancelled'
         WHERE event_id = ? AND user_id = ? AND rsvp_status != 'cancelled'`,
        [purchase.event_id, purchase.user_id]
      );

      // Fetch and return updated purchase
      const updatedResult: DbResult<EventTicketPurchaseRow> = await client.query(
        'SELECT * FROM event_ticket_purchases WHERE id = ?',
        [purchaseId]
      );

      if (adminUserId) {
        ErrorService.info('Admin-initiated refund processed', {
          purchaseId,
          adminUserId,
          amount: purchase.total_amount,
        });
      }

      return this.mapRowToPurchase(updatedResult.rows[0]!);
    });
  }

  /**
   * Get revenue aggregation for an event.
   * Returns total revenue, purchase count, refund data, and per-tier breakdown.
   *
   * @param eventId Event ID
   * @returns EventRevenue data
   * @phase Phase 5B - Native Ticketing (Revenue Reporting)
   */
  async getEventRevenue(eventId: number): Promise<EventRevenue> {
    // Overall completed revenue
    const overallResult = await this.db.query<{
      total_purchases: bigint;
      total_revenue: string | null;
      total_tickets_sold: bigint;
    }>(
      `SELECT
        COUNT(*) as total_purchases,
        SUM(total_amount) as total_revenue,
        SUM(quantity) as total_tickets_sold
       FROM event_ticket_purchases
       WHERE event_id = ? AND payment_status = 'completed'`,
      [eventId]
    );

    // Refund totals
    const refundResult = await this.db.query<{
      total_refunds: bigint;
      total_refund_amount: string | null;
    }>(
      `SELECT
        COUNT(*) as total_refunds,
        SUM(refund_amount) as total_refund_amount
       FROM event_ticket_purchases
       WHERE event_id = ? AND payment_status = 'refunded'`,
      [eventId]
    );

    // Per-tier breakdown
    const tierResult = await this.db.query<{
      ticket_name: string;
      ticket_price: string;
      purchases: bigint;
      revenue: string | null;
      tickets_sold: bigint;
      quantity_total: number;
      quantity_sold: number;
    }>(
      `SELECT
        et.ticket_name, et.ticket_price,
        COUNT(*) as purchases,
        SUM(etp.total_amount) as revenue,
        SUM(etp.quantity) as tickets_sold,
        et.quantity_total, et.quantity_sold
       FROM event_ticket_purchases etp
       JOIN event_tickets et ON etp.ticket_id = et.id
       WHERE etp.event_id = ? AND etp.payment_status = 'completed'
       GROUP BY etp.ticket_id, et.ticket_name, et.ticket_price, et.quantity_total, et.quantity_sold`,
      [eventId]
    );

    const overallRow = overallResult.rows[0];
    const refundRow = refundResult.rows[0];

    return {
      total_purchases: overallRow ? bigIntToNumber(overallRow.total_purchases) : 0,
      total_revenue: overallRow?.total_revenue ? parseFloat(overallRow.total_revenue) : 0,
      total_tickets_sold: overallRow ? bigIntToNumber(overallRow.total_tickets_sold) : 0,
      total_refunds: refundRow ? bigIntToNumber(refundRow.total_refunds) : 0,
      total_refund_amount: refundRow?.total_refund_amount ? parseFloat(refundRow.total_refund_amount) : 0,
      by_tier: tierResult.rows.map((r) => ({
        ticket_name: r.ticket_name,
        ticket_price: parseFloat(r.ticket_price),
        purchases: bigIntToNumber(r.purchases),
        revenue: r.revenue ? parseFloat(r.revenue) : 0,
        tickets_sold: bigIntToNumber(r.tickets_sold),
        quantity_total: r.quantity_total,
        quantity_sold: r.quantity_sold,
      })),
    };
  }

  /**
   * Get paginated ticket sales list for an event (for organizer/admin).
   * Joins with users (buyer) and event_tickets (tier name).
   *
   * @param eventId Event ID
   * @param options Pagination and filter options
   * @returns Paginated list of purchases
   * @phase Phase 5B - Native Ticketing (Revenue Reporting)
   */
  async getEventTicketSales(
    eventId: number,
    options?: { page?: number; limit?: number; status?: PurchaseStatus }
  ): Promise<{ items: AdminTicketSale[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE etp.event_id = ?';
    const params: (number | string)[] = [eventId];

    if (options?.status) {
      whereClause += ' AND etp.payment_status = ?';
      params.push(options.status);
    }

    // Count total
    const countResult = await this.db.query<{ total: bigint }>(
      `SELECT COUNT(*) as total FROM event_ticket_purchases etp ${whereClause}`,
      params
    );
    const total = countResult.rows[0] ? bigIntToNumber(countResult.rows[0].total) : 0;

    // Fetch items with JOINs
    const itemsResult = await this.db.query<EventTicketPurchaseRow & {
      event_title: string;
      event_slug: string;
      buyer_name: string;
      buyer_email: string;
      ticket_name: string;
    }>(
      `SELECT etp.*,
        e.title as event_title, e.slug as event_slug,
        u.name as buyer_name, u.email as buyer_email,
        et.ticket_name
       FROM event_ticket_purchases etp
       JOIN events e ON etp.event_id = e.id
       JOIN users u ON etp.user_id = u.id
       JOIN event_tickets et ON etp.ticket_id = et.id
       ${whereClause}
       ORDER BY etp.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const items: AdminTicketSale[] = itemsResult.rows.map((r) => ({
      ...this.mapRowToPurchase(r),
      event_title: r.event_title,
      event_slug: r.event_slug,
      buyer_name: r.buyer_name,
      buyer_email: r.buyer_email,
      ticket_name: r.ticket_name,
    }));

    return { items, total };
  }

  /**
   * Get platform-wide ticket sales stats for admin dashboard.
   * Includes total revenue, purchases, refunds, and recent purchases.
   *
   * @param options Optional date range filter
   * @returns PlatformTicketSalesStats
   * @phase Phase 5B - Native Ticketing (Admin Dashboard)
   */
  async getPlatformTicketSalesStats(options?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: PurchaseStatus;
  }): Promise<{ stats: PlatformTicketSalesStats; items: AdminTicketSale[]; total: number }> {
    let dateFilter = '';
    const dateParams: string[] = [];

    if (options?.startDate) {
      dateFilter += ' AND etp.created_at >= ?';
      dateParams.push(options.startDate);
    }
    if (options?.endDate) {
      dateFilter += ' AND etp.created_at <= ?';
      dateParams.push(options.endDate);
    }

    // Revenue stats (completed)
    const revenueResult = await this.db.query<{
      total_purchases: bigint;
      total_revenue: string | null;
    }>(
      `SELECT COUNT(*) as total_purchases, SUM(total_amount) as total_revenue
       FROM event_ticket_purchases etp
       WHERE payment_status = 'completed'${dateFilter}`,
      dateParams
    );

    // Refund stats
    const refundResult = await this.db.query<{
      total_refunds: bigint;
      total_refund_amount: string | null;
    }>(
      `SELECT COUNT(*) as total_refunds, SUM(refund_amount) as total_refund_amount
       FROM event_ticket_purchases etp
       WHERE payment_status = 'refunded'${dateFilter}`,
      dateParams
    );

    // Recent purchases (last 50)
    const recentResult = await this.db.query<EventTicketPurchaseRow>(
      `SELECT * FROM event_ticket_purchases
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const revRow = revenueResult.rows[0];
    const refRow = refundResult.rows[0];

    const stats: PlatformTicketSalesStats = {
      total_revenue: revRow?.total_revenue ? parseFloat(revRow.total_revenue) : 0,
      total_purchases: revRow ? bigIntToNumber(revRow.total_purchases) : 0,
      total_refunds: refRow ? bigIntToNumber(refRow.total_refunds) : 0,
      total_refund_amount: refRow?.total_refund_amount ? parseFloat(refRow.total_refund_amount) : 0,
      recent_purchases: recentResult.rows.map((r) => this.mapRowToPurchase(r)),
    };

    // Paginated items for admin table
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;

    let itemsWhere = 'WHERE 1=1';
    const itemsParams: (string | number)[] = [];

    if (options?.status) {
      itemsWhere += ' AND etp.payment_status = ?';
      itemsParams.push(options.status);
    }
    if (options?.startDate) {
      itemsWhere += ' AND etp.created_at >= ?';
      itemsParams.push(options.startDate);
    }
    if (options?.endDate) {
      itemsWhere += ' AND etp.created_at <= ?';
      itemsParams.push(options.endDate);
    }

    const countResult = await this.db.query<{ total: bigint }>(
      `SELECT COUNT(*) as total FROM event_ticket_purchases etp ${itemsWhere}`,
      itemsParams
    );
    const total = countResult.rows[0] ? bigIntToNumber(countResult.rows[0].total) : 0;

    const itemsResult = await this.db.query<EventTicketPurchaseRow & {
      event_title: string;
      event_slug: string;
      buyer_name: string;
      buyer_email: string;
      ticket_name: string;
    }>(
      `SELECT etp.*,
        e.title as event_title, e.slug as event_slug,
        u.name as buyer_name, u.email as buyer_email,
        et.ticket_name
       FROM event_ticket_purchases etp
       JOIN events e ON etp.event_id = e.id
       JOIN users u ON etp.user_id = u.id
       JOIN event_tickets et ON etp.ticket_id = et.id
       ${itemsWhere}
       ORDER BY etp.created_at DESC
       LIMIT ? OFFSET ?`,
      [...itemsParams, limit, offset]
    );

    const items: AdminTicketSale[] = itemsResult.rows.map((r) => ({
      ...this.mapRowToPurchase(r),
      event_title: r.event_title,
      event_slug: r.event_slug,
      buyer_name: r.buyer_name,
      buyer_email: r.buyer_email,
      ticket_name: r.ticket_name,
    }));

    return { stats, items, total };
  }

  /**
   * Get user's purchased tickets enriched with event details.
   * Used by "My Purchased Tickets" dashboard page.
   *
   * @param userId User ID
   * @returns Array of enriched ticket purchases
   * @phase Phase 5B - Native Ticketing (My Tickets)
   */
  async getUserTicketPurchasesEnriched(userId: number): Promise<EnrichedTicketPurchase[]> {
    const result = await this.db.query<EventTicketPurchaseRow & {
      event_title: string;
      event_slug: string;
      event_start_date: string;
      event_end_date: string;
      event_venue_name: string | null;
      event_city: string | null;
      event_state: string | null;
      event_check_in_enabled: number | boolean;
      ticket_name: string;
    }>(
      `SELECT etp.*,
        e.title as event_title, e.slug as event_slug,
        e.start_date as event_start_date, e.end_date as event_end_date,
        e.venue_name as event_venue_name, e.city as event_city, e.state as event_state,
        e.check_in_enabled as event_check_in_enabled,
        et.ticket_name
       FROM event_ticket_purchases etp
       JOIN events e ON etp.event_id = e.id
       JOIN event_tickets et ON etp.ticket_id = et.id
       WHERE etp.user_id = ?
       ORDER BY etp.created_at DESC`,
      [userId]
    );

    return result.rows.map((r) => ({
      ...this.mapRowToPurchase(r),
      event_title: r.event_title,
      event_slug: r.event_slug,
      event_start_date: r.event_start_date,
      event_end_date: r.event_end_date,
      event_venue_name: r.event_venue_name,
      event_city: r.event_city,
      event_state: r.event_state,
      event_check_in_enabled: Boolean(r.event_check_in_enabled),
      ticket_name: r.ticket_name,
    }));
  }

  /**
   * Map EventTicketPurchaseRow to TicketPurchase
   * Parses DECIMAL strings to numbers and date strings to Date objects.
   */
  private mapRowToPurchase(row: EventTicketPurchaseRow): TicketPurchase {
    return {
      id: row.id,
      event_id: row.event_id,
      ticket_id: row.ticket_id,
      user_id: row.user_id,
      quantity: row.quantity,
      unit_price: parseFloat(row.unit_price),
      total_amount: parseFloat(row.total_amount),
      currency: row.currency,
      stripe_checkout_session_id: row.stripe_checkout_session_id,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      payment_status: row.payment_status,
      purchased_at: row.purchased_at ? new Date(row.purchased_at) : null,
      refunded_at: row.refunded_at ? new Date(row.refunded_at) : null,
      refund_amount: row.refund_amount ? parseFloat(row.refund_amount) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  // ==========================================================================
  // Phase 6A: Event Co-Host Methods
  // ==========================================================================

  /**
   * Get co-hosts for an event with joined listing data
   * Public: active only. Owner/admin: all statuses via includeAll flag.
   */
  async getEventCoHosts(eventId: number, includeAll = false): Promise<EventCoHost[]> {
    const statusFilter = includeAll ? '' : "AND ch.status = 'active'";
    const result = await this.db.query<EventCoHost>(
      `SELECT ch.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_co_hosts ch
       LEFT JOIN listings l ON l.id = ch.co_host_listing_id
       WHERE ch.event_id = ? ${statusFilter}
       ORDER BY ch.display_order ASC, ch.created_at ASC`,
      [eventId]
    );
    return result.rows;
  }

  /**
   * Invite a listing as co-host (creates pending record)
   * Tier-gated via TIER_CO_HOST_LIMITS
   */
  async createCoHost(input: CreateEventCoHostInput, userId: number): Promise<EventCoHost> {
    // Check tier limit
    const event = await this.getById(input.event_id);
    if (!event) throw BizError.notFound('Event', input.event_id);

    if (event.listing_id) {
      const listing = await this.listingService.getById(event.listing_id);
      const tier = listing?.tier || 'essentials';
      const limit = TIER_CO_HOST_LIMITS[tier] ?? 0;
      const currentCount = await this.getCoHostCount(input.event_id);
      if (currentCount >= limit) {
        throw new Error('Co-host limit reached for your listing tier');
      }
    }

    try {
      await this.db.query(
        `INSERT INTO event_co_hosts
           (event_id, co_host_listing_id, co_host_role, display_order, invitation_message, invited_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          input.event_id,
          input.co_host_listing_id,
          input.co_host_role,
          input.display_order ?? 0,
          input.invitation_message ?? null,
          userId,
        ]
      );
    } catch (error: unknown) {
      const mysqlError = error as { code?: string; errno?: number };
      if (mysqlError?.code === 'ER_DUP_ENTRY' || mysqlError?.errno === 1062) {
        throw new Error('This listing is already a co-host for this event');
      }
      throw error;
    }

    // Fetch the created co-host with listing data
    const result = await this.db.query<EventCoHost>(
      `SELECT ch.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_co_hosts ch
       LEFT JOIN listings l ON l.id = ch.co_host_listing_id
       WHERE ch.event_id = ? AND ch.co_host_listing_id = ?
       ORDER BY ch.created_at DESC
       LIMIT 1`,
      [input.event_id, input.co_host_listing_id]
    );

    return result.rows[0] as EventCoHost;
  }

  /**
   * Update co-host role, status, or display order
   */
  async updateCoHost(coHostId: number, input: UpdateEventCoHostInput): Promise<EventCoHost> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.co_host_role !== undefined) { fields.push('co_host_role = ?'); values.push(input.co_host_role); }
    if (input.display_order !== undefined) { fields.push('display_order = ?'); values.push(input.display_order); }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
      // Set accepted_at when status changes to active
      if (input.status === 'active') {
        fields.push('accepted_at = NOW()');
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(coHostId);
    await this.db.query(
      `UPDATE event_co_hosts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const result = await this.db.query<EventCoHost>(
      `SELECT ch.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_co_hosts ch
       LEFT JOIN listings l ON l.id = ch.co_host_listing_id
       WHERE ch.id = ?`,
      [coHostId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('Co-host', coHostId);
    }

    return result.rows[0] as EventCoHost;
  }

  /**
   * Remove a co-host from an event
   */
  async removeCoHost(coHostId: number): Promise<void> {
    await this.db.query('DELETE FROM event_co_hosts WHERE id = ?', [coHostId]);
  }

  /**
   * Count active/pending co-hosts for tier limit checking
   */
  async getCoHostCount(eventId: number): Promise<number> {
    const result = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM event_co_hosts
       WHERE event_id = ? AND status IN ('pending', 'active')`,
      [eventId]
    );
    return bigIntToNumber(result.rows[0]?.count ?? 0);
  }

  /**
   * Check if a listing is already a co-host for an event
   */
  async getCoHostByListingAndEvent(eventId: number, listingId: number): Promise<EventCoHost | null> {
    const result = await this.db.query<EventCoHost>(
      `SELECT ch.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_co_hosts ch
       LEFT JOIN listings l ON l.id = ch.co_host_listing_id
       WHERE ch.event_id = ? AND ch.co_host_listing_id = ?`,
      [eventId, listingId]
    );
    return result.rows[0] || null;
  }

  /**
   * Admin: paginated list of all co-hosts across events with filtering
   */
  async getAdminCoHosts(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    co_host_role?: string;
    sortColumn?: string;
    sortDirection?: string;
  } = {}): Promise<{ co_hosts: AdminEventCoHost[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = '',
      co_host_role = '',
      sortColumn = 'created_at',
      sortDirection = 'desc',
    } = filters;

    const offset = (page - 1) * pageSize;
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (search) {
      whereClauses.push('(e.title LIKE ? OR l.name LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClauses.push('ch.status = ?');
      values.push(status);
    }
    if (co_host_role) {
      whereClauses.push('ch.co_host_role = ?');
      values.push(co_host_role);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSort = ['created_at', 'co_host_role', 'status', 'display_order'];
    const safeSort = allowedSort.includes(sortColumn) ? `ch.${sortColumn}` : 'ch.created_at';
    const safeDir = sortDirection === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total
       FROM event_co_hosts ch
       LEFT JOIN events e ON e.id = ch.event_id
       LEFT JOIN listings l ON l.id = ch.co_host_listing_id
       ${where}`,
      values
    );
    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<AdminEventCoHost>(
      `SELECT ch.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date, e.status as event_status,
              u.display_name as invited_by_name
       FROM event_co_hosts ch
       LEFT JOIN events e ON e.id = ch.event_id
       LEFT JOIN listings l ON l.id = ch.co_host_listing_id
       LEFT JOIN users u ON u.id = ch.invited_by_user_id
       ${where}
       ORDER BY ${safeSort} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { co_hosts: result.rows, total };
  }

  // ============================================================================
  // Phase 6B: Exhibitor Methods
  // ============================================================================

  /**
   * Get exhibitors for an event with joined listing data
   * Public: active only. Owner/admin: all statuses via includeAll flag.
   */
  async getEventExhibitors(eventId: number, includeAll = false): Promise<EventExhibitor[]> {
    const statusFilter = includeAll ? '' : "AND ex.status = 'active'";
    const result = await this.db.query<EventExhibitor>(
      `SELECT ex.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_exhibitors ex
       LEFT JOIN listings l ON l.id = ex.exhibitor_listing_id
       WHERE ex.event_id = ? ${statusFilter}
       ORDER BY ex.display_order ASC, ex.created_at ASC`,
      [eventId]
    );
    return result.rows;
  }

  /**
   * Invite a listing as exhibitor (creates pending record)
   * Tier-gated via TIER_EXHIBITOR_LIMITS
   */
  async createExhibitor(input: CreateEventExhibitorInput, userId: number): Promise<EventExhibitor> {
    // Check tier limit
    const event = await this.getById(input.event_id);
    if (!event) throw BizError.notFound('Event', input.event_id);

    if (event.listing_id) {
      const listing = await this.listingService.getById(event.listing_id);
      const tier = listing?.tier || 'essentials';
      const limit = TIER_EXHIBITOR_LIMITS[tier] ?? 0;
      const currentCount = await this.getExhibitorCount(input.event_id);
      if (currentCount >= limit) {
        throw new Error('Exhibitor limit reached for your listing tier');
      }
    }

    try {
      await this.db.query(
        `INSERT INTO event_exhibitors
           (event_id, exhibitor_listing_id, booth_number, booth_size, exhibitor_description, display_order, invitation_message, invited_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.event_id,
          input.exhibitor_listing_id,
          input.booth_number ?? null,
          input.booth_size ?? 'medium',
          input.exhibitor_description ?? null,
          input.display_order ?? 0,
          input.invitation_message ?? null,
          userId,
        ]
      );
    } catch (error: unknown) {
      const mysqlError = error as { code?: string; errno?: number };
      if (mysqlError?.code === 'ER_DUP_ENTRY' || mysqlError?.errno === 1062) {
        throw new Error('This listing is already an exhibitor for this event');
      }
      throw error;
    }

    // Fetch the created exhibitor with listing data
    const result = await this.db.query<EventExhibitor>(
      `SELECT ex.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_exhibitors ex
       LEFT JOIN listings l ON l.id = ex.exhibitor_listing_id
       WHERE ex.event_id = ? AND ex.exhibitor_listing_id = ?
       ORDER BY ex.created_at DESC
       LIMIT 1`,
      [input.event_id, input.exhibitor_listing_id]
    );

    return result.rows[0] as EventExhibitor;
  }

  /**
   * Update exhibitor booth info, status, or display order
   */
  async updateExhibitor(exhibitorId: number, input: UpdateEventExhibitorInput): Promise<EventExhibitor> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.booth_number !== undefined) { fields.push('booth_number = ?'); values.push(input.booth_number); }
    if (input.booth_size !== undefined) { fields.push('booth_size = ?'); values.push(input.booth_size); }
    if (input.exhibitor_description !== undefined) { fields.push('exhibitor_description = ?'); values.push(input.exhibitor_description); }
    if (input.exhibitor_logo !== undefined) { fields.push('exhibitor_logo = ?'); values.push(input.exhibitor_logo); }
    if (input.display_order !== undefined) { fields.push('display_order = ?'); values.push(input.display_order); }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
      // Set accepted_at when status changes to active
      if (input.status === 'active') {
        fields.push('accepted_at = NOW()');
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(exhibitorId);
    await this.db.query(
      `UPDATE event_exhibitors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const result = await this.db.query<EventExhibitor>(
      `SELECT ex.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_exhibitors ex
       LEFT JOIN listings l ON l.id = ex.exhibitor_listing_id
       WHERE ex.id = ?`,
      [exhibitorId]
    );

    if (result.rows.length === 0) {
      throw BizError.notFound('Exhibitor', exhibitorId);
    }

    return result.rows[0] as EventExhibitor;
  }

  /**
   * Remove an exhibitor from an event
   */
  async removeExhibitor(exhibitorId: number): Promise<void> {
    await this.db.query('DELETE FROM event_exhibitors WHERE id = ?', [exhibitorId]);
  }

  /**
   * Count active/pending exhibitors for tier limit checking
   */
  async getExhibitorCount(eventId: number): Promise<number> {
    const result = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM event_exhibitors
       WHERE event_id = ? AND status IN ('pending', 'active')`,
      [eventId]
    );
    return bigIntToNumber(result.rows[0]?.count ?? 0);
  }

  /**
   * Check if a listing is already an exhibitor for an event
   */
  async getExhibitorByListingAndEvent(eventId: number, listingId: number): Promise<EventExhibitor | null> {
    const result = await this.db.query<EventExhibitor>(
      `SELECT ex.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier
       FROM event_exhibitors ex
       LEFT JOIN listings l ON l.id = ex.exhibitor_listing_id
       WHERE ex.event_id = ? AND ex.exhibitor_listing_id = ?`,
      [eventId, listingId]
    );
    return result.rows[0] || null;
  }

  /**
   * Admin: paginated list of all exhibitors across events with filtering
   */
  async getAdminExhibitors(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    booth_size?: string;
    sortColumn?: string;
    sortDirection?: string;
  } = {}): Promise<{ exhibitors: AdminEventExhibitor[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = '',
      booth_size = '',
      sortColumn = 'created_at',
      sortDirection = 'desc',
    } = filters;

    const offset = (page - 1) * pageSize;
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (search) {
      whereClauses.push('(e.title LIKE ? OR l.name LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClauses.push('ex.status = ?');
      values.push(status);
    }
    if (booth_size) {
      whereClauses.push('ex.booth_size = ?');
      values.push(booth_size);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSort = ['created_at', 'booth_size', 'status', 'display_order', 'click_count', 'impression_count'];
    const safeSort = allowedSort.includes(sortColumn) ? `ex.${sortColumn}` : 'ex.created_at';
    const safeDir = sortDirection === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total
       FROM event_exhibitors ex
       LEFT JOIN events e ON e.id = ex.event_id
       LEFT JOIN listings l ON l.id = ex.exhibitor_listing_id
       ${where}`,
      values
    );
    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<AdminEventExhibitor>(
      `SELECT ex.*,
              l.name as listing_name, l.slug as listing_slug,
              l.logo_url as listing_logo, l.city as listing_city,
              l.state as listing_state, l.tier as listing_tier,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date, e.status as event_status,
              u.display_name as invited_by_name
       FROM event_exhibitors ex
       LEFT JOIN events e ON e.id = ex.event_id
       LEFT JOIN listings l ON l.id = ex.exhibitor_listing_id
       LEFT JOIN users u ON u.id = ex.invited_by_user_id
       ${where}
       ORDER BY ${safeSort} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { exhibitors: result.rows, total };
  }

  /**
   * Batch increment impression_count for visible exhibitors (fire-and-forget analytics)
   */
  async incrementExhibitorImpressions(exhibitorIds: number[]): Promise<void> {
    if (!exhibitorIds.length) return;
    const placeholders = exhibitorIds.map(() => '?').join(', ');
    await this.db.query(
      `UPDATE event_exhibitors SET impression_count = impression_count + 1
       WHERE id IN (${placeholders}) AND status = 'active'`,
      exhibitorIds
    );
  }

  // ==========================================================================
  // Phase 6C: Event Service Request Methods (Quote Integration)
  // ==========================================================================

  /**
   * Map a raw DB row to EventServiceRequest (handles DECIMAL string parsing)
   */
  private mapRowToServiceRequest(row: EventServiceRequestRow & Record<string, unknown>): EventServiceRequest {
    const budgetMin = row.budget_min != null ? parseFloat(row.budget_min) : null;
    const budgetMax = row.budget_max != null ? parseFloat(row.budget_max) : null;
    return {
      id: row.id,
      event_id: row.event_id,
      requester_listing_id: row.requester_listing_id,
      quote_id: row.quote_id,
      service_category: row.service_category as EventServiceRequest['service_category'],
      title: row.title,
      description: row.description,
      required_by_date: row.required_by_date,
      budget_min: !isNaN(budgetMin as number) ? budgetMin : null,
      budget_max: !isNaN(budgetMax as number) ? budgetMax : null,
      priority: row.priority as EventServiceRequest['priority'],
      status: row.status as EventServiceRequest['status'],
      fulfilled_by_listing_id: row.fulfilled_by_listing_id,
      fulfilled_quote_response_id: row.fulfilled_quote_response_id,
      notes: row.notes,
      created_by_user_id: row.created_by_user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Joined fields
      event_title: row.event_title as string | undefined,
      event_slug: row.event_slug as string | undefined,
      event_start_date: row.event_start_date as string | undefined,
      requester_listing_name: row.requester_listing_name as string | undefined,
      fulfilled_by_name: row.fulfilled_by_name as string | undefined,
      quote_status: row.quote_status as string | undefined,
      quote_response_count: row.quote_response_count != null
        ? bigIntToNumber(row.quote_response_count as bigint | number)
        : undefined,
    };
  }

  /**
   * Get service requests for an event with quote status and response count
   */
  async getEventServiceRequests(eventId: number): Promise<EventServiceRequest[]> {
    const result = await this.db.query<EventServiceRequestRow & Record<string, unknown>>(
      `SELECT esr.*,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date,
              l.name as requester_listing_name,
              fl.name as fulfilled_by_name,
              q.status as quote_status,
              (SELECT COUNT(*) FROM quote_responses qr WHERE qr.quote_id = esr.quote_id) as quote_response_count
       FROM event_service_requests esr
       LEFT JOIN events e ON esr.event_id = e.id
       LEFT JOIN listings l ON esr.requester_listing_id = l.id
       LEFT JOIN listings fl ON esr.fulfilled_by_listing_id = fl.id
       LEFT JOIN quotes q ON esr.quote_id = q.id
       WHERE esr.event_id = ?
       ORDER BY esr.priority DESC, esr.created_at ASC`,
      [eventId]
    );
    return result.rows.map(row => this.mapRowToServiceRequest(row));
  }

  /**
   * Get a single service request by ID with full details
   */
  async getServiceRequestById(requestId: number): Promise<EventServiceRequest | null> {
    const result = await this.db.query<EventServiceRequestRow & Record<string, unknown>>(
      `SELECT esr.*,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date,
              l.name as requester_listing_name,
              fl.name as fulfilled_by_name,
              q.status as quote_status,
              (SELECT COUNT(*) FROM quote_responses qr WHERE qr.quote_id = esr.quote_id) as quote_response_count
       FROM event_service_requests esr
       LEFT JOIN events e ON esr.event_id = e.id
       LEFT JOIN listings l ON esr.requester_listing_id = l.id
       LEFT JOIN listings fl ON esr.fulfilled_by_listing_id = fl.id
       LEFT JOIN quotes q ON esr.quote_id = q.id
       WHERE esr.id = ?`,
      [requestId]
    );
    if (!result.rows[0]) return null;
    return this.mapRowToServiceRequest(result.rows[0]);
  }

  /**
   * Count active service requests for an event (used for tier limit checking)
   */
  async getServiceRequestCount(eventId: number): Promise<number> {
    const result = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM event_service_requests
       WHERE event_id = ? AND status NOT IN ('cancelled')`,
      [eventId]
    );
    return bigIntToNumber(result.rows[0]?.count ?? 0);
  }

  /**
   * Create a service request (draft) — tier-gated (Preferred/Premium only)
   * The linked quote is NOT created at this stage; use updateServiceRequest with status='open' to publish.
   */
  async createServiceRequest(
    input: CreateEventServiceRequestInput,
    userId: number
  ): Promise<EventServiceRequest> {
    // 1. Verify event exists
    const event = await this.getById(input.event_id);
    if (!event) throw BizError.notFound('Event', input.event_id);

    // 2. Check tier limit
    if (event.listing_id) {
      const listing = await this.listingService.getById(event.listing_id);
      const tier = listing?.tier || 'essentials';
      const limit = TIER_SERVICE_REQUEST_LIMITS[tier] ?? 0;
      const currentCount = await this.getServiceRequestCount(input.event_id);
      if (currentCount >= limit) {
        throw new Error(`Service request limit reached for your listing tier (${tier}: max ${limit})`);
      }
    } else {
      // Community events have no listing — no tier check, but no service requests either
      throw new Error('Service requests require an event with an associated listing (Preferred or Premium tier)');
    }

    // 3. Insert the service request record with status='draft'
    try {
      await this.db.query(
        `INSERT INTO event_service_requests
           (event_id, requester_listing_id, service_category, title, description,
            required_by_date, budget_min, budget_max, priority, status, notes, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
        [
          input.event_id,
          event.listing_id,
          input.service_category,
          input.title.trim(),
          input.description?.trim() ?? null,
          input.required_by_date ?? null,
          input.budget_min ?? null,
          input.budget_max ?? null,
          input.priority ?? 'medium',
          input.notes?.trim() ?? null,
          userId,
        ]
      );
    } catch (error: unknown) {
      const mysqlError = error as { code?: string; errno?: number };
      if (mysqlError?.code === 'ER_DUP_ENTRY' || mysqlError?.errno === 1062) {
        throw new Error(`A service request for "${input.service_category}" already exists for this event`);
      }
      throw error;
    }

    // 4. Fetch and return the created record
    const result = await this.db.query<EventServiceRequestRow & Record<string, unknown>>(
      `SELECT esr.*,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date,
              l.name as requester_listing_name
       FROM event_service_requests esr
       LEFT JOIN events e ON esr.event_id = e.id
       LEFT JOIN listings l ON esr.requester_listing_id = l.id
       WHERE esr.event_id = ? AND esr.service_category = ?
       ORDER BY esr.created_at DESC
       LIMIT 1`,
      [input.event_id, input.service_category]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to retrieve created service request');
    }
    return this.mapRowToServiceRequest(result.rows[0]);
  }

  /**
   * Update a service request.
   * When status transitions from 'draft' to 'open', creates the linked quote via QuoteService.
   * When status transitions to 'cancelled', the caller is responsible for cancelling the linked quote if needed.
   */
  async updateServiceRequest(
    requestId: number,
    input: UpdateEventServiceRequestInput,
    userId?: number
  ): Promise<EventServiceRequest> {
    // Fetch existing record to check current state
    const existing = await this.getServiceRequestById(requestId);
    if (!existing) throw BizError.notFound('ServiceRequest', requestId);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.title !== undefined) { fields.push('title = ?'); values.push(input.title.trim()); }
    if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description?.trim() ?? null); }
    if (input.required_by_date !== undefined) { fields.push('required_by_date = ?'); values.push(input.required_by_date ?? null); }
    if (input.budget_min !== undefined) { fields.push('budget_min = ?'); values.push(input.budget_min ?? null); }
    if (input.budget_max !== undefined) { fields.push('budget_max = ?'); values.push(input.budget_max ?? null); }
    if (input.priority !== undefined) { fields.push('priority = ?'); values.push(input.priority); }
    if (input.notes !== undefined) { fields.push('notes = ?'); values.push(input.notes?.trim() ?? null); }

    // Handle status transition: draft → open (publish — create linked quote)
    if (input.status !== undefined && input.status !== existing.status) {
      if (input.status === 'open' && existing.status === 'draft' && userId) {
        // Create the linked quote via QuoteService
        const quoteService = getQuoteService();
        const event = await this.getById(existing.event_id);
        const quoteTitle = event
          ? `[Event: ${event.title}] ${existing.title}`
          : existing.title;

        const quote = await quoteService.createQuote(userId, {
          title: quoteTitle,
          description: existing.description ?? existing.title,
          serviceCategory: existing.service_category,
          budgetMin: existing.budget_min ?? undefined,
          budgetMax: existing.budget_max ?? undefined,
          preferredStartDate: existing.required_by_date ?? undefined,
          visibility: 'direct',
        });

        fields.push('quote_id = ?');
        values.push(quote.id);
      }

      fields.push('status = ?');
      values.push(input.status);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(requestId);
    await this.db.query(
      `UPDATE event_service_requests SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.getServiceRequestById(requestId);
    if (!updated) throw BizError.notFound('ServiceRequest', requestId);
    return updated;
  }

  /**
   * Remove a service request record
   */
  async removeServiceRequest(requestId: number): Promise<void> {
    await this.db.query('DELETE FROM event_service_requests WHERE id = ?', [requestId]);
  }

  /**
   * Admin: paginated list of all service requests across all events with filtering
   */
  async getAllServiceRequestsAdmin(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    service_category?: string;
    priority?: string;
    sortColumn?: string;
    sortDirection?: string;
  } = {}): Promise<{ service_requests: AdminEventServiceRequest[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = '',
      service_category = '',
      priority = '',
      sortColumn = 'created_at',
      sortDirection = 'desc',
    } = filters;

    const offset = (page - 1) * pageSize;
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (search) {
      whereClauses.push('(esr.title LIKE ? OR e.title LIKE ? OR l.name LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClauses.push('esr.status = ?');
      values.push(status);
    }
    if (service_category) {
      whereClauses.push('esr.service_category = ?');
      values.push(service_category);
    }
    if (priority) {
      whereClauses.push('esr.priority = ?');
      values.push(priority);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSort = ['created_at', 'status', 'priority', 'service_category', 'required_by_date'];
    const safeSort = allowedSort.includes(sortColumn) ? `esr.${sortColumn}` : 'esr.created_at';
    const safeDir = sortDirection === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total
       FROM event_service_requests esr
       LEFT JOIN events e ON e.id = esr.event_id
       LEFT JOIN listings l ON l.id = esr.requester_listing_id
       ${where}`,
      values
    );
    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    const result = await this.db.query<EventServiceRequestRow & Record<string, unknown>>(
      `SELECT esr.*,
              l.name as requester_listing_name,
              e.title as event_title, e.slug as event_slug,
              e.start_date as event_start_date, e.status as event_status,
              u.display_name as created_by_name,
              fl.name as fulfilled_by_name,
              q.status as quote_status
       FROM event_service_requests esr
       LEFT JOIN listings l ON l.id = esr.requester_listing_id
       LEFT JOIN events e ON e.id = esr.event_id
       LEFT JOIN users u ON u.id = esr.created_by_user_id
       LEFT JOIN listings fl ON fl.id = esr.fulfilled_by_listing_id
       LEFT JOIN quotes q ON q.id = esr.quote_id
       ${where}
       ORDER BY ${safeSort} ${safeDir}
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    const service_requests = result.rows.map(row => ({
      ...this.mapRowToServiceRequest(row),
      event_status: row.event_status as string | undefined,
      created_by_name: row.created_by_name as string | undefined,
    })) as AdminEventServiceRequest[];

    return { service_requests, total };
  }

  // ==========================================================================
  // Phase 6D: Organizer Analytics Aggregation Methods
  // ==========================================================================

  /**
   * Get organizer workflow analytics for a single event.
   * Aggregates co-host, exhibitor, and service request metrics.
   *
   * @phase Phase 6D - Organizer Analytics
   */
  async getOrganizerAnalytics(eventId: number): Promise<OrganizerAnalyticsData> {
    // 1. Co-host status breakdown
    const coHostResult = await this.db.query<{ status: string; count: bigint | number }>(
      `SELECT status, COUNT(*) as count
       FROM event_co_hosts
       WHERE event_id = ?
       GROUP BY status`,
      [eventId]
    );

    const coHostCounts: Record<string, number> = {};
    for (const row of coHostResult.rows) {
      coHostCounts[row.status] = bigIntToNumber(row.count);
    }

    const chPending = coHostCounts['pending'] ?? 0;
    const chActive = coHostCounts['active'] ?? 0;
    const chDeclined = coHostCounts['declined'] ?? 0;
    const chRemoved = coHostCounts['removed'] ?? 0;
    const chTotal = chPending + chActive + chDeclined + chRemoved;
    const chAcceptanceDenom = chActive + chDeclined;
    const chAcceptanceRate = chAcceptanceDenom > 0 ? (chActive / chAcceptanceDenom) * 100 : 0;

    // 2. Exhibitor status breakdown + aggregate impression/click analytics
    const exhibitorResult = await this.db.query<{
      status: string;
      count: bigint | number;
      total_impressions: bigint | number | null;
      total_clicks: bigint | number | null;
    }>(
      `SELECT status, COUNT(*) as count,
              SUM(impression_count) as total_impressions,
              SUM(click_count) as total_clicks
       FROM event_exhibitors
       WHERE event_id = ?
       GROUP BY status`,
      [eventId]
    );

    const exCounts: Record<string, number> = {};
    let exTotalImpressions = 0;
    let exTotalClicks = 0;
    for (const row of exhibitorResult.rows) {
      exCounts[row.status] = bigIntToNumber(row.count);
      exTotalImpressions += bigIntToNumber(row.total_impressions ?? 0);
      exTotalClicks += bigIntToNumber(row.total_clicks ?? 0);
    }

    const exPending = exCounts['pending'] ?? 0;
    const exActive = exCounts['active'] ?? 0;
    const exDeclined = exCounts['declined'] ?? 0;
    const exRemoved = exCounts['removed'] ?? 0;
    const exTotal = exPending + exActive + exDeclined + exRemoved;
    const exAcceptanceDenom = exActive + exDeclined;
    const exAcceptanceRate = exAcceptanceDenom > 0 ? (exActive / exAcceptanceDenom) * 100 : 0;
    const exCTR = exTotalImpressions > 0 ? (exTotalClicks / exTotalImpressions) * 100 : 0;

    // 3. Service request status breakdown + quote response aggregate
    const serviceResult = await this.db.query<{
      status: string;
      count: bigint | number;
      total_responses: bigint | number | null;
    }>(
      `SELECT status, COUNT(*) as count,
              SUM(quote_response_count) as total_responses
       FROM event_service_requests
       WHERE event_id = ?
       GROUP BY status`,
      [eventId]
    );

    const srCounts: Record<string, number> = {};
    let srTotalResponses = 0;
    for (const row of serviceResult.rows) {
      srCounts[row.status] = bigIntToNumber(row.count);
      srTotalResponses += bigIntToNumber(row.total_responses ?? 0);
    }

    const srDraft = srCounts['draft'] ?? 0;
    const srOpen = srCounts['open'] ?? 0;
    const srInProgress = srCounts['in_progress'] ?? 0;
    const srFulfilled = srCounts['fulfilled'] ?? 0;
    const srCancelled = srCounts['cancelled'] ?? 0;
    const srTotal = srDraft + srOpen + srInProgress + srFulfilled + srCancelled;
    const srActionable = srTotal - srCancelled - srDraft;
    const srFulfillmentRate = srActionable > 0 ? (srFulfilled / srActionable) * 100 : 0;
    const srAvgResponses = srTotal > 0 ? srTotalResponses / srTotal : 0;

    // 4. Get event's listing tier for limit context
    const event = await this.getById(eventId);
    let tier = 'essentials';
    if (event?.listing_id) {
      try {
        const listing = await this.listingService.getById(event.listing_id);
        tier = listing?.tier ?? 'essentials';
      } catch {
        // fall back to essentials
      }
    }

    const tierCoHostLimit = TIER_CO_HOST_LIMITS[tier] ?? 0;
    const tierExhibitorLimit = TIER_EXHIBITOR_LIMITS[tier] ?? 0;
    const tierServiceRequestLimit = TIER_SERVICE_REQUEST_LIMITS[tier] ?? 0;

    // 5. Compute organizer score: 40% co-host acceptance + 30% exhibitor engagement + 30% service fulfillment
    const scoreCoHost = chAcceptanceRate * 0.4;
    const scoreExhibitor = exAcceptanceRate * 0.3;
    const scoreService = srFulfillmentRate * 0.3;
    const organizerScore = Math.min(100, Math.round(scoreCoHost + scoreExhibitor + scoreService));

    return {
      event_id: eventId,
      co_hosts: {
        total: chTotal,
        pending: chPending,
        active: chActive,
        declined: chDeclined,
        removed: chRemoved,
        acceptance_rate: Math.round(chAcceptanceRate * 10) / 10,
      },
      exhibitors: {
        total: exTotal,
        pending: exPending,
        active: exActive,
        declined: exDeclined,
        removed: exRemoved,
        acceptance_rate: Math.round(exAcceptanceRate * 10) / 10,
        total_impressions: exTotalImpressions,
        total_clicks: exTotalClicks,
        click_through_rate: Math.round(exCTR * 10) / 10,
      },
      service_requests: {
        total: srTotal,
        draft: srDraft,
        open: srOpen,
        in_progress: srInProgress,
        fulfilled: srFulfilled,
        cancelled: srCancelled,
        fulfillment_rate: Math.round(srFulfillmentRate * 10) / 10,
        total_quote_responses: srTotalResponses,
        avg_responses_per_request: Math.round(srAvgResponses * 10) / 10,
      },
      organizer_score: organizerScore,
      tier_limits: {
        co_hosts: tierCoHostLimit,
        exhibitors: tierExhibitorLimit,
        service_requests: tierServiceRequestLimit,
        tier,
      },
    };
  }

  /**
   * Get platform-wide organizer activity stats for the admin dashboard.
   *
   * @phase Phase 6D - Admin Organizer Overview
   */
  async getAdminOrganizerStats(): Promise<AdminOrganizerStats> {
    // Events with active co-hosts
    const evWithCoHostsRes = await this.db.query<{ val: bigint | number }>(
      `SELECT COUNT(DISTINCT event_id) as val FROM event_co_hosts WHERE status = 'active'`
    );
    const evWithCoHostsExRes = await this.db.query<{ val: bigint | number }>(
      `SELECT COUNT(DISTINCT event_id) as val FROM event_exhibitors WHERE status = 'active'`
    );
    const evWithSRRes = await this.db.query<{ val: bigint | number }>(
      `SELECT COUNT(DISTINCT event_id) as val FROM event_service_requests WHERE status NOT IN ('cancelled', 'draft')`
    );

    // Totals
    const totalCHRes = await this.db.query<{ val: bigint | number }>(
      `SELECT COUNT(*) as val FROM event_co_hosts`
    );
    const totalExRes = await this.db.query<{ val: bigint | number }>(
      `SELECT COUNT(*) as val FROM event_exhibitors`
    );
    const totalSRRes = await this.db.query<{ val: bigint | number }>(
      `SELECT COUNT(*) as val FROM event_service_requests`
    );

    // Average acceptance rates: active / (active + declined)
    const chRateRes = await this.db.query<{ active_count: bigint | number; declined_count: bigint | number }>(
      `SELECT
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
         SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count
       FROM event_co_hosts`
    );
    const exRateRes = await this.db.query<{ active_count: bigint | number; declined_count: bigint | number }>(
      `SELECT
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
         SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_count
       FROM event_exhibitors`
    );

    // Service fulfillment rate: fulfilled / (total - cancelled - draft)
    const srFulfillRes = await this.db.query<{
      fulfilled_count: bigint | number;
      cancelled_count: bigint | number;
      draft_count: bigint | number;
      total_count: bigint | number;
    }>(
      `SELECT
         SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled_count,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
         COUNT(*) as total_count
       FROM event_service_requests`
    );

    const chActive = bigIntToNumber(chRateRes.rows[0]?.active_count ?? 0);
    const chDeclined = bigIntToNumber(chRateRes.rows[0]?.declined_count ?? 0);
    const chDenom = chActive + chDeclined;
    const avgChAcceptance = chDenom > 0 ? (chActive / chDenom) * 100 : 0;

    const exActive = bigIntToNumber(exRateRes.rows[0]?.active_count ?? 0);
    const exDeclined = bigIntToNumber(exRateRes.rows[0]?.declined_count ?? 0);
    const exDenom = exActive + exDeclined;
    const avgExAcceptance = exDenom > 0 ? (exActive / exDenom) * 100 : 0;

    const srFulfilled = bigIntToNumber(srFulfillRes.rows[0]?.fulfilled_count ?? 0);
    const srCancelled = bigIntToNumber(srFulfillRes.rows[0]?.cancelled_count ?? 0);
    const srDraft = bigIntToNumber(srFulfillRes.rows[0]?.draft_count ?? 0);
    const srTotal = bigIntToNumber(srFulfillRes.rows[0]?.total_count ?? 0);
    const srActionable = srTotal - srCancelled - srDraft;
    const avgSrFulfillment = srActionable > 0 ? (srFulfilled / srActionable) * 100 : 0;

    return {
      events_with_co_hosts: bigIntToNumber(evWithCoHostsRes.rows[0]?.val ?? 0),
      events_with_exhibitors: bigIntToNumber(evWithCoHostsExRes.rows[0]?.val ?? 0),
      events_with_service_requests: bigIntToNumber(evWithSRRes.rows[0]?.val ?? 0),
      total_co_hosts: bigIntToNumber(totalCHRes.rows[0]?.val ?? 0),
      total_exhibitors: bigIntToNumber(totalExRes.rows[0]?.val ?? 0),
      total_service_requests: bigIntToNumber(totalSRRes.rows[0]?.val ?? 0),
      avg_co_host_acceptance_rate: Math.round(avgChAcceptance * 10) / 10,
      avg_exhibitor_acceptance_rate: Math.round(avgExAcceptance * 10) / 10,
      avg_service_fulfillment_rate: Math.round(avgSrFulfillment * 10) / 10,
    };
  }

  // ============================================================
  // Phase 8: KPI Dashboard Stats (FM Section 17)
  // ============================================================

  /**
   * Get platform-wide KPI stats for admin events analytics dashboard
   * Aggregates 14 KPIs from Feature Map Section 17
   * Returns null for metrics that cannot be computed from existing data
   */
  async getKPIStats(period: string = 'last_30_days'): Promise<EventKPIStats> {
    const not_tracked: string[] = [];

    // Define period filter
    const periodFilter = period === 'last_30_days'
      ? 'AND e.created_at > NOW() - INTERVAL 30 DAY'
      : period === 'last_90_days'
        ? 'AND e.created_at > NOW() - INTERVAL 90 DAY'
        : '';

    // Run all independent queries in parallel
    const [
      totalEventsRes,
      totalRsvpsRes,
      totalSharesRes,
      publishedWithViewsRes,
      rsvpToCheckInRes,
      eventsWithSharesRes,
      reviewsAndAttendeesRes,
      eventsPerBusinessRes,
      followersRes,
      exhibitorAcceptRes,
      communityEventsRes,
      ticketRevenueRes,
    ] = await Promise.all([
      // Total events
      this.db.query<{ val: bigint | number }>(
        `SELECT COUNT(*) as val FROM events e WHERE status = 'published' ${periodFilter}`
      ),
      // Total RSVPs
      this.db.query<{ val: bigint | number }>(
        `SELECT COUNT(*) as val FROM event_rsvps r
         INNER JOIN events e ON e.id = r.event_id
         WHERE r.rsvp_status IN ('confirmed', 'pending') ${periodFilter}`
      ),
      // Total shares
      this.db.query<{ val: bigint | number }>(
        `SELECT COUNT(*) as val FROM event_shares es
         INNER JOIN events e ON e.id = es.event_id
         WHERE 1=1 ${periodFilter}`
      ),
      // FM 17.1: Page views and RSVPs for conversion rate
      this.db.query<{ total_views: bigint | number; total_rsvps: bigint | number }>(
        `SELECT
           COALESCE(SUM(e.view_count), 0) as total_views,
           (SELECT COUNT(*) FROM event_rsvps r2
            INNER JOIN events e2 ON e2.id = r2.event_id
            WHERE r2.rsvp_status IN ('confirmed', 'pending') ${periodFilter.replace(/e\./g, 'e2.')}) as total_rsvps
         FROM events e
         WHERE e.status = 'published' ${periodFilter}`
      ),
      // FM 17.2: RSVP to attendance (check-in) rate
      this.db.query<{ total_rsvps: bigint | number; checked_in: bigint | number }>(
        `SELECT
           COUNT(*) as total_rsvps,
           SUM(CASE WHEN ci.id IS NOT NULL THEN 1 ELSE 0 END) as checked_in
         FROM event_rsvps r
         INNER JOIN events e ON e.id = r.event_id
         LEFT JOIN event_check_ins ci ON ci.rsvp_id = r.id
         WHERE r.rsvp_status = 'confirmed' ${periodFilter}`
      ),
      // FM 17.6: Events with at least 1 share / total published
      this.db.query<{ shared: bigint | number; total: bigint | number }>(
        `SELECT
           (SELECT COUNT(DISTINCT es.event_id) FROM event_shares es
            INNER JOIN events e2 ON e2.id = es.event_id
            WHERE e2.status = 'published' ${periodFilter.replace(/e\./g, 'e2.')}) as shared,
           COUNT(*) as total
         FROM events e
         WHERE e.status = 'published' ${periodFilter}`
      ),
      // FM 17.9: Post-event review rate (reviews / checked-in attendees)
      this.db.query<{ reviews: bigint | number; attendees: bigint | number }>(
        `SELECT
           (SELECT COUNT(*) FROM event_reviews rv
            INNER JOIN events e2 ON e2.id = rv.event_id
            WHERE 1=1 ${periodFilter.replace(/e\./g, 'e2.')}) as reviews,
           (SELECT COUNT(*) FROM event_check_ins ci
            INNER JOIN event_rsvps r ON r.id = ci.rsvp_id
            INNER JOIN events e3 ON e3.id = r.event_id
            WHERE 1=1 ${periodFilter.replace(/e\./g, 'e3.')}) as attendees`
      ),
      // FM 17.5: Average events per business (listing) in period
      this.db.query<{ avg_per_biz: number }>(
        `SELECT COALESCE(AVG(event_count), 0) as avg_per_biz FROM (
           SELECT listing_id, COUNT(*) as event_count
           FROM events e
           WHERE listing_id IS NOT NULL AND status = 'published' ${periodFilter}
           GROUP BY listing_id
         ) sub`
      ),
      // FM 17.8: Notification subscription rate (followers / active users)
      this.db.query<{ followers: bigint | number }>(
        `SELECT COUNT(DISTINCT user_id) as followers FROM event_follows`
      ),
      // FM 17.11: Exhibitor invite → accept rate
      this.db.query<{ total: bigint | number; accepted: bigint | number }>(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as accepted
         FROM event_exhibitors`
      ),
      // FM 17.12: Community events submitted in last 30 days
      this.db.query<{ val: bigint | number }>(
        `SELECT COUNT(*) as val FROM events
         WHERE is_community_event = 1
           AND created_at > NOW() - INTERVAL 30 DAY`
      ),
      // FM 17.13: Total ticket revenue
      this.db.query<{ val: number }>(
        `SELECT COALESCE(SUM(total_amount), 0) as val
         FROM event_ticket_purchases
         WHERE payment_status = 'completed'`
      ),
    ]);

    // Calculate rates
    const totalEvents = bigIntToNumber(totalEventsRes.rows[0]?.val ?? 0);
    const totalRsvps = bigIntToNumber(totalRsvpsRes.rows[0]?.val ?? 0);
    const totalShares = bigIntToNumber(totalSharesRes.rows[0]?.val ?? 0);

    // FM 17.1: Event → RSVP conversion rate
    const totalViews = bigIntToNumber(publishedWithViewsRes.rows[0]?.total_views ?? 0);
    const viewRsvps = bigIntToNumber(publishedWithViewsRes.rows[0]?.total_rsvps ?? 0);
    const eventToRsvpRate = totalViews > 0
      ? Math.round((viewRsvps / totalViews) * 1000) / 10
      : 0;

    // FM 17.2: RSVP → attendance rate
    const rsvpTotal = bigIntToNumber(rsvpToCheckInRes.rows[0]?.total_rsvps ?? 0);
    const checkedIn = bigIntToNumber(rsvpToCheckInRes.rows[0]?.checked_in ?? 0);
    const rsvpToAttendanceRate = rsvpTotal > 0
      ? Math.round((checkedIn / rsvpTotal) * 1000) / 10
      : 0;

    // FM 17.6: Post-publish share rate
    const sharedEvents = bigIntToNumber(eventsWithSharesRes.rows[0]?.shared ?? 0);
    const totalPublished = bigIntToNumber(eventsWithSharesRes.rows[0]?.total ?? 0);
    const postPublishShareRate = totalPublished > 0
      ? Math.round((sharedEvents / totalPublished) * 1000) / 10
      : 0;

    // FM 17.9: Post-event review rate
    const totalReviews = bigIntToNumber(reviewsAndAttendeesRes.rows[0]?.reviews ?? 0);
    const totalAttendees = bigIntToNumber(reviewsAndAttendeesRes.rows[0]?.attendees ?? 0);
    const postEventReviewRate = totalAttendees > 0
      ? Math.round((totalReviews / totalAttendees) * 1000) / 10
      : 0;

    // FM 17.5: Avg events per business
    const avgEventsPerBusiness = Math.round((eventsPerBusinessRes.rows[0]?.avg_per_biz ?? 0) * 10) / 10;

    // FM 17.11: Vendor acceptance rate
    const exhibitorTotal = bigIntToNumber(exhibitorAcceptRes.rows[0]?.total ?? 0);
    const exhibitorAccepted = bigIntToNumber(exhibitorAcceptRes.rows[0]?.accepted ?? 0);
    const vendorAcceptanceRate = exhibitorTotal > 0
      ? Math.round((exhibitorAccepted / exhibitorTotal) * 1000) / 10
      : 0;

    // Metrics we cannot compute from existing data
    not_tracked.push(
      'new_registrations_via_events',  // FM 17.3: requires registration source tracking
      'business_follow_rate',           // FM 17.4: requires linking event views to follows
      'social_to_rsvp_rate',            // FM 17.7: requires social referrer tracking
      'organizer_adoption_rate',        // FM 17.10: requires Premium tier usage tracking
      'cross_sell_conversion_rate'      // FM 17.14: requires linking attendance to offer claims
    );

    return {
      event_to_rsvp_rate: eventToRsvpRate,
      rsvp_to_attendance_rate: rsvpToAttendanceRate,
      new_registrations_via_events: null,
      business_follow_rate: null,
      avg_events_per_business: avgEventsPerBusiness,
      post_publish_share_rate: postPublishShareRate,
      social_to_rsvp_rate: null,
      notification_subscription_rate: bigIntToNumber(followersRes.rows[0]?.followers ?? 0),
      post_event_review_rate: postEventReviewRate,
      organizer_adoption_rate: null,
      vendor_acceptance_rate: vendorAcceptanceRate,
      community_submissions_per_month: bigIntToNumber(communityEventsRes.rows[0]?.val ?? 0),
      ticket_revenue_total: ticketRevenueRes.rows[0]?.val ?? 0,
      cross_sell_conversion_rate: null,
      total_events: totalEvents,
      total_rsvps: totalRsvps,
      total_shares: totalShares,
      period,
      not_tracked,
    };
  }
}
