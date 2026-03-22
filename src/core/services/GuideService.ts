/**
 * GuideService - Guide Content Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (ContentGuideRow, ContentGuideSectionRow)
 * - MariaDB patterns: ? placeholders, bigIntToNumber, JSON parse guard, TINYINT boolean
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase 1
 * @reference src/core/services/ContentService.ts - Exact patterns replicated
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type { DbResult } from '@core/types/db';
import type { ContentGuideRow, ContentGuideSectionRow, ContentGuideProgressRow } from '@core/types/db-rows';
import type {
  Guide,
  GuideSection,
  GuideFilters,
  GuideSortOption,
  CreateGuideInput,
  UpdateGuideInput,
  CreateGuideSectionInput,
  UpdateGuideSectionInput,
  GuideProgress
} from '@core/types/guide';
import { GuideStatus, GuideDifficultyLevel } from '@core/types/guide';

// ============================================================================
// Local Pagination Types (matches ContentService pattern)
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

export class GuideNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'GUIDE_NOT_FOUND',
      message: `Guide not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested guide was not found'
    });
  }
}

export class DuplicateGuideSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_GUIDE_SLUG',
      message: `Guide slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'A guide with this URL slug already exists'
    });
  }
}

export class GuideSectionNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'GUIDE_SECTION_NOT_FOUND',
      message: `Guide section not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested guide section was not found'
    });
  }
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface GuideAnalyticsSummary {
  totals: {
    views: number;
    completions: number;
    bookmarks: number;
    shares: number;
    usersStarted: number;
    usersCompleted: number;
    completionRate: number;
  };
  progressDistribution: Array<{ range: string; count: number }>;
  sectionCompletionRates: Array<{ sectionId: number; title: string; completionRate: number; completedCount: number }>;
}

// ============================================================================
// GuideService Implementation
// ============================================================================

export class GuideService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get guides with optional filters, pagination, and sorting
   */
  async getGuides(
    filters?: GuideFilters,
    pagination?: PaginationParams,
    sort?: GuideSortOption
  ): Promise<PaginatedResult<Guide>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT cg.* FROM content_guides cg';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.listing_id !== undefined) {
      conditions.push('cg.listing_id = ?');
      params.push(filters.listing_id);
    }

    if (filters?.status !== undefined) {
      conditions.push('cg.status = ?');
      params.push(filters.status);
    }

    if (filters?.category_id !== undefined) {
      conditions.push('cg.category_id = ?');
      params.push(filters.category_id);
    }

    if (filters?.is_featured !== undefined) {
      conditions.push('cg.is_featured = ?');
      params.push(filters.is_featured ? 1 : 0);
    }

    if (filters?.difficulty_level !== undefined) {
      conditions.push('cg.difficulty_level = ?');
      params.push(filters.difficulty_level);
    }

    if (filters?.searchQuery) {
      conditions.push('(cg.title LIKE ? OR cg.excerpt LIKE ? OR cg.overview LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (filters?.followedListingIds && filters.followedListingIds.length > 0) {
      const placeholders = filters.followedListingIds.map(() => '?').join(',');
      conditions.push(`cg.listing_id IN (${placeholders})`);
      params.push(...filters.followedListingIds);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_guides cg${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentGuideRow> = await this.db.query<ContentGuideRow>(sql, params);

    return {
      data: result.rows.map(row => this.mapRowToGuide(row)),
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
   * Get guide by slug — fetches guide + sections in 2 queries
   * Returns Guide with sections populated
   */
  async getGuideBySlug(slug: string): Promise<Guide | null> {
    const result: DbResult<ContentGuideRow> = await this.db.query<ContentGuideRow>(
      'SELECT * FROM content_guides WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    const guide = this.mapRowToGuide(row);

    // Fetch sections ordered by sort_order
    const sectionsResult: DbResult<ContentGuideSectionRow> = await this.db.query<ContentGuideSectionRow>(
      'SELECT * FROM content_guide_sections WHERE guide_id = ? ORDER BY sort_order ASC',
      [guide.id]
    );

    guide.sections = sectionsResult.rows.map(srow => this.mapRowToSection(srow));

    return guide;
  }

  /**
   * Get guide by ID
   */
  async getGuideById(id: number): Promise<Guide | null> {
    const result: DbResult<ContentGuideRow> = await this.db.query<ContentGuideRow>(
      'SELECT * FROM content_guides WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToGuide(row);
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new guide
   */
  async createGuide(data: CreateGuideInput): Promise<Guide> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.title);

    // Check for duplicate slug
    const existing = await this.getGuideBySlug(slug);
    if (existing) {
      throw new DuplicateGuideSlugError(slug);
    }

    // Insert guide
    const tagsJson = JSON.stringify(data.tags || []);
    const difficultyLevel = data.difficulty_level || GuideDifficultyLevel.BEGINNER;

    const result: DbResult<ContentGuideRow> = await this.db.query<ContentGuideRow>(
      `INSERT INTO content_guides
       (listing_id, title, slug, subtitle, excerpt, overview, prerequisites,
        featured_image, category_id, tags, difficulty_level, estimated_time,
        is_featured, status, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        data.listing_id,
        data.title,
        slug,
        data.subtitle || null,
        data.excerpt || null,
        data.overview || null,
        data.prerequisites || null,
        data.featured_image || null,
        data.category_id || null,
        tagsJson,
        difficultyLevel,
        data.estimated_time || null,
        data.is_featured ? 1 : 0,
        data.version || null
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create guide', new Error('No insert ID returned'));
    }

    const created = await this.getGuideById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create guide', new Error('Failed to retrieve created guide'));
    }

    return created;
  }

  /**
   * Update a guide
   */
  async updateGuide(id: number, data: UpdateGuideInput): Promise<Guide> {
    // Check guide exists
    const existing = await this.getGuideById(id);
    if (!existing) {
      throw new GuideNotFoundError(id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getGuideBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateGuideSlugError(data.slug);
      }
    }

    // Build dynamic SET columns
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

    if (data.subtitle !== undefined) {
      updates.push('subtitle = ?');
      params.push(data.subtitle);
    }

    if (data.excerpt !== undefined) {
      updates.push('excerpt = ?');
      params.push(data.excerpt);
    }

    if (data.overview !== undefined) {
      updates.push('overview = ?');
      params.push(data.overview);
    }

    if (data.prerequisites !== undefined) {
      updates.push('prerequisites = ?');
      params.push(data.prerequisites);
    }

    if (data.featured_image !== undefined) {
      updates.push('featured_image = ?');
      params.push(data.featured_image);
    }

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(data.category_id);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (data.difficulty_level !== undefined) {
      updates.push('difficulty_level = ?');
      params.push(data.difficulty_level);
    }

    if (data.estimated_time !== undefined) {
      updates.push('estimated_time = ?');
      params.push(data.estimated_time);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.version !== undefined) {
      updates.push('version = ?');
      params.push(data.version);
    }

    if (data.last_reviewed_at !== undefined) {
      updates.push('last_reviewed_at = ?');
      params.push(data.last_reviewed_at);
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
      `UPDATE content_guides SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getGuideById(id);
    if (!updated) {
      throw BizError.databaseError('update guide', new Error('Failed to retrieve updated guide'));
    }

    return updated;
  }

  /**
   * Delete a guide
   */
  async deleteGuide(id: number): Promise<void> {
    const guide = await this.getGuideById(id);
    if (!guide) {
      throw new GuideNotFoundError(id);
    }

    await this.db.query('DELETE FROM content_guides WHERE id = ?', [id]);
  }

  /**
   * Increment view count (fire-and-forget)
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_guides SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // SECTION OPERATIONS
  // ==========================================================================

  /**
   * Add a section to a guide
   * Auto-calculates sort_order as MAX(sort_order)+1 and section_number as MAX(section_number)+1
   */
  async addSection(guideId: number, data: CreateGuideSectionInput): Promise<GuideSection> {
    // Verify guide exists
    const guide = await this.getGuideById(guideId);
    if (!guide) {
      throw new GuideNotFoundError(guideId);
    }

    // Calculate next sort_order
    const sortResult: DbResult<{ max_sort: number | null }> = await this.db.query<{ max_sort: number | null }>(
      'SELECT MAX(sort_order) as max_sort FROM content_guide_sections WHERE guide_id = ?',
      [guideId]
    );
    const sortOrder = (sortResult.rows[0]?.max_sort ?? 0) + 1;

    // Calculate next section_number
    const numResult: DbResult<{ max_num: number | null }> = await this.db.query<{ max_num: number | null }>(
      'SELECT MAX(section_number) as max_num FROM content_guide_sections WHERE guide_id = ?',
      [guideId]
    );
    const sectionNumber = (numResult.rows[0]?.max_num ?? 0) + 1;

    const result: DbResult<ContentGuideSectionRow> = await this.db.query<ContentGuideSectionRow>(
      `INSERT INTO content_guide_sections
       (guide_id, section_number, title, slug, content, estimated_time, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        guideId,
        sectionNumber,
        data.title,
        data.slug || null,
        data.content || null,
        data.estimated_time || null,
        sortOrder
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('add guide section', new Error('No insert ID returned'));
    }

    const created = await this.getSectionById(result.insertId);
    if (!created) {
      throw BizError.databaseError('add guide section', new Error('Failed to retrieve created section'));
    }

    return created;
  }

  /**
   * Update a guide section
   */
  async updateSection(sectionId: number, data: UpdateGuideSectionInput): Promise<GuideSection> {
    // Verify section exists
    const existing = await this.getSectionById(sectionId);
    if (!existing) {
      throw new GuideSectionNotFoundError(sectionId);
    }

    // Build dynamic SET columns
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

    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }

    if (data.estimated_time !== undefined) {
      updates.push('estimated_time = ?');
      params.push(data.estimated_time);
    }

    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sort_order);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(sectionId);

    await this.db.query(
      `UPDATE content_guide_sections SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getSectionById(sectionId);
    if (!updated) {
      throw BizError.databaseError('update guide section', new Error('Failed to retrieve updated section'));
    }

    return updated;
  }

  /**
   * Delete a guide section
   * Does NOT reorder remaining sections
   */
  async deleteSection(sectionId: number): Promise<void> {
    const section = await this.getSectionById(sectionId);
    if (!section) {
      throw new GuideSectionNotFoundError(sectionId);
    }

    await this.db.query('DELETE FROM content_guide_sections WHERE id = ?', [sectionId]);
  }

  /**
   * Reorder sections for a guide
   * Updates sort_order for each section ID in the provided order
   */
  async reorderSections(guideId: number, sectionIds: number[]): Promise<void> {
    for (let i = 0; i < sectionIds.length; i++) {
      const sectionId = sectionIds[i];
      const sortOrder = i + 1;
      await this.db.query(
        'UPDATE content_guide_sections SET sort_order = ? WHERE id = ? AND guide_id = ?',
        [sortOrder, sectionId, guideId]
      );
    }
  }

  // ==========================================================================
  // PROGRESS TRACKING OPERATIONS
  // ==========================================================================

  /**
   * Get user's progress on a specific guide
   * Returns null if user has not started this guide
   */
  async getProgress(guideId: number, userId: number): Promise<GuideProgress | null> {
    const result: DbResult<ContentGuideProgressRow> = await this.db.query<ContentGuideProgressRow>(
      'SELECT * FROM content_guide_progress WHERE guide_id = ? AND user_id = ?',
      [guideId, userId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToProgress(row);
  }

  /**
   * Start or update progress — upserts using UNIQUE(user_id, guide_id)
   * Called when user first visits guide (start) or marks a section complete
   */
  async upsertProgress(
    guideId: number,
    userId: number,
    data: {
      section_id?: number | null;
      completed_sections?: number[];
      is_completed?: boolean;
    }
  ): Promise<GuideProgress> {
    const completedJson = data.completed_sections !== undefined
      ? JSON.stringify(data.completed_sections)
      : JSON.stringify([]);
    const isCompleted = data.is_completed ? 1 : 0;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await this.db.query(
      `INSERT INTO content_guide_progress
       (guide_id, user_id, section_id, completed_sections, is_completed, started_at, last_accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         section_id = COALESCE(VALUES(section_id), section_id),
         completed_sections = VALUES(completed_sections),
         is_completed = VALUES(is_completed),
         completed_at = IF(VALUES(is_completed) = 1 AND is_completed = 0, ?, NULL),
         last_accessed_at = ?`,
      [
        guideId, userId,
        data.section_id ?? null,
        completedJson,
        isCompleted,
        now, // started_at
        now, // last_accessed_at
        now, // completed_at (only set when transitioning to complete)
        now  // last_accessed_at update
      ]
    );

    const progress = await this.getProgress(guideId, userId);
    if (!progress) {
      throw BizError.databaseError('upsert progress', new Error('Failed to retrieve upserted progress'));
    }
    return progress;
  }

  /**
   * Mark a section as complete for a user
   * Adds section_id to completed_sections array; checks if all sections are done
   */
  async markSectionComplete(
    guideId: number,
    userId: number,
    sectionId: number
  ): Promise<GuideProgress> {
    // Get current progress or initialize
    const current = await this.getProgress(guideId, userId);
    const completedSections = current?.completed_sections || [];

    // Add section if not already completed
    if (!completedSections.includes(sectionId)) {
      completedSections.push(sectionId);
    }

    // Get total section count to determine if guide is complete
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query<{ total: bigint | number }>(
      'SELECT COUNT(*) as total FROM content_guide_sections WHERE guide_id = ?',
      [guideId]
    );
    const totalSections = bigIntToNumber(countResult.rows[0]?.total);
    const isComplete = completedSections.length >= totalSections && totalSections > 0;

    // If this completes the guide, increment completion_count (fire-and-forget)
    if (isComplete && !current?.is_completed) {
      this.db.query(
        'UPDATE content_guides SET completion_count = completion_count + 1 WHERE id = ?',
        [guideId]
      ).catch(() => { /* fire-and-forget */ });
    }

    return this.upsertProgress(guideId, userId, {
      section_id: sectionId,
      completed_sections: completedSections,
      is_completed: isComplete
    });
  }

  /**
   * Unmark a section (toggle off)
   */
  async unmarkSectionComplete(
    guideId: number,
    userId: number,
    sectionId: number
  ): Promise<GuideProgress> {
    const current = await this.getProgress(guideId, userId);
    const completedSections = (current?.completed_sections || []).filter(id => id !== sectionId);
    const wasComplete = current?.is_completed;

    // If guide was previously complete, decrement completion_count
    if (wasComplete) {
      this.db.query(
        'UPDATE content_guides SET completion_count = GREATEST(completion_count - 1, 0) WHERE id = ?',
        [guideId]
      ).catch(() => { /* fire-and-forget */ });
    }

    return this.upsertProgress(guideId, userId, {
      section_id: sectionId,
      completed_sections: completedSections,
      is_completed: false
    });
  }

  /**
   * Update last accessed section (for resume functionality)
   * Fire-and-forget — never blocks UI
   */
  async updateLastAccessed(guideId: number, userId: number, sectionId: number): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await this.db.query(
      `INSERT INTO content_guide_progress (guide_id, user_id, section_id, started_at, last_accessed_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         section_id = VALUES(section_id),
         last_accessed_at = VALUES(last_accessed_at)`,
      [guideId, userId, sectionId, now, now]
    );
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getGuideAnalytics(guideId: number): Promise<GuideAnalyticsSummary> {
    // Query 1: Guide counters
    const guideResult: DbResult<{
      view_count: number; completion_count: number;
      bookmark_count: number; share_count: number;
    }> = await this.db.query(
      'SELECT view_count, completion_count, bookmark_count, share_count FROM content_guides WHERE id = ?',
      [guideId]
    );

    // Query 2: Progress aggregates
    const progressStats: DbResult<{
      started: bigint | number; completed: bigint | number;
    }> = await this.db.query(
      `SELECT
         COUNT(*) as started,
         SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
       FROM content_guide_progress
       WHERE guide_id = ?`,
      [guideId]
    );

    // Query 3: Sections for this guide
    const sections: DbResult<{ id: number; title: string; section_number: number }> = await this.db.query(
      'SELECT id, title, section_number FROM content_guide_sections WHERE guide_id = ? ORDER BY sort_order ASC',
      [guideId]
    );

    const totalUsers = bigIntToNumber(progressStats.rows[0]?.started ?? 0);

    // Per-section completion rates
    const sectionRates: Array<{ sectionId: number; title: string; completionRate: number; completedCount: number }> = [];
    for (const section of sections.rows) {
      const completedResult: DbResult<{ count: bigint | number }> = await this.db.query(
        `SELECT COUNT(*) as count FROM content_guide_progress
         WHERE guide_id = ? AND JSON_CONTAINS(completed_sections, CAST(? AS JSON))`,
        [guideId, section.id]
      );
      const completedCount = bigIntToNumber(completedResult.rows[0]?.count ?? 0);
      sectionRates.push({
        sectionId: section.id,
        title: section.title,
        completionRate: totalUsers > 0 ? Math.round((completedCount / totalUsers) * 100) : 0,
        completedCount,
      });
    }

    // Query 4: Progress distribution
    const totalSections = sections.rows.length;
    const allProgress: DbResult<{ completed_sections: string | number[] | null; is_completed: number }> = await this.db.query(
      'SELECT completed_sections, is_completed FROM content_guide_progress WHERE guide_id = ?',
      [guideId]
    );

    const buckets = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0, 'Completed': 0 };
    for (const row of allProgress.rows) {
      if (row.is_completed) {
        buckets['Completed']++;
        continue;
      }
      const completedArr = safeJsonParse<number[]>(row.completed_sections as string | null) ?? [];
      const pct = totalSections > 0 ? (completedArr.length / totalSections) * 100 : 0;
      if (pct <= 25) buckets['0-25%']++;
      else if (pct <= 50) buckets['25-50%']++;
      else if (pct <= 75) buckets['50-75%']++;
      else buckets['75-100%']++;
    }

    const guideRow = guideResult.rows[0];
    const usersStarted = bigIntToNumber(progressStats.rows[0]?.started ?? 0);
    const usersCompleted = bigIntToNumber(progressStats.rows[0]?.completed ?? 0);

    return {
      totals: {
        views: guideRow?.view_count ?? 0,
        completions: guideRow?.completion_count ?? 0,
        bookmarks: guideRow?.bookmark_count ?? 0,
        shares: guideRow?.share_count ?? 0,
        usersStarted,
        usersCompleted,
        completionRate: usersStarted > 0 ? Math.round((usersCompleted / usersStarted) * 100) : 0,
      },
      progressDistribution: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      sectionCompletionRates: sectionRates,
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Get section by ID (internal helper)
   */
  private async getSectionById(id: number): Promise<GuideSection | null> {
    const result: DbResult<ContentGuideSectionRow> = await this.db.query<ContentGuideSectionRow>(
      'SELECT * FROM content_guide_sections WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToSection(row);
  }

  /**
   * Generate a unique slug from title
   */
  private async generateSlug(title: string): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure uniqueness
    let counter = 1;
    let uniqueSlug = slug;

    for (;;) {
      const existing = await this.getGuideBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      if (counter > 1000) {
        throw BizError.internalServerError(
          'GuideService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Build SQL sort clause from sort option
   */
  private buildSortClause(sort?: GuideSortOption): string {
    switch (sort) {
      case 'recent':
        return 'ORDER BY cg.published_at DESC, cg.created_at DESC';
      case 'popular':
        return 'ORDER BY cg.view_count DESC';
      case 'alphabetical':
        return 'ORDER BY cg.title ASC';
      case 'difficulty':
        return "ORDER BY FIELD(cg.difficulty_level, 'beginner', 'intermediate', 'advanced')";
      case 'estimated_time':
        return 'ORDER BY cg.estimated_time ASC';
      default:
        return 'ORDER BY cg.published_at DESC, cg.created_at DESC';
    }
  }

  /**
   * Map database row to Guide application entity
   * GOVERNANCE: mariadb auto-parses JSON columns - check if already array
   * GOVERNANCE: TINYINT(1) → boolean via !! operator
   */
  private mapRowToGuide(row: ContentGuideRow): Guide {
    return {
      id: row.id,
      listing_id: row.listing_id,
      title: row.title,
      slug: row.slug,
      subtitle: row.subtitle,
      excerpt: row.excerpt,
      overview: row.overview,
      prerequisites: row.prerequisites,
      featured_image: row.featured_image,
      category_id: row.category_id,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : [],
      difficulty_level: row.difficulty_level as GuideDifficultyLevel,
      estimated_time: row.estimated_time,
      word_count: row.word_count,
      status: row.status as GuideStatus,
      is_featured: !!row.is_featured,
      view_count: row.view_count,
      bookmark_count: row.bookmark_count,
      share_count: row.share_count,
      completion_count: row.completion_count,
      version: row.version,
      last_reviewed_at: row.last_reviewed_at ? new Date(row.last_reviewed_at) : null,
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  /**
   * Map database row to GuideSection application entity
   */
  private mapRowToSection(row: ContentGuideSectionRow): GuideSection {
    return {
      id: row.id,
      guide_id: row.guide_id,
      section_number: row.section_number,
      title: row.title,
      slug: row.slug,
      content: row.content,
      estimated_time: row.estimated_time,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  /**
   * Map database row to GuideProgress application entity
   * GOVERNANCE: mariadb may auto-parse JSON — check if already array
   * GOVERNANCE: TINYINT → boolean via !! operator
   */
  private mapRowToProgress(row: ContentGuideProgressRow): GuideProgress {
    return {
      id: row.id,
      guide_id: row.guide_id,
      user_id: row.user_id,
      section_id: row.section_id,
      completed_sections: row.completed_sections
        ? (Array.isArray(row.completed_sections) ? row.completed_sections : JSON.parse(row.completed_sections))
        : [],
      is_completed: !!row.is_completed,
      started_at: row.started_at ? new Date(row.started_at) : null,
      completed_at: row.completed_at ? new Date(row.completed_at) : null,
      last_accessed_at: row.last_accessed_at ? new Date(row.last_accessed_at) : null
    };
  }
}
