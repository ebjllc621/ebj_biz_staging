/**
 * CategoryService Test Suite
 *
 * Comprehensive tests for CategoryService covering:
 * - READ operations (getAll, getById, getBySlug, getChildren, getAncestors, searchByKeyword, getBreadcrumb)
 * - WRITE operations (create, update, delete, reorder)
 * - UTILITY operations (generateSlug, validateHierarchy, moveToParent)
 * - Error scenarios
 * - Edge cases
 *
 * Coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CategoryService, CategoryNotFoundError, DuplicateSlugError, InvalidHierarchyError, OrphanCategoriesError } from '../CategoryService';
import { DatabaseService } from '../DatabaseService';
import { BizError } from '@core/errors/BizError';

describe('CategoryService', () => {
  let service: CategoryService;
  let mockDb: unknown;

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    service = new CategoryService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // READ Operations Tests
  // ==========================================================================

  describe('getAll', () => {
    it('should retrieve all categories without filters', async () => {
      const mockRows = [
        { id: 1, name: 'Category 1', slug: 'category-1', keywords: '[]', parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Category 2', slug: 'category-2', keywords: '["test"]', parent_id: 1, sort_order: 1, is_active: 1, created_at: new Date(), updated_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 2, command: 'SELECT' });

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].keywords).toEqual(['test']);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM categories'),
        []
      );
    });

    it('should retrieve categories with parentId filter', async () => {
      const mockRows = [
        { id: 2, name: 'Child 1', slug: 'child-1', keywords: '[]', parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.getAll({ parentId: 1 });

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('parent_id = ?'),
        [1]
      );
    });

    it('should retrieve root categories when parentId is null', async () => {
      const mockRows = [
        { id: 1, name: 'Root 1', slug: 'root-1', keywords: '[]', parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.getAll({ parentId: null });

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('parent_id IS NULL'),
        []
      );
    });

    it('should retrieve active categories when isActive filter is true', async () => {
      const mockRows = [
        { id: 1, name: 'Active', slug: 'active', keywords: '[]', parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.getAll({ isActive: true });

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = ?'),
        [1]
      );
    });
  });

  describe('getById', () => {
    it('should retrieve category by ID', async () => {
      const mockRow = {
        id: 1,
        name: 'Test Category',
        slug: 'test-category',
        keywords: '["keyword1", "keyword2"]',
        parent_id: null,
        sort_order: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1, command: 'SELECT' });

      const result = await service.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Category');
      expect(result?.keywords).toEqual(['keyword1', 'keyword2']);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM categories WHERE id = ?',
        [1]
      );
    });

    it('should return null when category not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('should retrieve category by slug', async () => {
      const mockRow = {
        id: 1,
        name: 'Test Category',
        slug: 'test-category',
        keywords: '[]',
        parent_id: null,
        sort_order: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1, command: 'SELECT' });

      const result = await service.getBySlug('test-category');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('test-category');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM categories WHERE slug = ?',
        ['test-category']
      );
    });

    it('should return null when slug not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getChildren', () => {
    it('should retrieve direct children of category', async () => {
      const mockRows = [
        { id: 2, name: 'Child 1', slug: 'child-1', keywords: '[]', parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'Child 2', slug: 'child-2', keywords: '[]', parent_id: 1, sort_order: 1, is_active: 1, created_at: new Date(), updated_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 2, command: 'SELECT' });

      const result = await service.getChildren(1);

      expect(result).toHaveLength(2);
      expect(result[0].parent_id).toBe(1);
      expect(result[1].parent_id).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE parent_id = ?'),
        [1]
      );
    });

    it('should return empty array when no children', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const result = await service.getChildren(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAncestors', () => {
    it('should retrieve full ancestor chain (root first)', async () => {
      // Setup: Grandparent (1) -> Parent (2) -> Current (3)
      mockDb.query
        .mockResolvedValueOnce({ // First call: Get category 3
          rows: [{
            id: 3, name: 'Grandchild', slug: 'grandchild', keywords: '[]',
            parent_id: 2, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // Second call: Get category 2
          rows: [{
            id: 2, name: 'Child', slug: 'child', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // Third call: Get category 1
          rows: [{
            id: 1, name: 'Root', slug: 'root', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.getAncestors(3);

      expect(result).toHaveLength(2); // Should not include self
      expect(result[0].id).toBe(1); // Root first
      expect(result[1].id).toBe(2); // Then parent
    });

    it('should return empty array for root category', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 1, name: 'Root', slug: 'root', keywords: '[]',
          parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
        }],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await service.getAncestors(1);

      expect(result).toHaveLength(0);
    });

    it('should throw error on circular reference', async () => {
      // Setup circular reference: 1 -> 2 -> 1
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, name: 'Cat1', slug: 'cat1', keywords: '[]',
            parent_id: 2, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      await expect(service.getAncestors(1)).rejects.toThrow(InvalidHierarchyError);
    });
  });

  describe('searchByKeyword', () => {
    it('should find categories by keyword', async () => {
      const mockRows = [
        { id: 1, name: 'Cat1', slug: 'cat1', keywords: '["test", "keyword"]', parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1, command: 'SELECT' });

      const result = await service.searchByKeyword('test');

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("JSON_SEARCH(keywords, 'one', ?)"),
        ['test']
      );
    });
  });

  describe('getBreadcrumb', () => {
    it('should return ancestors plus current category', async () => {
      // Mock getAncestors
      vi.spyOn(service, 'getAncestors').mockResolvedValue([
        { id: 1, name: 'Root', slug: 'root', keywords: [], parent_id: null, sort_order: 0, is_active: true, created_at: new Date(), updated_at: new Date() }
      ]);

      // Mock getById
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 2, name: 'Current', slug: 'current', keywords: '[]',
          parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
        }],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await service.getBreadcrumb(2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should throw error when category not found', async () => {
      vi.spyOn(service, 'getAncestors').mockResolvedValue([]);
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      await expect(service.getBreadcrumb(999)).rejects.toThrow(CategoryNotFoundError);
    });
  });

  // ==========================================================================
  // WRITE Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create new category with auto-generated slug', async () => {
      // Mock slug uniqueness check + generateSlug call
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // generateSlug: getBySlug returns null
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // create: getBySlug returns null
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'INSERT', insertId: 1 }) // insert
        .mockResolvedValueOnce({ // getById
          rows: [{
            id: 1, name: 'New Category', slug: 'new-category', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.create({ name: 'New Category' });

      expect(result.id).toBe(1);
      expect(result.slug).toBe('new-category');
    });

    it('should create category with custom slug', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // getBySlug
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'INSERT', insertId: 1 }) // insert
        .mockResolvedValueOnce({
          rows: [{
            id: 1, name: 'Custom', slug: 'custom-slug', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.create({ name: 'Custom', slug: 'custom-slug' });

      expect(result.slug).toBe('custom-slug');
    });

    it('should throw error on duplicate slug', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 1, name: 'Existing', slug: 'duplicate', keywords: '[]',
          parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
        }],
        rowCount: 1,
        command: 'SELECT'
      });

      await expect(service.create({ name: 'New', slug: 'duplicate' })).rejects.toThrow(DuplicateSlugError);
    });

    it('should throw error when parent does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // generateSlug: getBySlug returns null
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }) // create: getBySlug returns null
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }); // getById (parent)

      await expect(service.create({ name: 'New', parent_id: 999 })).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById (existing)
          rows: [{
            id: 1, name: 'Old Name', slug: 'old-slug', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE' }) // update
        .mockResolvedValueOnce({ // getById (updated)
          rows: [{
            id: 1, name: 'New Name', slug: 'old-slug', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      const result = await service.update(1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should throw error when category not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      await expect(service.update(999, { name: 'New' })).rejects.toThrow(CategoryNotFoundError);
    });

    it('should throw error on duplicate slug', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById (existing)
          rows: [{
            id: 1, name: 'Cat1', slug: 'cat1', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getBySlug (duplicate check)
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      await expect(service.update(1, { slug: 'cat2' })).rejects.toThrow(DuplicateSlugError);
    });

    it('should validate hierarchy when changing parent', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById (existing)
          rows: [{
            id: 1, name: 'Cat1', slug: 'cat1', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getById (new parent check) - returns child
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      await expect(service.update(1, { parent_id: 2 })).rejects.toThrow(InvalidHierarchyError);
    });
  });

  describe('delete', () => {
    it('should delete category and reassign children to parent', async () => {
      const mockTransaction = vi.fn(async (callback) => {
        const client = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE' })
            .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'DELETE' })
        };
        return callback(client);
      });

      mockDb.transaction = mockTransaction;

      mockDb.query
        .mockResolvedValueOnce({ // getById
          rows: [{
            id: 2, name: 'Parent', slug: 'parent', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getChildren
          rows: [{
            id: 3, name: 'Child', slug: 'child', keywords: '[]',
            parent_id: 2, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      await service.delete(2);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should throw error when category not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      await expect(service.delete(999)).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('reorder', () => {
    it('should reorder categories within parent', async () => {
      const mockTransaction = vi.fn(async (callback) => {
        const client = {
          query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE' })
        };
        return callback(client);
      });

      mockDb.transaction = mockTransaction;

      mockDb.query.mockResolvedValue({ // getAll
        rows: [
          { id: 2, name: 'Child1', slug: 'child1', keywords: '[]', parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() },
          { id: 3, name: 'Child2', slug: 'child2', keywords: '[]', parent_id: 1, sort_order: 1, is_active: 1, created_at: new Date(), updated_at: new Date() }
        ],
        rowCount: 2,
        command: 'SELECT'
      });

      await service.reorder(1, [3, 2]);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should throw error when child does not belong to parent', async () => {
      mockDb.query.mockResolvedValue({
        rows: [
          { id: 2, name: 'Child1', slug: 'child1', keywords: '[]', parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date() }
        ],
        rowCount: 1,
        command: 'SELECT'
      });

      await expect(service.reorder(1, [2, 999])).rejects.toThrow(BizError);
    });
  });

  // ==========================================================================
  // UTILITY Operations Tests
  // ==========================================================================

  describe('generateSlug', () => {
    it('should generate URL-safe slug from name', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const slug = await service.generateSlug('Test Category Name');

      expect(slug).toBe('test-category-name');
    });

    it('should remove special characters', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      const slug = await service.generateSlug('Test @ Category # Name!');

      // Slug generation collapses multiple hyphens into single hyphens
      expect(slug).toBe('test-category-name');
    });

    it('should append number if slug exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // First check
          rows: [{
            id: 1, name: 'Test', slug: 'test', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }); // Second check with -1

      const slug = await service.generateSlug('Test');

      expect(slug).toBe('test-1');
    });
  });

  describe('validateHierarchy', () => {
    it('should return false when parent equals child', async () => {
      const result = await service.validateHierarchy(1, 1);

      expect(result).toBe(false);
    });

    it('should return false when circular reference detected', async () => {
      // Setup: 2 is parent of 1
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 2, name: 'Parent', slug: 'parent', keywords: '[]',
          parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
        }],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await service.validateHierarchy(2, 1);

      expect(result).toBe(false);
    });

    it('should return true for valid hierarchy', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          id: 2, name: 'Category', slug: 'category', keywords: '[]',
          parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
        }],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await service.validateHierarchy(2, 1);

      expect(result).toBe(true);
    });
  });

  describe('moveToParent', () => {
    it('should move category to new parent', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById (category)
          rows: [{
            id: 3, name: 'Cat3', slug: 'cat3', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getById (new parent)
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getById (validateHierarchy)
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE' }); // update

      await service.moveToParent(3, 2);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE categories SET parent_id = ? WHERE id = ?',
        [2, 3]
      );
    });

    it('should throw error when category not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });

      await expect(service.moveToParent(999, 1)).rejects.toThrow(CategoryNotFoundError);
    });

    it('should throw error when new parent not found', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, name: 'Cat1', slug: 'cat1', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' }); // new parent

      await expect(service.moveToParent(1, 999)).rejects.toThrow(CategoryNotFoundError);
    });

    it('should throw error on circular reference', async () => {
      mockDb.query
        .mockResolvedValueOnce({ // getById (category)
          rows: [{
            id: 1, name: 'Cat1', slug: 'cat1', keywords: '[]',
            parent_id: null, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getById (new parent)
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        })
        .mockResolvedValueOnce({ // getById (validateHierarchy)
          rows: [{
            id: 2, name: 'Cat2', slug: 'cat2', keywords: '[]',
            parent_id: 1, sort_order: 0, is_active: 1, created_at: new Date(), updated_at: new Date()
          }],
          rowCount: 1,
          command: 'SELECT'
        });

      await expect(service.moveToParent(1, 2)).rejects.toThrow(InvalidHierarchyError);
    });
  });
});
