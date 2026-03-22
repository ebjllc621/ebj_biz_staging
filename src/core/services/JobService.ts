/**
 * JobService - Job Posting Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Tier enforcement at service layer
 * - Slug generation with uniqueness
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_1_BRAIN_PLAN.md
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ListingService, TierCheckResult } from '@core/services/ListingService';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';
import { DbResult } from '@core/types/db';
import {
  JobPostingRow,
  JobApplicationRow,
  JobAlertSubscriptionRow,
  JobPostingTemplateRow,
  JobHireReportRow,
  JobMediaRow
} from '@core/types/db-rows';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import {
  Job,
  JobWithCoordinates,
  CreateJobInput,
  UpdateJobInput,
  JobFilters,
  PaginationParams,
  PaginatedResult,
  EmploymentType,
  CompensationType,
  WorkLocationType,
  ApplicationMethod,
  JobStatus,
  // Phase 2 types
  JobApplication,
  SubmitApplicationInput,
  ApplicationFilters,
  ApplicationStatus,
  JobAlertSubscription,
  CreateAlertInput,
  UpdateAlertInput,
  JobPostingTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  // Phase 3 types
  JobAnalyticsFunnel,
  JobHireReport,
  ReportHireInput,
  RecurringSchedule,
  CustomQuestion,
  // Share analytics types
  SharePlatformData,
  RecordShareInput,
  SharePlatform,
  // Media types
  JobMedia,
  CreateJobMediaInput,
  UpdateJobMediaInput,
  JobMediaLimits,
  JobMediaLimitCheckResult
} from '@features/jobs/types';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class JobNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'JOB_NOT_FOUND',
      message: `Job not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested job was not found'
    });
  }
}

export class TierLimitExceededError extends BizError {
  constructor(tier: string, limit: number) {
    super({
      code: 'TIER_LIMIT_EXCEEDED',
      message: `Job limit exceeded for tier ${tier} (limit: ${limit})`,
      context: { tier, limit },
      userMessage: `You have reached the job limit for your ${tier} tier`
    });
  }
}

export class InvalidJobDatesError extends BizError {
  constructor(startDate?: Date, deadlineDate?: Date) {
    super({
      code: 'INVALID_JOB_DATES',
      message: `Invalid job dates: application deadline must be after start date`,
      context: { startDate, deadlineDate },
      userMessage: 'The application deadline must be after the job start date'
    });
  }
}

export class DuplicateSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_SLUG',
      message: `Job slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'A job with this URL slug already exists'
    });
  }
}

export class InvalidApplicationMethodError extends BizError {
  constructor(method: string, tier: string) {
    super({
      code: 'INVALID_APPLICATION_METHOD',
      message: `Application method ${method} not allowed for tier ${tier}`,
      context: { method, tier },
      userMessage: `Native application is not available for your tier. Please upgrade to use this feature.`
    });
  }
}

export class JobMediaLimitExceededError extends BizError {
  constructor(mediaType: 'image' | 'video', current: number, limit: number) {
    super({
      code: 'JOB_MEDIA_LIMIT_EXCEEDED',
      message: `Job ${mediaType} limit exceeded: ${current}/${limit}`,
      context: { mediaType, current, limit },
      userMessage: `You have reached the ${mediaType} limit for this job (${limit} max)`
    });
  }
}

export class JobMediaNotFoundError extends BizError {
  constructor(mediaId: number) {
    super({
      code: 'JOB_MEDIA_NOT_FOUND',
      message: `Job media not found: ${mediaId}`,
      context: { mediaId },
      userMessage: 'The requested media was not found'
    });
  }
}

// ============================================================================
// JobService Implementation
// ============================================================================

export class JobService {
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
   * Get all jobs with optional filters and pagination
   * Includes listing info (name, logo) via LEFT JOIN with listings table
   * @param filters Optional filters
   * @param pagination Optional pagination parameters
   * @returns Paginated result of jobs with listing info
   */
  async getAll(
    filters?: JobFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<JobWithCoordinates>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // SELECT job_postings with listing info (name, logo_url, coordinates, tier) via LEFT JOIN
    // Use COALESCE for lat/lng to fall back to listing coordinates when job has none
    // Note: Use resolved_latitude/longitude to avoid duplicate column names (jp.* already has latitude/longitude)
    let sql = `SELECT jp.*,
               l.name as listing_name,
               l.logo_url as listing_logo,
               l.slug as listing_slug,
               COALESCE(jp.latitude, l.latitude) as resolved_latitude,
               COALESCE(jp.longitude, l.longitude) as resolved_longitude,
               l.claimed as listing_claimed,
               l.tier as listing_tier
               FROM job_postings jp
               LEFT JOIN listings l ON jp.business_id = l.id`;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.listingId !== undefined) {
        conditions.push('jp.business_id = ?');
        params.push(filters.listingId);
      }

      if (filters.employmentType !== undefined) {
        conditions.push('jp.employment_type = ?');
        params.push(filters.employmentType);
      }

      if (filters.compensationType !== undefined) {
        conditions.push('jp.compensation_type = ?');
        params.push(filters.compensationType);
      }

      if (filters.workLocationType !== undefined) {
        conditions.push('jp.work_location_type = ?');
        params.push(filters.workLocationType);
      }

      if (filters.status !== undefined) {
        conditions.push('jp.status = ?');
        params.push(filters.status);
      }

      if (filters.isFeatured !== undefined) {
        conditions.push('jp.is_featured = ?');
        params.push(filters.isFeatured ? 1 : 0);
      }

      if (filters.isActive) {
        conditions.push('jp.status = ?');
        conditions.push('(jp.application_deadline IS NULL OR jp.application_deadline > NOW())');
        params.push('active');
      }

      if (filters.city) {
        conditions.push('jp.city = ?');
        params.push(filters.city);
      }

      if (filters.state) {
        conditions.push('jp.state = ?');
        params.push(filters.state);
      }

      if (filters.minCompensation !== undefined) {
        conditions.push('jp.compensation_min >= ?');
        params.push(filters.minCompensation);
      }

      if (filters.maxCompensation !== undefined) {
        conditions.push('jp.compensation_max <= ?');
        params.push(filters.maxCompensation);
      }

      if (filters.postedWithinDays) {
        conditions.push('jp.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        params.push(filters.postedWithinDays);
      }

      if (filters.isCommunityGig !== undefined) {
        conditions.push('jp.is_community_gig = ?');
        params.push(filters.isCommunityGig ? 1 : 0);
      }

      if (filters.creatorUserId) {
        conditions.push('jp.creator_user_id = ?');
        params.push(filters.creatorUserId);
      }

      if (filters.searchQuery) {
        conditions.push('(jp.title LIKE ? OR jp.description LIKE ?)');
        params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count (use jp alias for consistency)
    const countSql = `SELECT COUNT(*) as total FROM job_postings jp${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{total: bigint | number}> = await this.db.query<{total: bigint | number}>(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated data
    sql += ' ORDER BY jp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Extended row type includes listing info, coordinates (with fallback), and tier
    interface JobRowWithListing extends JobPostingRow {
      listing_name: string | null;
      listing_logo: string | null;
      listing_slug: string | null;
      listing_claimed: number | null;  // Boolean stored as 0/1
      listing_tier: string | null;
      resolved_latitude: number | null;  // COALESCE result from jp or listing
      resolved_longitude: number | null; // COALESCE result from jp or listing
    }

    const result: DbResult<JobRowWithListing> = await this.db.query<JobRowWithListing>(sql, params);

    return {
      data: result.rows.map(row => this.mapRowToJobWithListing(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get job by ID
   * @param id Job ID
   * @returns Job or null if not found
   */
  async getById(id: number): Promise<Job | null> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      'SELECT * FROM job_postings WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToJob(row);
  }

  /**
   * Get job by slug
   * @param slug Job slug
   * @returns Job or null if not found
   */
  async getBySlug(slug: string): Promise<JobWithCoordinates | null> {
    // JOIN with listings to get listing info, coordinates (with fallback), and tier
    interface JobRowWithListing extends JobPostingRow {
      listing_name: string | null;
      listing_logo: string | null;
      listing_slug: string | null;
      listing_claimed: number | null;
      listing_tier: string | null;
      resolved_latitude: number | null;
      resolved_longitude: number | null;
    }

    const result: DbResult<JobRowWithListing> = await this.db.query<JobRowWithListing>(
      `SELECT jp.*,
       l.name as listing_name,
       l.logo_url as listing_logo,
       l.slug as listing_slug,
       COALESCE(jp.latitude, l.latitude) as resolved_latitude,
       COALESCE(jp.longitude, l.longitude) as resolved_longitude,
       l.claimed as listing_claimed,
       l.tier as listing_tier
       FROM job_postings jp
       LEFT JOIN listings l ON jp.business_id = l.id
       WHERE jp.slug = ?`,
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToJobWithListing(row);
  }

  /**
   * Get all jobs for a listing
   * @param listingId Listing ID
   * @returns Array of jobs
   */
  async getByListingId(listingId: number): Promise<Job[]> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      'SELECT * FROM job_postings WHERE business_id = ? ORDER BY created_at DESC',
      [listingId]
    );

    return result.rows.map(this.mapRowToJob);
  }

  /**
   * Get active jobs (not expired, not filled)
   * @returns Array of active jobs
   */
  async getActive(): Promise<Job[]> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `SELECT * FROM job_postings
       WHERE status = 'active'
         AND (application_deadline IS NULL OR application_deadline > NOW())
       ORDER BY created_at DESC`
    );

    return result.rows.map(this.mapRowToJob);
  }

  /**
   * Get jobs expiring within specified days
   * @param days Number of days
   * @returns Array of expiring jobs
   */
  async getExpiring(days: number): Promise<Job[]> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `SELECT * FROM job_postings
       WHERE status = 'active'
         AND application_deadline > NOW()
         AND application_deadline <= DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY application_deadline ASC`,
      [days]
    );

    return result.rows.map(this.mapRowToJob);
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new job
   * @param listingId Listing ID
   * @param data Job data
   * @returns Created job
   */
  async create(listingId: number, data: CreateJobInput): Promise<Job> {
    // Validate listing exists
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Check tier limit
    const tierCheck = await this.checkJobLimit(listingId);
    if (!tierCheck.allowed) {
      throw new TierLimitExceededError(tierCheck.tier ?? 'unknown', tierCheck.limit);
    }

    // Validate application method against tier
    if (data.application_method === ApplicationMethod.NATIVE) {
      if (listing.tier === 'essentials' || listing.tier === 'plus') {
        throw new InvalidApplicationMethodError('native', listing.tier);
      }
    }

    // Validate dates
    const startDate = data.start_date ? new Date(data.start_date) : null;
    const deadlineDate = data.application_deadline ? new Date(data.application_deadline) : null;

    if (startDate && deadlineDate && startDate >= deadlineDate) {
      throw new InvalidJobDatesError(startDate, deadlineDate);
    }

    // Reject past start dates
    const now = new Date();
    if (startDate && startDate < now) {
      throw BizError.badRequest(
        'Start date cannot be in the past',
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

    // Validate external URL for external application method
    if (data.application_method === ApplicationMethod.EXTERNAL && !data.external_application_url) {
      throw BizError.badRequest(
        'External application URL is required for external application method',
        { application_method: data.application_method }
      );
    }

    // Insert job
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `INSERT INTO job_postings (
        business_id, creator_user_id, title, slug, employment_type,
        description, compensation_type, compensation_min, compensation_max, compensation_currency,
        work_location_type, address, city, state, zip_code,
        latitude, longitude, department, reports_to, number_of_openings,
        schedule_info, start_date, application_deadline,
        application_method, external_application_url,
        benefits, required_qualifications, preferred_qualifications,
        is_featured, status
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?
      )`,
      [
        listingId,
        listing.user_id, // creator_user_id from listing owner
        data.title,
        slug,
        data.employment_type,
        data.description,
        data.compensation_type,
        data.compensation_min || null,
        data.compensation_max || null,
        data.compensation_currency || 'USD',
        data.work_location_type,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.latitude || null,
        data.longitude || null,
        data.department || null,
        data.reports_to || null,
        data.number_of_openings || 1,
        data.schedule_info || null,
        startDate,
        deadlineDate,
        data.application_method,
        data.external_application_url || null,
        data.benefits ? JSON.stringify(data.benefits) : null,
        data.required_qualifications ? JSON.stringify(data.required_qualifications) : null,
        data.preferred_qualifications ? JSON.stringify(data.preferred_qualifications) : null,
        data.is_featured ? 1 : 0,
        'draft' // Default status
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create job',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create job',
        new Error('Failed to retrieve created job')
      );
    }

    return created;
  }

  /**
   * Update a job
   * @param id Job ID
   * @param data Update data
   * @returns Updated job
   */
  async update(id: number, data: UpdateJobInput): Promise<Job> {
    // Check job exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new JobNotFoundError(id);
    }

    // Validate dates if being updated
    if (data.start_date || data.application_deadline) {
      const startDate = data.start_date
        ? new Date(data.start_date)
        : existing.start_date;
      const deadlineDate = data.application_deadline
        ? new Date(data.application_deadline)
        : existing.application_deadline;

      if (startDate && deadlineDate && startDate >= deadlineDate) {
        throw new InvalidJobDatesError(startDate, deadlineDate);
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

    if (data.employment_type !== undefined) {
      updates.push('employment_type = ?');
      params.push(data.employment_type);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.compensation_type !== undefined) {
      updates.push('compensation_type = ?');
      params.push(data.compensation_type);
    }

    if (data.compensation_min !== undefined) {
      updates.push('compensation_min = ?');
      params.push(data.compensation_min);
    }

    if (data.compensation_max !== undefined) {
      updates.push('compensation_max = ?');
      params.push(data.compensation_max);
    }

    if (data.compensation_currency !== undefined) {
      updates.push('compensation_currency = ?');
      params.push(data.compensation_currency);
    }

    if (data.work_location_type !== undefined) {
      updates.push('work_location_type = ?');
      params.push(data.work_location_type);
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

    if (data.latitude !== undefined) {
      updates.push('latitude = ?');
      params.push(data.latitude);
    }

    if (data.longitude !== undefined) {
      updates.push('longitude = ?');
      params.push(data.longitude);
    }

    if (data.department !== undefined) {
      updates.push('department = ?');
      params.push(data.department);
    }

    if (data.reports_to !== undefined) {
      updates.push('reports_to = ?');
      params.push(data.reports_to);
    }

    if (data.number_of_openings !== undefined) {
      updates.push('number_of_openings = ?');
      params.push(data.number_of_openings);
    }

    if (data.schedule_info !== undefined) {
      updates.push('schedule_info = ?');
      params.push(data.schedule_info);
    }

    if (data.start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(data.start_date ? new Date(data.start_date) : null);
    }

    if (data.application_deadline !== undefined) {
      updates.push('application_deadline = ?');
      params.push(data.application_deadline ? new Date(data.application_deadline) : null);
    }

    if (data.application_method !== undefined) {
      updates.push('application_method = ?');
      params.push(data.application_method);
    }

    if (data.external_application_url !== undefined) {
      updates.push('external_application_url = ?');
      params.push(data.external_application_url);
    }

    if (data.benefits !== undefined) {
      updates.push('benefits = ?');
      params.push(data.benefits ? JSON.stringify(data.benefits) : null);
    }

    if (data.required_qualifications !== undefined) {
      updates.push('required_qualifications = ?');
      params.push(data.required_qualifications ? JSON.stringify(data.required_qualifications) : null);
    }

    if (data.preferred_qualifications !== undefined) {
      updates.push('preferred_qualifications = ?');
      params.push(data.preferred_qualifications ? JSON.stringify(data.preferred_qualifications) : null);
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
      `UPDATE job_postings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Notify on publish (status transition to active)
    if (data.status === 'active' && existing.status !== 'active') {
      try {
        const { JobNotificationService } = await import('@core/services/notification/JobNotificationService');
        const { getNotificationService } = await import('@core/services/ServiceRegistry');
        const notificationService = getNotificationService();
        const jobNotificationService = new JobNotificationService(this.db, notificationService);
        await jobNotificationService.notifyAlertMatch(id);
        if (existing.business_id) {
          await jobNotificationService.notifyJobPublished(id, existing.business_id);
        }
      } catch (notifError) {
        ErrorService.capture(notifError as Error, { context: 'job_publish_notifications', jobId: id });
      }
    }

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update job',
        new Error('Failed to retrieve updated job')
      );
    }

    return updated;
  }

  /**
   * Delete a job
   * @param id Job ID
   */
  async delete(id: number): Promise<void> {
    const job = await this.getById(id);
    if (!job) {
      throw new JobNotFoundError(id);
    }

    await this.db.query('DELETE FROM job_postings WHERE id = ?', [id]);
  }

  /**
   * Pause a job
   * @param id Job ID
   * @returns Updated job
   */
  async pause(id: number): Promise<Job> {
    return this.update(id, { status: JobStatus.PAUSED });
  }

  /**
   * Resume a paused job
   * @param id Job ID
   * @returns Updated job
   */
  async resume(id: number): Promise<Job> {
    const job = await this.getById(id);
    if (!job) {
      throw new JobNotFoundError(id);
    }

    // Check if expired
    if (job.application_deadline && new Date() > job.application_deadline) {
      throw BizError.badRequest(
        'Cannot resume expired job',
        { id, application_deadline: job.application_deadline }
      );
    }

    return this.update(id, { status: JobStatus.ACTIVE });
  }

  // ==========================================================================
  // TIER ENFORCEMENT Operations
  // ==========================================================================

  /**
   * Check if listing can add another job based on tier limits
   * @param listingId Listing ID
   * @returns Tier check result
   */
  async checkJobLimit(listingId: number): Promise<TierCheckResult> {
    const listing = await this.listingService.getById(listingId);
    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Tier limits: Essential=0, Plus=5/month, Preferred=25/month, Premium=unlimited
    const tierLimits = {
      essentials: 0,
      plus: 5,
      preferred: 25,
      premium: 9999
    };

    const limit = tierLimits[listing.tier];

    // Count jobs created this month for the listing
    const result: DbResult<{count: bigint | number}> = await this.db.query<{count: bigint | number}>(
      `SELECT COUNT(*) as count FROM job_postings
       WHERE business_id = ?
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
      [listingId]
    );
    const current = bigIntToNumber(result.rows[0]?.count);

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
   * @param title Job title
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
          'JobService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Increment job view count
   * @param id Job ID
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE job_postings SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Expire all expired jobs (cron job)
   * @returns Number of jobs expired
   */
  async expireExpiredJobs(): Promise<number> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `UPDATE job_postings
       SET status = 'expired'
       WHERE status = 'active'
         AND application_deadline IS NOT NULL
         AND application_deadline <= NOW()`
    );

    return result.rowCount || 0;
  }

  // ==========================================================================
  // PHASE 2: APPLICATION MANAGEMENT
  // ==========================================================================

  /**
   * Submit a job application
   * @param userId User ID of applicant
   * @param input Application data
   * @returns Created application
   */
  async submitApplication(userId: number, input: SubmitApplicationInput): Promise<JobApplication> {

    // Validate job exists and accepts native applications
    const job = await this.getById(input.job_id);
    if (!job) {
      throw new JobNotFoundError(input.job_id);
    }

    if (job.application_method !== 'native') {
      throw BizError.badRequest(
        'This job does not accept native applications',
        { job_id: input.job_id, application_method: job.application_method }
      );
    }

    // Check for duplicate application
    const existing = await this.hasUserApplied(userId, input.job_id);
    if (existing) {
      throw BizError.badRequest(
        'You have already applied to this job',
        { job_id: input.job_id }
      );
    }

    // Insert application
    const result = await this.db.query(
      `INSERT INTO job_applications (
        job_id, user_id, full_name, email, phone,
        resume_file_url, cover_message, availability,
        custom_answers, application_source, referred_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.job_id,
        userId,
        input.full_name,
        input.email,
        input.phone || null,
        input.resume_file_url || null,
        input.cover_message || null,
        input.availability || null,
        input.custom_answers ? JSON.stringify(input.custom_answers) : null,
        input.application_source || 'direct',
        input.referred_by_user_id || null
      ]
    );

    // Increment application count on job
    await this.db.query(
      'UPDATE job_postings SET application_count = application_count + 1 WHERE id = ?',
      [input.job_id]
    );

    // Return created application
    const application = await this.getApplicationById(result.insertId!);
    if (!application) {
      throw BizError.databaseError(
        'submit application',
        new Error('Failed to retrieve created application')
      );
    }

    // Notify employer of new application
    try {
      const { JobNotificationService } = await import('@core/services/notification/JobNotificationService');
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();
      const jobNotificationService = new JobNotificationService(this.db, notificationService);
      await jobNotificationService.notifyApplicationReceived(input.job_id, userId);
    } catch (notifError) {
      ErrorService.capture(notifError as Error, { context: 'job_application_notification', jobId: input.job_id });
    }

    return application;
  }

  /**
   * Get applications for a job
   * @param jobId Job ID
   * @param filters Optional filters
   * @returns Paginated applications
   */
  async getApplicationsByJobId(
    jobId: number,
    filters?: ApplicationFilters
  ): Promise<PaginatedResult<JobApplication>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM job_applications WHERE job_id = ?`;
    const params: unknown[] = [jobId];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    // Get total count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult: DbResult<{total: bigint | number}> = await this.db.query<{total: bigint | number}>(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated data
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.query(sql, params);
    const applications = result.rows.map(this.mapRowToApplication.bind(this));

    return {
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get application by ID
   * @param applicationId Application ID
   * @returns Application or null
   */
  async getApplicationById(applicationId: number): Promise<JobApplication | null> {
    const result = await this.db.query(
      'SELECT * FROM job_applications WHERE id = ?',
      [applicationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToApplication(result.rows[0]);
  }

  /**
   * Update application status
   * @param applicationId Application ID
   * @param status New status
   * @param notes Optional employer notes
   * @returns Updated application
   */
  async updateApplicationStatus(
    applicationId: number,
    status: ApplicationStatus,
    notes?: string
  ): Promise<JobApplication> {
    const updates: string[] = ['status = ?', 'status_changed_at = NOW()'];
    const params: unknown[] = [status];

    if (notes) {
      updates.push('employer_notes = ?');
      params.push(notes);
    }

    // Update contacted_at or interviewed_at timestamps
    if (status === 'contacted') {
      updates.push('contacted_at = NOW()');
    } else if (status === 'interviewed') {
      updates.push('interviewed_at = NOW()');
    }

    params.push(applicationId);

    await this.db.query(
      `UPDATE job_applications SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getApplicationById(applicationId);
    if (!updated) {
      throw BizError.databaseError(
        'update application status',
        new Error('Failed to retrieve updated application')
      );
    }

    // Notify applicant of status change (skip non-meaningful statuses)
    if (['contacted', 'interviewed', 'hired', 'declined'].includes(status)) {
      try {
        const { JobNotificationService } = await import('@core/services/notification/JobNotificationService');
        const { getNotificationService } = await import('@core/services/ServiceRegistry');
        const notificationService = getNotificationService();
        const jobNotificationService = new JobNotificationService(this.db, notificationService);
        await jobNotificationService.notifyApplicationStatusChanged(applicationId, status);
      } catch (notifError) {
        ErrorService.capture(notifError as Error, { context: 'application_status_notification', applicationId });
      }
    }

    return updated;
  }

  /**
   * Get user's applications
   * @param userId User ID
   * @param filters Optional filters
   * @returns Paginated applications
   */
  async getUserApplications(
    userId: number,
    filters?: ApplicationFilters
  ): Promise<PaginatedResult<JobApplication>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM job_applications WHERE user_id = ?`;
    const params: unknown[] = [userId];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    // Get total count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult: DbResult<{total: bigint | number}> = await this.db.query<{total: bigint | number}>(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated data
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.query(sql, params);
    const applications = result.rows.map(this.mapRowToApplication.bind(this));

    return {
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if user has applied to job
   * @param userId User ID
   * @param jobId Job ID
   * @returns True if user has applied
   */
  async hasUserApplied(userId: number, jobId: number): Promise<boolean> {
    const result: DbResult<{count: bigint | number}> = await this.db.query<{count: bigint | number}>(
      'SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND job_id = ?',
      [userId, jobId]
    );
    return bigIntToNumber(result.rows[0]?.count) > 0;
  }

  /**
   * Get application count for job
   * @param jobId Job ID
   * @returns Application count
   */
  async getApplicationCount(jobId: number): Promise<number> {
    const result: DbResult<{count: bigint | number}> = await this.db.query<{count: bigint | number}>(
      'SELECT COUNT(*) as count FROM job_applications WHERE job_id = ?',
      [jobId]
    );
    return bigIntToNumber(result.rows[0]?.count);
  }

  // ==========================================================================
  // PHASE 2: ALERT SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Create job alert subscription
   * @param userId User ID
   * @param input Alert data
   * @returns Created alert
   */
  async createAlert(
    userId: number,
    input: CreateAlertInput
  ): Promise<JobAlertSubscription> {
    const result = await this.db.query(
      `INSERT INTO job_alert_subscriptions (
        user_id, alert_type, target_id, keyword_filter,
        employment_type_filter, location_filter,
        compensation_min, compensation_max, notification_frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.alert_type,
        input.target_id || null,
        input.keyword_filter || null,
        input.employment_type_filter ? JSON.stringify(input.employment_type_filter) : null,
        input.location_filter ? JSON.stringify(input.location_filter) : null,
        input.compensation_min || null,
        input.compensation_max || null,
        input.notification_frequency || 'daily'
      ]
    );

    const alert = await this.getAlertById(result.insertId!);
    if (!alert) {
      throw BizError.databaseError(
        'create alert',
        new Error('Failed to retrieve created alert')
      );
    }

    return alert;
  }

  /**
   * Get alert by ID
   * @param alertId Alert ID
   * @returns Alert or null
   */
  async getAlertById(alertId: number): Promise<JobAlertSubscription | null> {
    const result = await this.db.query(
      'SELECT * FROM job_alert_subscriptions WHERE id = ?',
      [alertId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAlert(result.rows[0]);
  }

  /**
   * Get user's alert subscriptions
   * @param userId User ID
   * @returns Array of alerts
   */
  async getUserAlerts(userId: number): Promise<JobAlertSubscription[]> {
    const result = await this.db.query(
      'SELECT * FROM job_alert_subscriptions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(this.mapRowToAlert.bind(this));
  }

  /**
   * Update alert subscription
   * @param alertId Alert ID
   * @param input Update data
   * @returns Updated alert
   */
  async updateAlert(
    alertId: number,
    input: UpdateAlertInput
  ): Promise<JobAlertSubscription> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.keyword_filter !== undefined) {
      updates.push('keyword_filter = ?');
      params.push(input.keyword_filter);
    }

    if (input.employment_type_filter !== undefined) {
      updates.push('employment_type_filter = ?');
      params.push(input.employment_type_filter ? JSON.stringify(input.employment_type_filter) : null);
    }

    if (input.location_filter !== undefined) {
      updates.push('location_filter = ?');
      params.push(input.location_filter ? JSON.stringify(input.location_filter) : null);
    }

    if (input.compensation_min !== undefined) {
      updates.push('compensation_min = ?');
      params.push(input.compensation_min);
    }

    if (input.compensation_max !== undefined) {
      updates.push('compensation_max = ?');
      params.push(input.compensation_max);
    }

    if (input.notification_frequency !== undefined) {
      updates.push('notification_frequency = ?');
      params.push(input.notification_frequency);
    }

    if (input.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(input.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      const existing = await this.getAlertById(alertId);
      if (!existing) {
        throw BizError.notFound('Alert', alertId);
      }
      return existing;
    }

    params.push(alertId);

    await this.db.query(
      `UPDATE job_alert_subscriptions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getAlertById(alertId);
    if (!updated) {
      throw BizError.databaseError(
        'update alert',
        new Error('Failed to retrieve updated alert')
      );
    }

    return updated;
  }

  /**
   * Delete alert subscription
   * @param alertId Alert ID
   */
  async deleteAlert(alertId: number): Promise<void> {
    await this.db.query('DELETE FROM job_alert_subscriptions WHERE id = ?', [alertId]);
  }

  /**
   * Get matching jobs for alerts (for digest processing)
   * @returns Map of alert ID to matching jobs
   */
  async getMatchingJobsForAlerts(): Promise<Map<number, Job[]>> {
    // This would be implemented in a background job
    // Placeholder for Phase 2 completion
    return new Map();
  }

  // ==========================================================================
  // PHASE 2: JOB TEMPLATES
  // ==========================================================================

  /**
   * Get system templates
   * @returns Array of system templates
   */
  async getSystemTemplates(): Promise<JobPostingTemplate[]> {
    const result = await this.db.query(
      'SELECT * FROM job_posting_templates WHERE is_system_template = 1 ORDER BY template_category, template_name',
      []
    );

    return result.rows.map(this.mapRowToTemplate.bind(this));
  }

  /**
   * Get business templates
   * @param businessId Business ID
   * @returns Array of business templates
   */
  async getBusinessTemplates(businessId: number): Promise<JobPostingTemplate[]> {
    const result = await this.db.query(
      'SELECT * FROM job_posting_templates WHERE business_id = ? ORDER BY template_name',
      [businessId]
    );

    return result.rows.map(this.mapRowToTemplate.bind(this));
  }

  /**
   * Create template
   * @param input Template data
   * @returns Created template
   */
  async createTemplate(input: CreateTemplateInput): Promise<JobPostingTemplate> {
    const result = await this.db.query(
      `INSERT INTO job_posting_templates (
        template_name, template_category, employment_type,
        description_template, required_qualifications_template,
        preferred_qualifications_template, benefits_defaults,
        compensation_type, business_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.template_name,
        input.template_category,
        input.employment_type || null,
        input.description_template || null,
        input.required_qualifications_template ? JSON.stringify(input.required_qualifications_template) : null,
        input.preferred_qualifications_template ? JSON.stringify(input.preferred_qualifications_template) : null,
        input.benefits_defaults ? JSON.stringify(input.benefits_defaults) : null,
        input.compensation_type || null,
        input.business_id || null
      ]
    );

    const template = await this.getTemplateById(result.insertId!);
    if (!template) {
      throw BizError.databaseError(
        'create template',
        new Error('Failed to retrieve created template')
      );
    }

    return template;
  }

  /**
   * Get template by ID
   * @param templateId Template ID
   * @returns Template or null
   */
  async getTemplateById(templateId: number): Promise<JobPostingTemplate | null> {
    const result = await this.db.query(
      'SELECT * FROM job_posting_templates WHERE id = ?',
      [templateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTemplate(result.rows[0]);
  }

  /**
   * Update template
   * @param templateId Template ID
   * @param input Update data
   * @returns Updated template
   */
  async updateTemplate(
    templateId: number,
    input: UpdateTemplateInput
  ): Promise<JobPostingTemplate> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.template_name !== undefined) {
      updates.push('template_name = ?');
      params.push(input.template_name);
    }

    if (input.template_category !== undefined) {
      updates.push('template_category = ?');
      params.push(input.template_category);
    }

    if (input.employment_type !== undefined) {
      updates.push('employment_type = ?');
      params.push(input.employment_type);
    }

    if (input.description_template !== undefined) {
      updates.push('description_template = ?');
      params.push(input.description_template);
    }

    if (input.required_qualifications_template !== undefined) {
      updates.push('required_qualifications_template = ?');
      params.push(input.required_qualifications_template ? JSON.stringify(input.required_qualifications_template) : null);
    }

    if (input.preferred_qualifications_template !== undefined) {
      updates.push('preferred_qualifications_template = ?');
      params.push(input.preferred_qualifications_template ? JSON.stringify(input.preferred_qualifications_template) : null);
    }

    if (input.benefits_defaults !== undefined) {
      updates.push('benefits_defaults = ?');
      params.push(input.benefits_defaults ? JSON.stringify(input.benefits_defaults) : null);
    }

    if (input.compensation_type !== undefined) {
      updates.push('compensation_type = ?');
      params.push(input.compensation_type);
    }

    if (updates.length === 0) {
      const existing = await this.getTemplateById(templateId);
      if (!existing) {
        throw BizError.notFound('Template', templateId);
      }
      return existing;
    }

    params.push(templateId);

    await this.db.query(
      `UPDATE job_posting_templates SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getTemplateById(templateId);
    if (!updated) {
      throw BizError.databaseError(
        'update template',
        new Error('Failed to retrieve updated template')
      );
    }

    return updated;
  }

  /**
   * Delete template
   * @param templateId Template ID
   */
  async deleteTemplate(templateId: number): Promise<void> {
    await this.db.query('DELETE FROM job_posting_templates WHERE id = ?', [templateId]);
  }

  /**
   * Increment template usage count
   * @param templateId Template ID
   */
  async incrementTemplateUsage(templateId: number): Promise<void> {
    await this.db.query(
      'UPDATE job_posting_templates SET usage_count = usage_count + 1 WHERE id = ?',
      [templateId]
    );
  }

  // ==========================================================================
  // PHASE 2: FEATURED & MODERATION
  // ==========================================================================

  /**
   * Set featured status for job
   * @param jobId Job ID
   * @param featured Featured status
   * @param until Optional expiration date
   */
  async setFeatured(jobId: number, featured: boolean, until?: Date): Promise<void> {
    await this.db.query(
      'UPDATE job_postings SET is_featured = ?, featured_until = ? WHERE id = ?',
      [featured ? 1 : 0, until || null, jobId]
    );
  }

  /**
   * Get featured jobs
   * @returns Array of featured jobs
   */
  async getFeaturedJobs(): Promise<Job[]> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `SELECT * FROM job_postings
       WHERE is_featured = 1
         AND (featured_until IS NULL OR featured_until > NOW())
         AND status = 'active'
       ORDER BY created_at DESC`
    );

    return result.rows.map(this.mapRowToJob);
  }

  /**
   * Create a community gig submitted by any authenticated user
   * Sets is_community_gig = 1 and status = pending_moderation for admin review
   * @param userId ID of the user submitting the gig
   * @param data Gig data
   * @returns Created job
   */
  async createCommunityGig(
    userId: number,
    data: {
      title: string;
      description: string;
      employment_type: string;
      compensation_type: string;
      compensation_min?: number;
      compensation_max?: number;
      work_location_type: string;
      city?: string;
      state?: string;
      application_method: string;
      external_application_url?: string;
      application_deadline?: string;
      schedule_info?: string;
      contact_email?: string;
      contact_phone?: string;
    }
  ): Promise<Job> {
    const slug = await this.generateSlug(data.title);

    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `INSERT INTO job_postings (
        business_id, creator_user_id, title, slug, employment_type,
        description, compensation_type, compensation_min, compensation_max, compensation_currency,
        work_location_type, city, state,
        application_method, external_application_url, application_deadline, schedule_info,
        contact_email, contact_phone,
        is_community_gig, status, number_of_openings
      ) VALUES (
        NULL, ?, ?, ?, ?,
        ?, ?, ?, ?, 'USD',
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        1, 'pending_moderation', 1
      )`,
      [
        userId,
        data.title,
        slug,
        data.employment_type,
        data.description || '',
        data.compensation_type,
        data.compensation_min ?? null,
        data.compensation_max ?? null,
        data.work_location_type,
        data.city ?? null,
        data.state ?? null,
        data.application_method,
        data.external_application_url ?? null,
        data.application_deadline ?? null,
        data.schedule_info ?? null,
        data.contact_email ?? null,
        data.contact_phone ?? null,
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create community gig', new Error('No insert ID returned'));
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create community gig', new Error('Failed to retrieve created community gig'));
    }

    return created;
  }

  /**
   * Get community gigs pending moderation
   * @returns Array of jobs pending moderation
   */
  async getCommunityGigsPendingModeration(): Promise<Job[]> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `SELECT * FROM job_postings
       WHERE is_community_gig = 1
         AND status = 'pending_moderation'
       ORDER BY created_at ASC`
    );

    return result.rows.map(this.mapRowToJob);
  }

  /**
   * Approve community gig
   * @param jobId Job ID
   */
  async approveGig(jobId: number): Promise<void> {
    await this.db.query(
      'UPDATE job_postings SET status = ? WHERE id = ?',
      ['active', jobId]
    );
  }

  /**
   * Reject community gig
   * @param jobId Job ID
   * @param notes Rejection reason
   */
  async rejectGig(jobId: number, notes: string): Promise<void> {
    await this.db.query(
      'UPDATE job_postings SET status = ?, moderation_notes = ? WHERE id = ?',
      ['archived', notes, jobId]
    );
  }

  // ==========================================================================
  // AGENCY POSTING (Phase 6B)
  // ==========================================================================

  /**
   * Check if a listing can post jobs on behalf of another business
   * @param listingId The agency listing ID
   * @returns True if listing exists and is active
   */
  async canPostAsAgency(listingId: number): Promise<boolean> {
    const listing = await this.listingService.getById(listingId);
    return listing !== null && listing.status === 'active';
  }

  /**
   * Create a job posting on behalf of another business (agency posting)
   * @param agencyListingId The agency listing ID (who is posting)
   * @param targetBusinessId The target business ID (who the job is for)
   * @param data Job data
   * @returns Created job
   */
  async createAgencyPosting(
    agencyListingId: number,
    targetBusinessId: number,
    data: CreateJobInput
  ): Promise<Job> {
    // Verify target business exists
    const targetListing = await this.listingService.getById(targetBusinessId);
    if (!targetListing) {
      throw BizError.notFound('Target business', targetBusinessId);
    }

    // Create job normally via the agency listing
    const job = await this.create(agencyListingId, data);

    // Set the agency_posting_for_business_id
    await this.db.query(
      'UPDATE job_postings SET agency_posting_for_business_id = ? WHERE id = ?',
      [targetBusinessId, job.id]
    );

    return { ...job, agency_posting_for_business_id: targetBusinessId };
  }

  /**
   * Get jobs posted by agency for other businesses
   * @param agencyListingId The agency listing ID
   * @param filters Optional filters
   * @returns Array of agency-posted jobs
   */
  async getAgencyPostings(agencyListingId: number): Promise<Job[]> {
    const result: DbResult<JobPostingRow> = await this.db.query<JobPostingRow>(
      `SELECT * FROM job_postings
       WHERE business_id = ? AND agency_posting_for_business_id IS NOT NULL
       ORDER BY created_at DESC`,
      [agencyListingId]
    );

    return result.rows.map(row => this.mapRowToJob(row));
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to JobApplication interface
   */
  private mapRowToApplication(row: any): JobApplication {
    return {
      id: row.id,
      job_id: row.job_id,
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone || null,
      resume_file_url: row.resume_file_url || null,
      cover_message: row.cover_message || null,
      availability: row.availability || null,
      custom_answers: safeJsonParse(row.custom_answers, null),
      application_source: row.application_source,
      status: row.status,
      employer_notes: row.employer_notes || null,
      referred_by_user_id: row.referred_by_user_id || null,
      contacted_at: row.contacted_at ? new Date(row.contacted_at) : null,
      interviewed_at: row.interviewed_at ? new Date(row.interviewed_at) : null,
      status_changed_at: row.status_changed_at ? new Date(row.status_changed_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to JobAlertSubscription interface
   */
  private mapRowToAlert(row: any): JobAlertSubscription {
    return {
      id: row.id,
      user_id: row.user_id,
      alert_type: row.alert_type,
      target_id: row.target_id || null,
      keyword_filter: row.keyword_filter || null,
      employment_type_filter: safeJsonParse(row.employment_type_filter, null),
      location_filter: safeJsonParse(row.location_filter, null),
      compensation_min: row.compensation_min || null,
      compensation_max: row.compensation_max || null,
      notification_frequency: row.notification_frequency,
      is_active: Boolean(row.is_active),
      last_sent_at: row.last_sent_at ? new Date(row.last_sent_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to JobPostingTemplate interface
   */
  private mapRowToTemplate(row: any): JobPostingTemplate {
    return {
      id: row.id,
      template_name: row.template_name,
      template_category: row.template_category,
      employment_type: row.employment_type || null,
      description_template: row.description_template || null,
      required_qualifications_template: safeJsonParse(row.required_qualifications_template, null),
      preferred_qualifications_template: safeJsonParse(row.preferred_qualifications_template, null),
      benefits_defaults: safeJsonParse(row.benefits_defaults, null),
      compensation_type: row.compensation_type || null,
      is_system_template: Boolean(row.is_system_template),
      business_id: row.business_id || null,
      created_by_user_id: row.created_by_user_id || null,
      usage_count: row.usage_count || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to Job interface
   * @param row - Typed JobPostingRow from database
   * @returns Job - Application-level Job object
   */
  private mapRowToJob(row: JobPostingRow): Job {
    return {
      id: row.id,
      business_id: row.business_id,
      creator_user_id: row.creator_user_id,
      title: row.title,
      slug: row.slug,
      employment_type: row.employment_type as EmploymentType,
      description: row.description,
      compensation_type: row.compensation_type as CompensationType,
      compensation_min: row.compensation_min || null,
      compensation_max: row.compensation_max || null,
      compensation_currency: row.compensation_currency,
      work_location_type: row.work_location_type as WorkLocationType,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      zip_code: row.zip_code || null,
      // Convert decimal string coordinates to numbers (mariadb returns decimals as strings)
      latitude: row.latitude ? parseFloat(String(row.latitude)) : null,
      longitude: row.longitude ? parseFloat(String(row.longitude)) : null,
      department: row.department || null,
      reports_to: row.reports_to || null,
      number_of_openings: row.number_of_openings,
      schedule_info: row.schedule_info || null,
      start_date: row.start_date ? new Date(row.start_date) : null,
      application_deadline: row.application_deadline ? new Date(row.application_deadline) : null,
      application_method: row.application_method as ApplicationMethod,
      external_application_url: row.external_application_url || null,
      benefits: safeJsonParse<string[]>(row.benefits, []),
      required_qualifications: safeJsonParse<string[]>(row.required_qualifications, []),
      preferred_qualifications: safeJsonParse<string[]>(row.preferred_qualifications, []),
      custom_questions: row.custom_questions ? safeJsonParse<CustomQuestion[]>(row.custom_questions, []) : null,
      is_featured: Boolean(row.is_featured),
      is_community_gig: Boolean(row.is_community_gig),
      moderation_notes: row.moderation_notes ?? null,
      agency_posting_for_business_id: row.agency_posting_for_business_id ?? null,
      status: row.status as JobStatus,
      view_count: row.view_count || 0,
      application_count: row.application_count || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map database row (with listing info) to JobWithCoordinates interface
   * Used by getAll to include listing_name, listing_logo, and tier info for map markers
   * Note: resolved_latitude/longitude come from COALESCE with listing coordinates
   */
  private mapRowToJobWithListing(row: JobPostingRow & {
    listing_name: string | null;
    listing_logo: string | null;
    listing_slug: string | null;
    listing_claimed: number | null;
    listing_tier: string | null;
    resolved_latitude: number | null;
    resolved_longitude: number | null;
  }): JobWithCoordinates {
    const base = this.mapRowToJob(row);
    // Convert decimal string coordinates to actual numbers (mariadb returns decimals as strings)
    // Following events/search/route.ts pattern: parseFloat(String(row.latitude))
    const lat = row.resolved_latitude !== null ? parseFloat(String(row.resolved_latitude)) : null;
    const lng = row.resolved_longitude !== null ? parseFloat(String(row.resolved_longitude)) : null;
    return {
      ...base,
      // Override latitude/longitude with resolved values (COALESCE fallback to listing)
      latitude: lat !== null && !isNaN(lat) ? lat : null,
      longitude: lng !== null && !isNaN(lng) ? lng : null,
      listing_name: row.listing_name || undefined,
      listing_logo: row.listing_logo || undefined,
      listing_slug: row.listing_slug || undefined,
      listing_claimed: row.listing_claimed ? Boolean(row.listing_claimed) : false,
      listing_tier: (row.listing_tier as 'essentials' | 'plus' | 'preferred' | 'premium') || 'essentials'
    };
  }

  // ==========================================================================
  // PHASE 3: ANALYTICS FUNNEL & HIRE REPORTING
  // ==========================================================================

  /**
   * Get analytics funnel data for a job
   * @param jobId Job ID
   * @returns Funnel analytics
   */
  async getJobAnalyticsFunnel(jobId: number): Promise<JobAnalyticsFunnel> {
    const [impressions, pageViews, saves, applications, hires] = await Promise.all([
      this.db.query<{count: bigint}>('SELECT COUNT(*) as count FROM job_analytics WHERE job_id = ? AND event_type = ?', [jobId, 'impression']),
      this.db.query<{count: bigint}>('SELECT COUNT(*) as count FROM job_analytics WHERE job_id = ? AND event_type = ?', [jobId, 'page_view']),
      this.db.query<{count: bigint}>('SELECT COUNT(*) as count FROM user_saved_jobs WHERE job_id = ?', [jobId]),
      this.db.query<{count: bigint}>('SELECT COUNT(*) as count FROM job_applications WHERE job_id = ?', [jobId]),
      this.db.query<{count: bigint}>('SELECT COUNT(*) as count FROM job_hire_reports WHERE job_id = ?', [jobId])
    ]);

    const i = bigIntToNumber(impressions.rows[0]?.count);
    const pv = bigIntToNumber(pageViews.rows[0]?.count);
    const s = bigIntToNumber(saves.rows[0]?.count);
    const a = bigIntToNumber(applications.rows[0]?.count);
    const h = bigIntToNumber(hires.rows[0]?.count);

    return {
      job_id: jobId,
      impressions: i,
      page_views: pv,
      saves: s,
      applications: a,
      hires: h,
      conversion_rates: {
        view_rate: i > 0 ? (pv / i) * 100 : 0,
        save_rate: pv > 0 ? (s / pv) * 100 : 0,
        apply_rate: pv > 0 ? (a / pv) * 100 : 0,
        hire_rate: a > 0 ? (h / a) * 100 : 0
      }
    };
  }

  /**
   * Get share analytics by platform for a job
   * @param jobId Job ID
   * @returns Share breakdown by platform with click counts
   */
  async getSharesByPlatform(jobId: number): Promise<SharePlatformData[]> {
    const result = await this.db.query<{
      platform: string;
      share_count: bigint;
      total_clicks: bigint;
    }>(
      `SELECT
         platform,
         COUNT(*) as share_count,
         SUM(clicks) as total_clicks
       FROM job_shares
       WHERE job_id = ?
       GROUP BY platform
       ORDER BY share_count DESC`,
      [jobId]
    );

    return result.rows.map(row => ({
      platform: row.platform as SharePlatform,
      shares: bigIntToNumber(row.share_count),
      clicks: bigIntToNumber(row.total_clicks),
      clickRate: row.share_count > 0
        ? (bigIntToNumber(row.total_clicks) / bigIntToNumber(row.share_count)) * 100
        : 0
    }));
  }

  /**
   * Record a share to job_shares table
   * @param input Share recording input
   */
  async recordShare(input: RecordShareInput): Promise<void> {
    await this.db.query(
      `INSERT INTO job_shares (job_id, user_id, share_type, platform, share_url)
       VALUES (?, ?, ?, ?, ?)`,
      [input.job_id, input.user_id || null, input.share_type, input.platform, input.share_url]
    );
  }

  /**
   * Report a hire for analytics
   * @param userId User reporting the hire
   * @param input Hire report data
   * @returns Created hire report
   *
   * WORKFLOW ENHANCEMENT:
   * - Decrements number_of_openings by 1
   * - Auto-sets status to 'filled' when openings reach 0
   */
  async reportHire(userId: number, input: ReportHireInput): Promise<JobHireReport> {
    const job = await this.getById(input.job_id);
    if (!job) {
      throw new JobNotFoundError(input.job_id);
    }

    // Calculate time to fill
    const hireDate = new Date(input.hire_date);
    const postDate = new Date(job.created_at);
    const timeToFillDays = Math.ceil((hireDate.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));

    const result = await this.db.query(
      `INSERT INTO job_hire_reports (
        job_id, application_id, hire_source, hired_user_id,
        hire_date, time_to_fill_days, salary_or_rate, notes, reported_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.job_id,
        input.application_id || null,
        input.hire_source,
        input.hired_user_id || null,
        hireDate,
        timeToFillDays,
        input.salary_or_rate || null,
        input.notes || null,
        userId
      ]
    );

    // Decrement number_of_openings (minimum 0)
    const newOpenings = Math.max(0, job.number_of_openings - 1);

    // Auto-set status to 'filled' when all positions are filled
    if (newOpenings === 0 && job.status === 'active') {
      await this.db.query(
        'UPDATE job_postings SET number_of_openings = ?, status = ? WHERE id = ?',
        [newOpenings, 'filled', input.job_id]
      );
    } else {
      await this.db.query(
        'UPDATE job_postings SET number_of_openings = ? WHERE id = ?',
        [newOpenings, input.job_id]
      );
    }

    return this.getHireReportById(result.insertId!);
  }

  /**
   * Get hire report by ID
   */
  async getHireReportById(id: number): Promise<JobHireReport> {
    const result = await this.db.query<JobHireReportRow>(
      'SELECT * FROM job_hire_reports WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('HireReport', id);
    }

    return {
      id: row.id,
      job_id: row.job_id,
      application_id: row.application_id || null,
      hire_source: row.hire_source,
      hired_user_id: row.hired_user_id || null,
      hire_date: new Date(row.hire_date),
      time_to_fill_days: row.time_to_fill_days,
      salary_or_rate: row.salary_or_rate,
      notes: row.notes,
      reported_by_user_id: row.reported_by_user_id,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Get hire reports for a job
   */
  async getHiresByJob(jobId: number): Promise<JobHireReport[]> {
    const result = await this.db.query<JobHireReportRow>(
      'SELECT * FROM job_hire_reports WHERE job_id = ? ORDER BY hire_date DESC',
      [jobId]
    );

    return result.rows.map((row: JobHireReportRow) => ({
      id: row.id,
      job_id: row.job_id,
      application_id: row.application_id || null,
      hire_source: row.hire_source,
      hired_user_id: row.hired_user_id || null,
      hire_date: new Date(row.hire_date),
      time_to_fill_days: row.time_to_fill_days,
      salary_or_rate: row.salary_or_rate,
      notes: row.notes,
      reported_by_user_id: row.reported_by_user_id,
      created_at: new Date(row.created_at)
    }));
  }

  // ==========================================================================
  // PHASE 3: RECURRING REPOST
  // ==========================================================================

  /**
   * Enable recurring repost for a job
   */
  async enableRecurring(jobId: number, schedule: RecurringSchedule): Promise<void> {
    const nextRepostDate = this.calculateNextRepostDate(new Date(), schedule);

    await this.db.query(
      'UPDATE job_postings SET is_recurring = 1, recurring_schedule = ?, next_repost_date = ? WHERE id = ?',
      [schedule, nextRepostDate, jobId]
    );
  }

  /**
   * Disable recurring repost for a job
   */
  async disableRecurring(jobId: number): Promise<void> {
    await this.db.query(
      'UPDATE job_postings SET is_recurring = 0, recurring_schedule = NULL, next_repost_date = NULL WHERE id = ?',
      [jobId]
    );
  }

  /**
   * Calculate next repost date based on schedule
   */
  private calculateNextRepostDate(fromDate: Date, schedule: RecurringSchedule): Date {
    const date = new Date(fromDate);
    switch (schedule) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
    }
    return date;
  }

  // ==========================================================================
  // JOB MEDIA OPERATIONS
  // ==========================================================================

  /**
   * Get all media for a job, sorted by sort_order
   * @param jobId Job ID
   * @returns Array of job media
   */
  async getMedia(jobId: number): Promise<JobMedia[]> {
    const result: DbResult<JobMediaRow> = await this.db.query<JobMediaRow>(
      'SELECT * FROM job_media WHERE job_id = ? ORDER BY sort_order ASC',
      [jobId]
    );
    return result.rows.map(this.mapRowToMedia);
  }

  /**
   * Get single media item by ID
   * @param mediaId Media ID
   * @returns Job media or null
   */
  async getMediaById(mediaId: number): Promise<JobMedia | null> {
    const result: DbResult<JobMediaRow> = await this.db.query<JobMediaRow>(
      'SELECT * FROM job_media WHERE id = ?',
      [mediaId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToMedia(row);
  }

  /**
   * Add media to a job
   * @param jobId Job ID
   * @param input Media input data
   * @returns Created media
   */
  async addMedia(jobId: number, input: CreateJobMediaInput): Promise<JobMedia> {
    // Verify job exists
    const job = await this.getById(jobId);
    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    // Check tier limits
    const tierCheck = await this.checkMediaLimit(jobId, input.media_type);
    if (!tierCheck.allowed) {
      throw new JobMediaLimitExceededError(input.media_type, tierCheck.current, tierCheck.limit);
    }

    // Get next sort_order
    const countResult = await this.db.query<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM job_media WHERE job_id = ?',
      [jobId]
    );
    const nextOrder = (countResult.rows[0]?.max_order ?? -1) + 1;

    const result = await this.db.query(
      `INSERT INTO job_media (job_id, media_type, file_url, sort_order, alt_text, embed_url, platform, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, input.media_type, input.file_url, input.sort_order ?? nextOrder, input.alt_text || null, input.embed_url || null, input.platform || null, input.source || null]
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
  async updateMedia(mediaId: number, input: UpdateJobMediaInput): Promise<JobMedia> {
    const existing = await this.getMediaById(mediaId);
    if (!existing) {
      throw new JobMediaNotFoundError(mediaId);
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
    await this.db.query(`UPDATE job_media SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await this.getMediaById(mediaId);
    if (!updated) {
      throw new JobMediaNotFoundError(mediaId);
    }
    return updated;
  }

  /**
   * Delete media from a job
   * @param mediaId Media ID
   */
  async deleteMedia(mediaId: number): Promise<void> {
    const existing = await this.getMediaById(mediaId);
    if (!existing) {
      throw new JobMediaNotFoundError(mediaId);
    }
    await this.db.query('DELETE FROM job_media WHERE id = ?', [mediaId]);
  }

  /**
   * Reorder media items
   * @param jobId Job ID
   * @param mediaIds Array of media IDs in desired order
   */
  async reorderMedia(jobId: number, mediaIds: number[]): Promise<void> {
    // Verify job exists
    const job = await this.getById(jobId);
    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    // Update sort_order for each media item
    for (let i = 0; i < mediaIds.length; i++) {
      await this.db.query(
        'UPDATE job_media SET sort_order = ? WHERE id = ? AND job_id = ?',
        [i, mediaIds[i], jobId]
      );
    }
  }

  /**
   * Check if job can add more media based on tier limits
   * @param jobId Job ID
   * @param mediaType image or video
   */
  async checkMediaLimit(jobId: number, mediaType: 'image' | 'video'): Promise<JobMediaLimitCheckResult> {
    const job = await this.getById(jobId);
    if (!job || !job.business_id) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }

    const listing = await this.listingService.getById(job.business_id);
    if (!listing) {
      return { allowed: false, current: 0, limit: 0, unlimited: false, tier: 'essentials' };
    }

    // Tier limits for job media
    // Premium tier is intentionally unlimited (-1) for Jobs because job postings
    // benefit from extensive media (workplace photos, team videos, facility tours).
    // This differs from Events (capped at 6 images / 3 videos) and Offers (capped
    // at 6 images / 3 videos) where media needs are more bounded.
    // See EventService TIER_IMAGE_LIMITS and OfferService OFFER_TIER_IMAGE_LIMITS.
    const tierLimits: Record<string, { images: number; videos: number }> = {
      essentials: { images: 0, videos: 0 },
      plus: { images: 2, videos: 1 },
      preferred: { images: 10, videos: 5 },
      premium: { images: -1, videos: -1 } // unlimited
    };

    const defaultLimits = { images: 0, videos: 0 };
    const limits = tierLimits[listing.tier] ?? defaultLimits;
    const limit = mediaType === 'image' ? limits.images : limits.videos;

    // Count current media of this type
    const countResult = await this.db.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM job_media WHERE job_id = ? AND media_type = ?',
      [jobId, mediaType]
    );
    const current = bigIntToNumber(countResult.rows[0]?.count);

    // -1 means unlimited
    const unlimited = limit === -1;
    const allowed = unlimited || current < limit;

    return { allowed, current, limit, unlimited, tier: listing.tier };
  }

  /**
   * Get media limits for a job (for UI display)
   * @param jobId Job ID
   * @returns Current and limit counts for images and videos
   */
  async getMediaLimits(jobId: number): Promise<JobMediaLimits> {
    const imageCheck = await this.checkMediaLimit(jobId, 'image');
    const videoCheck = await this.checkMediaLimit(jobId, 'video');

    return {
      images: {
        current: imageCheck.current,
        limit: imageCheck.limit,
        unlimited: imageCheck.unlimited
      },
      videos: {
        current: videoCheck.current,
        limit: videoCheck.limit,
        unlimited: videoCheck.unlimited
      }
    };
  }

  /**
   * Get admin stats for the admin jobs page stats panel
   * Returns counts by status, employment type, work location type, and featured
   */
  async getAdminStats(): Promise<{
    total: number;
    active: number;
    draft: number;
    paused: number;
    filled: number;
    expired: number;
    featured: number;
    byEmploymentType: {
      full_time: number;
      part_time: number;
      contract: number;
      temporary: number;
      internship: number;
    };
    byWorkLocation: {
      on_site: number;
      remote: number;
      hybrid: number;
    };
  }> {
    const result = await this.db.query<{
      total: bigint;
      active: bigint;
      draft: bigint;
      paused: bigint;
      filled: bigint;
      expired: bigint;
      featured: bigint;
      et_full_time: bigint;
      et_part_time: bigint;
      et_contract: bigint;
      et_temporary: bigint;
      et_internship: bigint;
      wl_on_site: bigint;
      wl_remote: bigint;
      wl_hybrid: bigint;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
        SUM(CASE WHEN employment_type = 'full_time' THEN 1 ELSE 0 END) as et_full_time,
        SUM(CASE WHEN employment_type = 'part_time' THEN 1 ELSE 0 END) as et_part_time,
        SUM(CASE WHEN employment_type = 'contract' THEN 1 ELSE 0 END) as et_contract,
        SUM(CASE WHEN employment_type = 'temporary' THEN 1 ELSE 0 END) as et_temporary,
        SUM(CASE WHEN employment_type = 'internship' THEN 1 ELSE 0 END) as et_internship,
        SUM(CASE WHEN work_location_type = 'onsite' THEN 1 ELSE 0 END) as wl_on_site,
        SUM(CASE WHEN work_location_type = 'remote' THEN 1 ELSE 0 END) as wl_remote,
        SUM(CASE WHEN work_location_type = 'hybrid' THEN 1 ELSE 0 END) as wl_hybrid
      FROM job_postings`,
      []
    );

    const row = result.rows[0];
    return {
      total: bigIntToNumber(row?.total),
      active: bigIntToNumber(row?.active),
      draft: bigIntToNumber(row?.draft),
      paused: bigIntToNumber(row?.paused),
      filled: bigIntToNumber(row?.filled),
      expired: bigIntToNumber(row?.expired),
      featured: bigIntToNumber(row?.featured),
      byEmploymentType: {
        full_time: bigIntToNumber(row?.et_full_time),
        part_time: bigIntToNumber(row?.et_part_time),
        contract: bigIntToNumber(row?.et_contract),
        temporary: bigIntToNumber(row?.et_temporary),
        internship: bigIntToNumber(row?.et_internship),
      },
      byWorkLocation: {
        on_site: bigIntToNumber(row?.wl_on_site),
        remote: bigIntToNumber(row?.wl_remote),
        hybrid: bigIntToNumber(row?.wl_hybrid),
      },
    };
  }

  /**
   * Get platform-wide KPI stats for admin analytics dashboard
   * Aggregates 14 KPIs from Feature Map Section 18
   */
  async getKPIStats(): Promise<{
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    total_hires: number;
    avg_applications_per_job: number | null;
    avg_time_to_fill_days: number | null;
    view_to_apply_rate: number | null;
    total_impressions: number;
    total_page_views: number;
    total_shares: number;
    share_to_click_rate: number | null;
    community_gig_count: number;
    featured_jobs: number;
    alert_subscribers: number;
    not_tracked: string[];
  }> {
    const [jobCounts, appCount, hireStats, analytics, shareStats, communityCount, featuredCount, alertCount] = await Promise.all([
      // Job posting counts
      this.db.query<{ total: bigint; active: bigint }>(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM job_postings`,
        []
      ),
      // Total applications
      this.db.query<{ count: bigint }>(
        'SELECT COUNT(*) as count FROM job_applications',
        []
      ),
      // Hire stats
      this.db.query<{ count: bigint; avg_ttf: number | null }>(
        'SELECT COUNT(*) as count, AVG(time_to_fill_days) as avg_ttf FROM job_hire_reports',
        []
      ),
      // Analytics counts
      this.db.query<{ event_type: string; count: bigint }>(
        `SELECT event_type, COUNT(*) as count FROM job_analytics WHERE event_type IN ('impression', 'page_view', 'apply_click') GROUP BY event_type`,
        []
      ),
      // Share stats
      this.db.query<{ total_shares: bigint; total_clicks: bigint }>(
        'SELECT COUNT(*) as total_shares, COALESCE(SUM(clicks), 0) as total_clicks FROM job_shares',
        []
      ),
      // Community gig count
      this.db.query<{ count: bigint }>(
        'SELECT COUNT(*) as count FROM job_postings WHERE is_community_gig = 1',
        []
      ),
      // Featured count
      this.db.query<{ count: bigint }>(
        'SELECT COUNT(*) as count FROM job_postings WHERE is_featured = 1',
        []
      ),
      // Alert subscribers
      this.db.query<{ count: bigint }>(
        'SELECT COUNT(*) as count FROM job_alert_subscriptions',
        []
      ),
    ]);

    const totalJobs = bigIntToNumber(jobCounts.rows[0]?.total);
    const activeJobs = bigIntToNumber(jobCounts.rows[0]?.active);
    const totalApps = bigIntToNumber(appCount.rows[0]?.count);
    const totalHires = bigIntToNumber(hireStats.rows[0]?.count);
    const avgTtf = hireStats.rows[0]?.avg_ttf ?? null;

    // Analytics map
    const analyticsMap: Record<string, number> = {};
    for (const row of analytics.rows) {
      analyticsMap[row.event_type] = bigIntToNumber(row.count);
    }
    const impressions = analyticsMap['impression'] ?? 0;
    const pageViews = analyticsMap['page_view'] ?? 0;
    const applyClicks = analyticsMap['apply_click'] ?? 0;

    const totalShares = bigIntToNumber(shareStats.rows[0]?.total_shares);
    const totalClicks = bigIntToNumber(shareStats.rows[0]?.total_clicks);

    return {
      total_jobs: totalJobs,
      active_jobs: activeJobs,
      total_applications: totalApps,
      total_hires: totalHires,
      avg_applications_per_job: activeJobs > 0 ? Math.round((totalApps / activeJobs) * 10) / 10 : null,
      avg_time_to_fill_days: avgTtf !== null ? Math.round(avgTtf * 10) / 10 : null,
      view_to_apply_rate: pageViews > 0 ? Math.round((applyClicks / pageViews) * 1000) / 10 : null,
      total_impressions: impressions,
      total_page_views: pageViews,
      total_shares: totalShares,
      share_to_click_rate: totalShares > 0 ? Math.round((totalClicks / totalShares) * 1000) / 10 : null,
      community_gig_count: bigIntToNumber(communityCount.rows[0]?.count),
      featured_jobs: bigIntToNumber(featuredCount.rows[0]?.count),
      alert_subscribers: bigIntToNumber(alertCount.rows[0]?.count),
      not_tracked: [],
    };
  }

  /**
   * Map database row to JobMedia object
   */
  private mapRowToMedia(row: JobMediaRow): JobMedia {
    return {
      id: row.id,
      job_id: row.job_id,
      media_type: row.media_type,
      file_url: row.file_url,
      sort_order: row.sort_order,
      alt_text: row.alt_text,
      embed_url: row.embed_url ?? null,
      platform: row.platform ?? null,
      source: row.source ?? null,
      created_at: new Date(row.created_at)
    };
  }
}
