/**
 * ContentService - Unified Content Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (ContentRow types)
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority BRAIN_PLAN_CONTENT_PAGE.md - Phase 2 Service Layer
 * @tier STANDARD
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import {
  ContentArticleRow,
  ContentVideoRow,
  ContentPodcastRow
} from '@core/types/db-rows';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Content Interfaces (Application-Level)
// ============================================================================

export interface ContentArticle {
  id: number;
  listing_id: number | null;
  category_id: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  tags: string[];
  reading_time: number;
  view_count: number;
  bookmark_count: number;
  status: ContentStatus;
  is_featured: boolean;
  is_sponsored: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ContentVideo {
  id: number;
  listing_id: number | null;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  video_url: string;
  video_type: VideoType;
  duration: number | null;
  tags: string[];
  view_count: number;
  bookmark_count: number;
  status: ContentStatus;
  is_featured: boolean;
  is_sponsored: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ContentPodcast {
  id: number;
  listing_id: number | null;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  audio_url: string;
  episode_number: number | null;
  season_number: number | null;
  duration: number | null;
  tags: string[];
  view_count: number;
  bookmark_count: number;
  status: ContentStatus;
  is_featured: boolean;
  is_sponsored: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type ContentItem = ContentArticle | ContentVideo | ContentPodcast;

export type ContentType = 'article' | 'video' | 'podcast';

// ============================================================================
// Enums
// ============================================================================

export enum ContentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum VideoType {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  UPLOAD = 'upload',
  EMBED = 'embed'
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateArticleInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  tags?: string[];
  reading_time?: number;
  listing_id?: number;
  category_id?: number;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

export interface UpdateArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  tags?: string[];
  reading_time?: number;
  category_id?: number;
  status?: ContentStatus;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

export interface CreateVideoInput {
  title: string;
  video_url: string;
  video_type?: VideoType;
  slug?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  tags?: string[];
  listing_id?: number;
  category_id?: number;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

export interface UpdateVideoInput {
  title?: string;
  video_url?: string;
  video_type?: VideoType;
  slug?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  tags?: string[];
  category_id?: number;
  status?: ContentStatus;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

export interface CreatePodcastInput {
  title: string;
  audio_url: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  episode_number?: number;
  season_number?: number;
  duration?: number;
  tags?: string[];
  listing_id?: number;
  category_id?: number;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

export interface UpdatePodcastInput {
  title?: string;
  audio_url?: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  episode_number?: number;
  season_number?: number;
  duration?: number;
  tags?: string[];
  category_id?: number;
  status?: ContentStatus;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

// ============================================================================
// Filter and Pagination Types
// ============================================================================

export interface ContentFilters {
  type?: ContentType | 'all';
  categoryId?: number;
  status?: ContentStatus;
  isFeatured?: boolean;
  isSponsored?: boolean;
  listingId?: number;
  searchQuery?: string;
  followedListingIds?: number[];
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
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

export interface ContentSearchResult {
  articles: ContentArticle[];
  videos: ContentVideo[];
  podcasts: ContentPodcast[];
  all: ContentItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type SortOption = 'category_featured' | 'recent' | 'popular' | 'alphabetical';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ContentNotFoundError extends BizError {
  constructor(type: ContentType, identifier: number | string) {
    super({
      code: 'CONTENT_NOT_FOUND',
      message: `${type} not found: ${identifier}`,
      context: { type, identifier },
      userMessage: `The requested ${type} was not found`
    });
  }
}

export class DuplicateSlugError extends BizError {
  constructor(type: ContentType, slug: string) {
    super({
      code: 'DUPLICATE_SLUG',
      message: `${type} slug already exists: ${slug}`,
      context: { type, slug },
      userMessage: `A ${type} with this URL slug already exists`
    });
  }
}

export class InvalidContentStatusError extends BizError {
  constructor(currentStatus: ContentStatus, targetStatus: ContentStatus) {
    super({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      context: { currentStatus, targetStatus },
      userMessage: 'This status change is not allowed'
    });
  }
}

// ============================================================================
// ContentService Implementation
// ============================================================================

export class ContentService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // ARTICLE OPERATIONS
  // ==========================================================================

  /**
   * Get articles with optional filters, pagination, and sorting
   */
  async getArticles(
    filters?: ContentFilters,
    pagination?: PaginationParams,
    sort?: SortOption
  ): Promise<PaginatedResult<ContentArticle>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT * FROM content_articles';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.categoryId) {
      conditions.push('category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters?.listingId) {
      conditions.push('listing_id = ?');
      params.push(filters.listingId);
    }

    if (filters?.isFeatured !== undefined) {
      conditions.push('is_featured = ?');
      params.push(filters.isFeatured ? 1 : 0);
    }

    if (filters?.isSponsored !== undefined) {
      conditions.push('is_sponsored = ?');
      params.push(filters.isSponsored ? 1 : 0);
    }

    if (filters?.searchQuery) {
      conditions.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (filters?.followedListingIds && filters.followedListingIds.length > 0) {
      const placeholders = filters.followedListingIds.map(() => '?').join(',');
      conditions.push(`listing_id IN (${placeholders})`);
      params.push(...filters.followedListingIds);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_articles${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentArticleRow> = await this.db.query<ContentArticleRow>(sql, params);

    return {
      data: result.rows.map(row => this.mapArticleRowToEntity(row)),
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
   * Get article by ID
   */
  async getArticleById(id: number): Promise<ContentArticle | null> {
    const result: DbResult<ContentArticleRow> = await this.db.query<ContentArticleRow>(
      'SELECT * FROM content_articles WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapArticleRowToEntity(row);
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<ContentArticle | null> {
    const result: DbResult<ContentArticleRow> = await this.db.query<ContentArticleRow>(
      'SELECT * FROM content_articles WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapArticleRowToEntity(row);
  }

  /**
   * Create a new article
   */
  async createArticle(data: CreateArticleInput): Promise<ContentArticle> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.title, 'article');

    // Check for duplicate slug
    const existing = await this.getArticleBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError('article', slug);
    }

    // Insert article
    const tagsJson = JSON.stringify(data.tags || []);
    const result: DbResult<ContentArticleRow> = await this.db.query<ContentArticleRow>(
      `INSERT INTO content_articles
       (title, slug, excerpt, content, featured_image, tags, reading_time,
        listing_id, category_id, is_featured, is_sponsored, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        data.title,
        slug,
        data.excerpt || null,
        data.content || null,
        data.featured_image || null,
        tagsJson,
        data.reading_time || 0,
        data.listing_id || null,
        data.category_id || null,
        data.is_featured ? 1 : 0,
        data.is_sponsored ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create article', new Error('No insert ID returned'));
    }

    const created = await this.getArticleById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create article', new Error('Failed to retrieve created article'));
    }

    return created;
  }

  /**
   * Update an article
   */
  async updateArticle(id: number, data: UpdateArticleInput): Promise<ContentArticle> {
    // Check article exists
    const existing = await this.getArticleById(id);
    if (!existing) {
      throw new ContentNotFoundError('article', id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getArticleBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateSlugError('article', data.slug);
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

    if (data.excerpt !== undefined) {
      updates.push('excerpt = ?');
      params.push(data.excerpt);
    }

    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }

    if (data.featured_image !== undefined) {
      updates.push('featured_image = ?');
      params.push(data.featured_image);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (data.reading_time !== undefined) {
      updates.push('reading_time = ?');
      params.push(data.reading_time);
    }

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(data.category_id);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.is_sponsored !== undefined) {
      updates.push('is_sponsored = ?');
      params.push(data.is_sponsored ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE content_articles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getArticleById(id);
    if (!updated) {
      throw BizError.databaseError('update article', new Error('Failed to retrieve updated article'));
    }

    return updated;
  }

  /**
   * Delete an article
   */
  async deleteArticle(id: number): Promise<void> {
    const article = await this.getArticleById(id);
    if (!article) {
      throw new ContentNotFoundError('article', id);
    }

    await this.db.query('DELETE FROM content_articles WHERE id = ?', [id]);
  }

  /**
   * Publish an article
   */
  async publishArticle(id: number): Promise<ContentArticle> {
    const article = await this.getArticleById(id);
    if (!article) {
      throw new ContentNotFoundError('article', id);
    }

    await this.db.query(
      'UPDATE content_articles SET status = ?, published_at = NOW() WHERE id = ?',
      [ContentStatus.PUBLISHED, id]
    );

    const published = await this.getArticleById(id);
    if (!published) {
      throw BizError.databaseError('publish article', new Error('Failed to retrieve published article'));
    }

    return published;
  }

  // ==========================================================================
  // VIDEO OPERATIONS
  // ==========================================================================

  /**
   * Get videos with optional filters, pagination, and sorting
   */
  async getVideos(
    filters?: ContentFilters,
    pagination?: PaginationParams,
    sort?: SortOption
  ): Promise<PaginatedResult<ContentVideo>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT * FROM content_videos';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.categoryId) {
      conditions.push('category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters?.listingId) {
      conditions.push('listing_id = ?');
      params.push(filters.listingId);
    }

    if (filters?.isFeatured !== undefined) {
      conditions.push('is_featured = ?');
      params.push(filters.isFeatured ? 1 : 0);
    }

    if (filters?.isSponsored !== undefined) {
      conditions.push('is_sponsored = ?');
      params.push(filters.isSponsored ? 1 : 0);
    }

    if (filters?.searchQuery) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam);
    }

    if (filters?.followedListingIds && filters.followedListingIds.length > 0) {
      const placeholders = filters.followedListingIds.map(() => '?').join(',');
      conditions.push(`listing_id IN (${placeholders})`);
      params.push(...filters.followedListingIds);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_videos${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentVideoRow> = await this.db.query<ContentVideoRow>(sql, params);

    return {
      data: result.rows.map(row => this.mapVideoRowToEntity(row)),
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
   * Get video by ID
   */
  async getVideoById(id: number): Promise<ContentVideo | null> {
    const result: DbResult<ContentVideoRow> = await this.db.query<ContentVideoRow>(
      'SELECT * FROM content_videos WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapVideoRowToEntity(row);
  }

  /**
   * Get video by slug
   */
  async getVideoBySlug(slug: string): Promise<ContentVideo | null> {
    const result: DbResult<ContentVideoRow> = await this.db.query<ContentVideoRow>(
      'SELECT * FROM content_videos WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapVideoRowToEntity(row);
  }

  /**
   * Create a new video
   */
  async createVideo(data: CreateVideoInput): Promise<ContentVideo> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.title, 'video');

    // Check for duplicate slug
    const existing = await this.getVideoBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError('video', slug);
    }

    // Insert video
    const tagsJson = JSON.stringify(data.tags || []);
    const result: DbResult<ContentVideoRow> = await this.db.query<ContentVideoRow>(
      `INSERT INTO content_videos
       (title, slug, description, thumbnail, video_url, video_type, duration, tags,
        listing_id, category_id, is_featured, is_sponsored, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        data.title,
        slug,
        data.description || null,
        data.thumbnail || null,
        data.video_url,
        data.video_type || VideoType.YOUTUBE,
        data.duration || null,
        tagsJson,
        data.listing_id || null,
        data.category_id || null,
        data.is_featured ? 1 : 0,
        data.is_sponsored ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create video', new Error('No insert ID returned'));
    }

    const created = await this.getVideoById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create video', new Error('Failed to retrieve created video'));
    }

    return created;
  }

  /**
   * Update a video
   */
  async updateVideo(id: number, data: UpdateVideoInput): Promise<ContentVideo> {
    // Check video exists
    const existing = await this.getVideoById(id);
    if (!existing) {
      throw new ContentNotFoundError('video', id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getVideoBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateSlugError('video', data.slug);
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

    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }

    if (data.video_url !== undefined) {
      updates.push('video_url = ?');
      params.push(data.video_url);
    }

    if (data.video_type !== undefined) {
      updates.push('video_type = ?');
      params.push(data.video_type);
    }

    if (data.duration !== undefined) {
      updates.push('duration = ?');
      params.push(data.duration);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(data.category_id);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.is_sponsored !== undefined) {
      updates.push('is_sponsored = ?');
      params.push(data.is_sponsored ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE content_videos SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getVideoById(id);
    if (!updated) {
      throw BizError.databaseError('update video', new Error('Failed to retrieve updated video'));
    }

    return updated;
  }

  /**
   * Delete a video
   */
  async deleteVideo(id: number): Promise<void> {
    const video = await this.getVideoById(id);
    if (!video) {
      throw new ContentNotFoundError('video', id);
    }

    await this.db.query('DELETE FROM content_videos WHERE id = ?', [id]);
  }

  /**
   * Publish a video
   */
  async publishVideo(id: number): Promise<ContentVideo> {
    const video = await this.getVideoById(id);
    if (!video) {
      throw new ContentNotFoundError('video', id);
    }

    await this.db.query(
      'UPDATE content_videos SET status = ?, published_at = NOW() WHERE id = ?',
      [ContentStatus.PUBLISHED, id]
    );

    const published = await this.getVideoById(id);
    if (!published) {
      throw BizError.databaseError('publish video', new Error('Failed to retrieve published video'));
    }

    return published;
  }

  // ==========================================================================
  // PODCAST OPERATIONS
  // ==========================================================================

  /**
   * Get podcasts with optional filters, pagination, and sorting
   */
  async getPodcasts(
    filters?: ContentFilters,
    pagination?: PaginationParams,
    sort?: SortOption
  ): Promise<PaginatedResult<ContentPodcast>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT * FROM content_podcasts';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.categoryId) {
      conditions.push('category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters?.listingId) {
      conditions.push('listing_id = ?');
      params.push(filters.listingId);
    }

    if (filters?.isFeatured !== undefined) {
      conditions.push('is_featured = ?');
      params.push(filters.isFeatured ? 1 : 0);
    }

    if (filters?.isSponsored !== undefined) {
      conditions.push('is_sponsored = ?');
      params.push(filters.isSponsored ? 1 : 0);
    }

    if (filters?.searchQuery) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam);
    }

    if (filters?.followedListingIds && filters.followedListingIds.length > 0) {
      const placeholders = filters.followedListingIds.map(() => '?').join(',');
      conditions.push(`listing_id IN (${placeholders})`);
      params.push(...filters.followedListingIds);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_podcasts${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentPodcastRow> = await this.db.query<ContentPodcastRow>(sql, params);

    return {
      data: result.rows.map(row => this.mapPodcastRowToEntity(row)),
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
   * Get podcast by ID
   */
  async getPodcastById(id: number): Promise<ContentPodcast | null> {
    const result: DbResult<ContentPodcastRow> = await this.db.query<ContentPodcastRow>(
      'SELECT * FROM content_podcasts WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapPodcastRowToEntity(row);
  }

  /**
   * Get podcast by slug
   */
  async getPodcastBySlug(slug: string): Promise<ContentPodcast | null> {
    const result: DbResult<ContentPodcastRow> = await this.db.query<ContentPodcastRow>(
      'SELECT * FROM content_podcasts WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapPodcastRowToEntity(row);
  }

  /**
   * Create a new podcast
   */
  async createPodcast(data: CreatePodcastInput): Promise<ContentPodcast> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.title, 'podcast');

    // Check for duplicate slug
    const existing = await this.getPodcastBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError('podcast', slug);
    }

    // Insert podcast
    const tagsJson = JSON.stringify(data.tags || []);
    const result: DbResult<ContentPodcastRow> = await this.db.query<ContentPodcastRow>(
      `INSERT INTO content_podcasts
       (title, slug, description, thumbnail, audio_url, episode_number, season_number,
        duration, tags, listing_id, category_id, is_featured, is_sponsored, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        data.title,
        slug,
        data.description || null,
        data.thumbnail || null,
        data.audio_url,
        data.episode_number || null,
        data.season_number || null,
        data.duration || null,
        tagsJson,
        data.listing_id || null,
        data.category_id || null,
        data.is_featured ? 1 : 0,
        data.is_sponsored ? 1 : 0
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create podcast', new Error('No insert ID returned'));
    }

    const created = await this.getPodcastById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create podcast', new Error('Failed to retrieve created podcast'));
    }

    return created;
  }

  /**
   * Update a podcast
   */
  async updatePodcast(id: number, data: UpdatePodcastInput): Promise<ContentPodcast> {
    // Check podcast exists
    const existing = await this.getPodcastById(id);
    if (!existing) {
      throw new ContentNotFoundError('podcast', id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getPodcastBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateSlugError('podcast', data.slug);
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

    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }

    if (data.audio_url !== undefined) {
      updates.push('audio_url = ?');
      params.push(data.audio_url);
    }

    if (data.episode_number !== undefined) {
      updates.push('episode_number = ?');
      params.push(data.episode_number);
    }

    if (data.season_number !== undefined) {
      updates.push('season_number = ?');
      params.push(data.season_number);
    }

    if (data.duration !== undefined) {
      updates.push('duration = ?');
      params.push(data.duration);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(data.category_id);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.is_sponsored !== undefined) {
      updates.push('is_sponsored = ?');
      params.push(data.is_sponsored ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE content_podcasts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getPodcastById(id);
    if (!updated) {
      throw BizError.databaseError('update podcast', new Error('Failed to retrieve updated podcast'));
    }

    return updated;
  }

  /**
   * Delete a podcast
   */
  async deletePodcast(id: number): Promise<void> {
    const podcast = await this.getPodcastById(id);
    if (!podcast) {
      throw new ContentNotFoundError('podcast', id);
    }

    await this.db.query('DELETE FROM content_podcasts WHERE id = ?', [id]);
  }

  /**
   * Publish a podcast
   */
  async publishPodcast(id: number): Promise<ContentPodcast> {
    const podcast = await this.getPodcastById(id);
    if (!podcast) {
      throw new ContentNotFoundError('podcast', id);
    }

    await this.db.query(
      'UPDATE content_podcasts SET status = ?, published_at = NOW() WHERE id = ?',
      [ContentStatus.PUBLISHED, id]
    );

    const published = await this.getPodcastById(id);
    if (!published) {
      throw BizError.databaseError('publish podcast', new Error('Failed to retrieve published podcast'));
    }

    return published;
  }

  // ==========================================================================
  // UNIFIED OPERATIONS
  // ==========================================================================

  /**
   * Search all content types with unified results
   * Used by /api/content/search endpoint
   */
  async searchContent(
    filters?: ContentFilters,
    pagination?: PaginationParams,
    sort?: SortOption
  ): Promise<ContentSearchResult> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    // Get content based on type filter
    const type = filters?.type || 'all';

    let articles: ContentArticle[] = [];
    let videos: ContentVideo[] = [];
    let podcasts: ContentPodcast[] = [];

    if (type === 'all' || type === 'article') {
      const articleResult = await this.getArticles(
        { ...filters, type: 'article' },
        type === 'all' ? { page: 1, pageSize: Math.ceil(pageSize / 3) } : pagination,
        sort
      );
      articles = articleResult.data;
    }

    if (type === 'all' || type === 'video') {
      const videoResult = await this.getVideos(
        { ...filters, type: 'video' },
        type === 'all' ? { page: 1, pageSize: Math.ceil(pageSize / 3) } : pagination,
        sort
      );
      videos = videoResult.data;
    }

    if (type === 'all' || type === 'podcast') {
      const podcastResult = await this.getPodcasts(
        { ...filters, type: 'podcast' },
        type === 'all' ? { page: 1, pageSize: Math.ceil(pageSize / 3) } : pagination,
        sort
      );
      podcasts = podcastResult.data;
    }

    const all: ContentItem[] = [...articles, ...videos, ...podcasts];
    const total = all.length;

    return {
      articles,
      videos,
      podcasts,
      all,
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
   * Get featured content across all types
   * @param limit Max items per type (default: 5)
   */
  async getFeatured(limit: number = 5): Promise<{
    articles: ContentArticle[];
    videos: ContentVideo[];
    podcasts: ContentPodcast[];
  }> {
    const articleResult = await this.getArticles(
      { isFeatured: true, status: ContentStatus.PUBLISHED },
      { page: 1, pageSize: limit },
      'recent'
    );

    const videoResult = await this.getVideos(
      { isFeatured: true, status: ContentStatus.PUBLISHED },
      { page: 1, pageSize: limit },
      'recent'
    );

    const podcastResult = await this.getPodcasts(
      { isFeatured: true, status: ContentStatus.PUBLISHED },
      { page: 1, pageSize: limit },
      'recent'
    );

    return {
      articles: articleResult.data,
      videos: videoResult.data,
      podcasts: podcastResult.data
    };
  }

  /**
   * Get content by category across all types
   */
  async getByCategory(categoryId: number): Promise<ContentItem[]> {
    const articleResult = await this.getArticles(
      { categoryId, status: ContentStatus.PUBLISHED },
      { page: 1, pageSize: 100 }
    );

    const videoResult = await this.getVideos(
      { categoryId, status: ContentStatus.PUBLISHED },
      { page: 1, pageSize: 100 }
    );

    const podcastResult = await this.getPodcasts(
      { categoryId, status: ContentStatus.PUBLISHED },
      { page: 1, pageSize: 100 }
    );

    return [...articleResult.data, ...videoResult.data, ...podcastResult.data];
  }

  /**
   * Increment view count for any content type
   */
  async incrementViewCount(type: ContentType, id: number): Promise<void> {
    const table = this.getTableName(type);
    await this.db.query(
      `UPDATE ${table} SET view_count = view_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Increment bookmark count for any content type
   */
  async incrementBookmarkCount(type: ContentType, id: number): Promise<void> {
    const table = this.getTableName(type);
    await this.db.query(
      `UPDATE ${table} SET bookmark_count = bookmark_count + 1 WHERE id = ?`,
      [id]
    );
  }

  // ==========================================================================
  // UTILITY OPERATIONS
  // ==========================================================================

  /**
   * Generate unique slug from title
   */
  async generateSlug(title: string, type: ContentType): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    let slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure uniqueness
    let counter = 1;
    let uniqueSlug = slug;

    while (true) {
      const existing = await this.getBySlug(type, uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      if (counter > 1000) {
        throw BizError.internalServerError(
          'ContentService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Get content by slug (any type)
   */
  private async getBySlug(type: ContentType, slug: string): Promise<ContentItem | null> {
    switch (type) {
      case 'article':
        return this.getArticleBySlug(slug);
      case 'video':
        return this.getVideoBySlug(slug);
      case 'podcast':
        return this.getPodcastBySlug(slug);
    }
  }

  /**
   * Get table name for content type
   */
  private getTableName(type: ContentType): string {
    switch (type) {
      case 'article':
        return 'content_articles';
      case 'video':
        return 'content_videos';
      case 'podcast':
        return 'content_podcasts';
    }
  }

  /**
   * Map article row to entity
   */
  private mapArticleRowToEntity(row: ContentArticleRow): ContentArticle {
    return {
      id: row.id,
      listing_id: row.listing_id,
      category_id: row.category_id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      featured_image: row.featured_image,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : [],
      reading_time: row.reading_time,
      view_count: row.view_count,
      bookmark_count: row.bookmark_count,
      status: row.status as ContentStatus,
      is_featured: Boolean(row.is_featured),
      is_sponsored: Boolean(row.is_sponsored),
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map video row to entity
   */
  private mapVideoRowToEntity(row: ContentVideoRow): ContentVideo {
    return {
      id: row.id,
      listing_id: row.listing_id,
      category_id: row.category_id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnail: row.thumbnail,
      video_url: row.video_url,
      video_type: row.video_type as VideoType,
      duration: row.duration,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : [],
      view_count: row.view_count,
      bookmark_count: row.bookmark_count,
      status: row.status as ContentStatus,
      is_featured: Boolean(row.is_featured),
      is_sponsored: Boolean(row.is_sponsored),
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Map podcast row to entity
   */
  private mapPodcastRowToEntity(row: ContentPodcastRow): ContentPodcast {
    return {
      id: row.id,
      listing_id: row.listing_id,
      category_id: row.category_id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnail: row.thumbnail,
      audio_url: row.audio_url,
      episode_number: row.episode_number,
      season_number: row.season_number,
      duration: row.duration,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : [],
      view_count: row.view_count,
      bookmark_count: row.bookmark_count,
      status: row.status as ContentStatus,
      is_featured: Boolean(row.is_featured),
      is_sponsored: Boolean(row.is_sponsored),
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Build SQL sort clause from sort option
   */
  private buildSortClause(sort?: SortOption): string {
    switch (sort) {
      case 'category_featured':
        return 'ORDER BY is_featured DESC, category_id ASC, published_at DESC';
      case 'recent':
        return 'ORDER BY published_at DESC, created_at DESC';
      case 'popular':
        return 'ORDER BY view_count DESC, bookmark_count DESC';
      case 'alphabetical':
        return 'ORDER BY title ASC';
      default:
        return 'ORDER BY is_featured DESC, published_at DESC';
    }
  }
}
