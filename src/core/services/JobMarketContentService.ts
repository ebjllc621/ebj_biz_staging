/**
 * JobMarketContentService - Job Market Content Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/core/services/ContentService.ts - Content pattern
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import type { JobMarketContentRow } from '@core/types/db-rows';
import type {
  JobMarketContent,
  CreateJobMarketContentInput,
  UpdateJobMarketContentInput,
  ContentFilters,
  PaginatedResult
} from '@features/jobs/types';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class JobMarketContentService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // CONTENT RETRIEVAL
  // ==========================================================================

  /**
   * Get content by ID
   */
  async getContentById(contentId: number): Promise<JobMarketContent | null> {
    const query = `
      SELECT *
      FROM job_market_content
      WHERE id = ?
      LIMIT 1
    `;

    const result: DbResult<JobMarketContentRow> = await this.db.query(query, [contentId]);
    const row = result.rows[0];

    return row ? this.mapRowToContent(row) : null;
  }

  /**
   * Get content by slug
   */
  async getContentBySlug(slug: string): Promise<JobMarketContent | null> {
    const query = `
      SELECT *
      FROM job_market_content
      WHERE slug = ?
        AND status = 'published'
      LIMIT 1
    `;

    const result: DbResult<JobMarketContentRow> = await this.db.query(query, [slug]);
    const row = result.rows[0];

    if (row) {
      // Increment view count
      await this.incrementViewCount(row.id);
      return this.mapRowToContent(row);
    }

    return null;
  }

  /**
   * Get all content with filters and pagination
   */
  async getContent(
    filters?: ContentFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<JobMarketContent>> {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (filters?.content_type) {
      conditions.push('content_type = ?');
      params.push(filters.content_type);
    }

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    } else {
      // Default to published only if no status filter
      conditions.push('status = ?');
      params.push('published');
    }

    if (filters?.region) {
      conditions.push('JSON_SEARCH(regions, "one", ?) IS NOT NULL');
      params.push(filters.region);
    }

    if (filters?.job_category) {
      conditions.push('JSON_CONTAINS(job_categories, CAST(? AS JSON))');
      params.push(JSON.stringify(filters.job_category));
    }

    if (filters?.is_featured !== undefined) {
      conditions.push('is_featured = ?');
      params.push(filters.is_featured ? 1 : 0);
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM job_market_content
      WHERE ${conditions.join(' AND ')}
    `;

    const countResult: DbResult<{ total: bigint }> = await this.db.query(countQuery, params);
    const total = bigIntToNumber(countResult.rows[0]?.total || 0n);

    // Get content
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT *
      FROM job_market_content
      WHERE ${conditions.join(' AND ')}
      ORDER BY is_featured DESC, published_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    const result: DbResult<JobMarketContentRow> = await this.db.query(query, params);
    const content = result.rows.map(row => this.mapRowToContent(row));

    return {
      data: content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get featured content
   */
  async getFeaturedContent(limit: number = 5): Promise<JobMarketContent[]> {
    const query = `
      SELECT *
      FROM job_market_content
      WHERE status = 'published'
        AND is_featured = 1
      ORDER BY published_date DESC
      LIMIT ?
    `;

    const result: DbResult<JobMarketContentRow> = await this.db.query(query, [limit]);
    return result.rows.map(row => this.mapRowToContent(row));
  }

  /**
   * Get trending content (by views)
   */
  async getTrendingContent(limit: number = 10): Promise<JobMarketContent[]> {
    const query = `
      SELECT *
      FROM job_market_content
      WHERE status = 'published'
        AND published_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY view_count DESC
      LIMIT ?
    `;

    const result: DbResult<JobMarketContentRow> = await this.db.query(query, [limit]);
    return result.rows.map(row => this.mapRowToContent(row));
  }

  /**
   * Get related content
   */
  async getRelatedContent(contentId: number, limit: number = 5): Promise<JobMarketContent[]> {
    // Get the current content to find related by type and categories
    const current = await this.getContentById(contentId);
    if (!current) {
      return [];
    }

    const conditions: string[] = ['id != ?', 'status = ?'];
    const params: unknown[] = [contentId, 'published'];

    // Same content type
    conditions.push('content_type = ?');
    params.push(current.content_type);

    // If has categories, match on categories
    if (current.job_categories && current.job_categories.length > 0) {
      conditions.push('JSON_OVERLAPS(job_categories, CAST(? AS JSON))');
      params.push(JSON.stringify(current.job_categories));
    }

    params.push(limit);

    const query = `
      SELECT *
      FROM job_market_content
      WHERE ${conditions.join(' AND ')}
      ORDER BY published_date DESC
      LIMIT ?
    `;

    const result: DbResult<JobMarketContentRow> = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToContent(row));
  }

  // ==========================================================================
  // CONTENT MUTATIONS
  // ==========================================================================

  /**
   * Create content
   */
  async createContent(input: CreateJobMarketContentInput, authorId?: number): Promise<JobMarketContent> {
    // Generate slug if not provided
    const slug = input.slug || this.generateSlug(input.title);

    // Check slug uniqueness
    const existingQuery = 'SELECT id FROM job_market_content WHERE slug = ? LIMIT 1';
    const existingResult: DbResult<{ id: number }> = await this.db.query(existingQuery, [slug]);
    if (existingResult.rows.length > 0) {
      throw new BizError({
        code: 'SLUG_ALREADY_EXISTS',
        message: 'Content with this slug already exists',
      });
    }

    const query = `
      INSERT INTO job_market_content (
        content_type, title, slug, summary, content, data_json,
        cover_image_url, regions, job_categories, published_date,
        status, author_user_id, is_featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `;

    const params = [
      input.content_type,
      input.title,
      slug,
      input.summary || null,
      input.content,
      input.data_json ? JSON.stringify(input.data_json) : null,
      input.cover_image_url || null,
      input.regions ? JSON.stringify(input.regions) : null,
      input.job_categories ? JSON.stringify(input.job_categories) : null,
      input.published_date || null,
      authorId || null,
      input.is_featured ? 1 : 0
    ];

    const result = await this.db.query(query, params);
    const insertId = bigIntToNumber(result.insertId);

    const content = await this.getContentById(insertId);
    if (!content) {
      throw new BizError({
        code: 'CONTENT_CREATION_FAILED',
        message: 'Failed to retrieve created content'
      });
    }

    return content;
  }

  /**
   * Update content
   */
  async updateContent(contentId: number, input: UpdateJobMarketContentInput): Promise<JobMarketContent> {
    const content = await this.getContentById(contentId);
    if (!content) {
      throw new BizError({
        code: 'CONTENT_NOT_FOUND',
        message: 'Job market content not found',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.content_type !== undefined) {
      updates.push('content_type = ?');
      params.push(input.content_type);
    }

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }

    if (input.slug !== undefined) {
      // Check slug uniqueness
      const existingQuery = 'SELECT id FROM job_market_content WHERE slug = ? AND id != ? LIMIT 1';
      const existingResult: DbResult<{ id: number }> = await this.db.query(existingQuery, [input.slug, contentId]);
      if (existingResult.rows.length > 0) {
        throw new BizError({
          code: 'SLUG_ALREADY_EXISTS',
          message: 'Content with this slug already exists',
          });
      }
      updates.push('slug = ?');
      params.push(input.slug);
    }

    if (input.summary !== undefined) {
      updates.push('summary = ?');
      params.push(input.summary);
    }

    if (input.content !== undefined) {
      updates.push('content = ?');
      params.push(input.content);
    }

    if (input.data_json !== undefined) {
      updates.push('data_json = ?');
      params.push(input.data_json ? JSON.stringify(input.data_json) : null);
    }

    if (input.cover_image_url !== undefined) {
      updates.push('cover_image_url = ?');
      params.push(input.cover_image_url);
    }

    if (input.regions !== undefined) {
      updates.push('regions = ?');
      params.push(input.regions ? JSON.stringify(input.regions) : null);
    }

    if (input.job_categories !== undefined) {
      updates.push('job_categories = ?');
      params.push(input.job_categories ? JSON.stringify(input.job_categories) : null);
    }

    if (input.published_date !== undefined) {
      updates.push('published_date = ?');
      params.push(input.published_date);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(input.is_featured ? 1 : 0);
    }

    if (updates.length === 0) {
      return content;
    }

    updates.push('updated_at = NOW()');
    params.push(contentId);

    const query = `
      UPDATE job_market_content
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await this.db.query(query, params);

    const updatedContent = await this.getContentById(contentId);
    if (!updatedContent) {
      throw new BizError({
        code: 'CONTENT_UPDATE_FAILED',
        message: 'Failed to retrieve updated content'
      });
    }

    return updatedContent;
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: number): Promise<void> {
    const content = await this.getContentById(contentId);
    if (!content) {
      throw new BizError({
        code: 'CONTENT_NOT_FOUND',
        message: 'Job market content not found',
      });
    }

    const query = 'DELETE FROM job_market_content WHERE id = ?';
    await this.db.query(query, [contentId]);
  }

  /**
   * Increment view count
   */
  private async incrementViewCount(contentId: number): Promise<void> {
    const query = 'UPDATE job_market_content SET view_count = view_count + 1 WHERE id = ?';
    await this.db.query(query, [contentId]);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Map database row to JobMarketContent interface
   */
  private mapRowToContent(row: JobMarketContentRow): JobMarketContent {
    return {
      id: row.id,
      content_type: row.content_type,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      data_json: row.data_json ? safeJsonParse<Record<string, unknown> | null>(row.data_json, null) : null,
      cover_image_url: row.cover_image_url,
      regions: row.regions ? safeJsonParse<string[]>(row.regions, []) : null,
      job_categories: row.job_categories ? safeJsonParse<number[]>(row.job_categories, []) : null,
      published_date: row.published_date ? new Date(row.published_date) : null,
      status: row.status,
      author_user_id: row.author_user_id,
      view_count: row.view_count,
      is_featured: Boolean(row.is_featured),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

let serviceInstance: JobMarketContentService | null = null;

export function getJobMarketContentService(): JobMarketContentService {
  if (!serviceInstance) {
    const db = getDatabaseService();
    serviceInstance = new JobMarketContentService(db);
  }
  return serviceInstance;
}
