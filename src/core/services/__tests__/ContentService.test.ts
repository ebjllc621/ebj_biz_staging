/**
 * ContentService Test Suite
 *
 * Comprehensive tests for ContentService covering:
 * - READ operations (getArticles, getVideos, getPodcasts, getBySlug, searchContent, getFeatured)
 * - WRITE operations (createArticle, updateArticle, deleteArticle, publishArticle)
 * - UTILITY operations (generateSlug, incrementViewCount, incrementBookmarkCount)
 * - Error scenarios
 * - Edge cases
 *
 * Coverage Target: 90%+
 *
 * @tier STANDARD
 * @phase Phase 7 - Testing & Validation
 * @governance Build Map v2.1 ENHANCED
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ContentService,
  ContentNotFoundError,
  DuplicateSlugError,
  ContentStatus,
  VideoType
} from '../ContentService';
import { DatabaseService } from '../DatabaseService';
import { BizError } from '@core/errors/BizError';

describe('ContentService', () => {
  let service: ContentService;
  let mockDb: any;

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    service = new ContentService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // ARTICLE OPERATIONS - READ Tests
  // ==========================================================================

  describe('getArticles', () => {
    it('should retrieve all articles without filters', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Test Article',
          slug: 'test-article',
          excerpt: 'Test excerpt',
          content: 'Test content',
          featured_image: null,
          tags: '[]',
          reading_time: 5,
          view_count: 0,
          bookmark_count: 0,
          status: 'published',
          is_featured: 0,
          is_sponsored: 0,
          listing_id: null,
          category_id: null,
          published_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' }) // count
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1, command: 'SELECT' }); // data

      const result = await service.getArticles();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply status filter', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Published',
          slug: 'published',
          excerpt: null,
          content: null,
          featured_image: null,
          tags: '[]',
          reading_time: 5,
          view_count: 0,
          bookmark_count: 0,
          status: 'published',
          is_featured: 0,
          is_sponsored: 0,
          listing_id: null,
          category_id: null,
          published_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.getArticles({ status: ContentStatus.PUBLISHED });

      expect(result.data).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = ?'),
        expect.arrayContaining(['published'])
      );
    });

    it('should apply search query filter', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      await service.getArticles({ searchQuery: 'test' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('title LIKE ? OR excerpt LIKE ? OR content LIKE ?'),
        expect.arrayContaining(['%test%'])
      );
    });

    it('should paginate results', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 50 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getArticles({}, { page: 2, pageSize: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  describe('getArticleById', () => {
    it('should retrieve article by ID', async () => {
      const mockRow = {
        id: 1,
        title: 'Test Article',
        slug: 'test-article',
        excerpt: null,
        content: null,
        featured_image: null,
        tags: '["tag1", "tag2"]',
        reading_time: 5,
        view_count: 10,
        bookmark_count: 2,
        status: 'published',
        is_featured: 1,
        is_sponsored: 0,
        listing_id: null,
        category_id: null,
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1, command: 'SELECT' });

      const result = await service.getArticleById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.tags).toEqual(['tag1', 'tag2']);
      expect(result?.is_featured).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM content_articles WHERE id = ?',
        [1]
      );
    });

    it('should return null when article not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getArticleById(999);

      expect(result).toBeNull();
    });
  });

  describe('getArticleBySlug', () => {
    it('should retrieve article by slug', async () => {
      const mockRow = {
        id: 1,
        title: 'Test',
        slug: 'test-article',
        excerpt: null,
        content: null,
        featured_image: null,
        tags: '[]',
        reading_time: 5,
        view_count: 0,
        bookmark_count: 0,
        status: 'published',
        is_featured: 0,
        is_sponsored: 0,
        listing_id: null,
        category_id: null,
        published_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1, command: 'SELECT' });

      const result = await service.getArticleBySlug('test-article');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('test-article');
    });

    it('should return null when slug not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getArticleBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // ARTICLE OPERATIONS - WRITE Tests
  // ==========================================================================

  describe('createArticle', () => {
    it('should create new article with auto-generated slug', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // generateSlug check
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // duplicate slug check
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'INSERT', insertId: 1 }) // insert
        .mockResolvedValueOnce({ // getById
          rows: [{
            id: 1,
            title: 'New Article',
            slug: 'new-article',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'draft',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.createArticle({ title: 'New Article' });

      expect(result.id).toBe(1);
      expect(result.slug).toBe('new-article');
      expect(result.status).toBe(ContentStatus.DRAFT);
    });

    it('should create article with custom slug', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // duplicate check
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'INSERT', insertId: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Custom',
            slug: 'custom-slug',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'draft',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.createArticle({ title: 'Custom', slug: 'custom-slug' });

      expect(result.slug).toBe('custom-slug');
    });

    it('should throw error on duplicate slug', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 1,
          slug: 'duplicate',
          title: 'Existing',
          excerpt: null,
          content: null,
          featured_image: null,
          tags: '[]',
          reading_time: 0,
          view_count: 0,
          bookmark_count: 0,
          status: 'published',
          is_featured: 0,
          is_sponsored: 0,
          listing_id: null,
          category_id: null,
          published_at: null,
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1,
        command: 'SELECT'
      });

      await expect(service.createArticle({ title: 'New', slug: 'duplicate' }))
        .rejects.toThrow(DuplicateSlugError);
    });
  });

  describe('updateArticle', () => {
    it('should update article fields', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById
          rows: [{
            id: 1,
            title: 'Old Title',
            slug: 'old-slug',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'draft',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE' }) // update
        .mockResolvedValueOnce({ // getById (updated)
          rows: [{
            id: 1,
            title: 'New Title',
            slug: 'old-slug',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'draft',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.updateArticle(1, { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });

    it('should throw error when article not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      await expect(service.updateArticle(999, { title: 'New' }))
        .rejects.toThrow(ContentNotFoundError);
    });
  });

  describe('deleteArticle', () => {
    it('should delete article', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById
          rows: [{
            id: 1,
            title: 'Test',
            slug: 'test',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'draft',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'DELETE' });

      await service.deleteArticle(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM content_articles WHERE id = ?',
        [1]
      );
    });

    it('should throw error when article not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      await expect(service.deleteArticle(999)).rejects.toThrow(ContentNotFoundError);
    });
  });

  describe('publishArticle', () => {
    it('should publish article', async () => {
      const publishedAt = new Date();

      mockDb.query
        .mockResolvedValueOnce({ // getById (draft)
          rows: [{
            id: 1,
            title: 'Test',
            slug: 'test',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'draft',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE' }) // publish
        .mockResolvedValueOnce({ // getById (published)
          rows: [{
            id: 1,
            title: 'Test',
            slug: 'test',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'published',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: publishedAt,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.publishArticle(1);

      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(result.published_at).toBeTruthy();
    });
  });

  // ==========================================================================
  // VIDEO OPERATIONS Tests (Similar patterns)
  // ==========================================================================

  describe('getVideos', () => {
    it('should retrieve all videos', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Test Video',
          slug: 'test-video',
          description: null,
          thumbnail: null,
          video_url: 'https://youtube.com/watch?v=test',
          video_type: 'youtube',
          duration: 120,
          tags: '[]',
          view_count: 0,
          bookmark_count: 0,
          status: 'published',
          is_featured: 0,
          is_sponsored: 0,
          listing_id: null,
          category_id: null,
          published_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.getVideos();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].video_type).toBe(VideoType.YOUTUBE);
    });
  });

  describe('getVideoById', () => {
    it('should retrieve video by ID', async () => {
      const mockRow = {
        id: 1,
        title: 'Test Video',
        slug: 'test-video',
        description: null,
        thumbnail: null,
        video_url: 'https://youtube.com/test',
        video_type: 'youtube',
        duration: 120,
        tags: '[]',
        view_count: 0,
        bookmark_count: 0,
        status: 'published',
        is_featured: 0,
        is_sponsored: 0,
        listing_id: null,
        category_id: null,
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1, command: 'SELECT' });

      const result = await service.getVideoById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });
  });

  // ==========================================================================
  // PODCAST OPERATIONS Tests (Similar patterns)
  // ==========================================================================

  describe('getPodcasts', () => {
    it('should retrieve all podcasts', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Test Podcast',
          slug: 'test-podcast',
          description: null,
          thumbnail: null,
          audio_url: 'https://example.com/podcast.mp3',
          episode_number: 1,
          season_number: 1,
          duration: 1800,
          tags: '[]',
          view_count: 0,
          bookmark_count: 0,
          status: 'published',
          is_featured: 0,
          is_sponsored: 0,
          listing_id: null,
          category_id: null,
          published_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.getPodcasts();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].episode_number).toBe(1);
    });
  });

  // ==========================================================================
  // UNIFIED OPERATIONS Tests
  // ==========================================================================

  describe('searchContent', () => {
    it('should search across all content types when type is "all"', async () => {
      mockDb.query
        // Articles
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' })
        // Videos
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' })
        // Podcasts
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.searchContent({ type: 'all' });

      expect(result.articles).toBeDefined();
      expect(result.videos).toBeDefined();
      expect(result.podcasts).toBeDefined();
      expect(result.all).toBeDefined();
    });
  });

  describe('getFeatured', () => {
    it('should get featured content from all types', async () => {
      mockDb.query
        // Articles
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' })
        // Videos
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' })
        // Podcasts
        .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getFeatured(5);

      expect(result.articles).toBeDefined();
      expect(result.videos).toBeDefined();
      expect(result.podcasts).toBeDefined();
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count for article', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE' });

      await service.incrementViewCount('article', 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE content_articles SET view_count = view_count + 1 WHERE id = ?',
        [1]
      );
    });
  });

  describe('incrementBookmarkCount', () => {
    it('should increment bookmark count for video', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE' });

      await service.incrementBookmarkCount('video', 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE content_videos SET bookmark_count = bookmark_count + 1 WHERE id = ?',
        [1]
      );
    });
  });

  // ==========================================================================
  // UTILITY OPERATIONS Tests
  // ==========================================================================

  describe('generateSlug', () => {
    it('should generate URL-safe slug from title', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const slug = await service.generateSlug('Test Article Title', 'article');

      expect(slug).toBe('test-article-title');
    });

    it('should remove special characters', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const slug = await service.generateSlug('Test @ Article # Title!', 'article');

      expect(slug).toBe('test-article-title');
    });

    it('should append number if slug exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // First check - exists
          rows: [{
            id: 1,
            slug: 'test',
            title: 'Test',
            excerpt: null,
            content: null,
            featured_image: null,
            tags: '[]',
            reading_time: 0,
            view_count: 0,
            bookmark_count: 0,
            status: 'published',
            is_featured: 0,
            is_sponsored: 0,
            listing_id: null,
            category_id: null,
            published_at: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }); // Second check - available

      const slug = await service.generateSlug('Test', 'article');

      expect(slug).toBe('test-1');
    });
  });
});
