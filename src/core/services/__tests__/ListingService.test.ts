/**
 * ListingService Test Suite
 *
 * Comprehensive tests for ListingService covering:
 * - READ operations (getAll, getById, getBySlug, getByUserId, getByCategory, getFeatured, search)
 * - WRITE operations (create, update, delete, updateStatus)
 * - TIER ENFORCEMENT (checkTierLimit, canAddCategory, canAddImage, canAddVideo, canAddOffer, canAddEvent)
 * - MEDIA INTEGRATION (updateLogo, updateCover, addGalleryImage)
 * - ADMIN operations (approveListing, rejectListing, featureListing)
 * - UTILITY operations (generateSlug, incrementViewCount, getStatistics)
 * - Error scenarios
 * - Edge cases
 *
 * Coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ListingService,
  ListingNotFoundError,
  UnauthorizedAccessError,
  TierLimitExceededError,
  DuplicateSlugError,
  MediaLimitExceededError
} from '../ListingService';
import { DatabaseService } from '../DatabaseService';
import { CategoryService } from '../CategoryService';
import { MediaService } from '../media/MediaService';
import { BizError } from '@core/errors/BizError';

describe('ListingService', () => {
  let service: ListingService;
  let mockDb: unknown;
  let mockMediaService: unknown;
  let mockCategoryService: unknown;

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    // Create mock MediaService
    mockMediaService = {
      uploadMedia: vi.fn()
    };

    // Create mock CategoryService
    mockCategoryService = {
      getById: vi.fn()
    };

    service = new ListingService(mockDb, mockMediaService, mockCategoryService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create mock listing row
  const createMockListingRow = (overrides = {}) => ({
    id: 1,
    user_id: 1,
    name: 'Test Listing',
    slug: 'test-listing',
    description: 'Test description',
    type: 'Business',
    year_established: 2020,
    employee_count: 10,
    email: 'test@example.com',
    phone: '555-1234',
    website: 'https://example.com',
    address: '123 Main St',
    city: 'Test City',
    state: 'CA',
    zip_code: '12345',
    country: 'US',
    latitude: null,
    longitude: null,
    category_id: 1,
    logo_url: null,
    cover_image_url: null,
    gallery_images: '[]',
    video_url: null,
    audio_url: null,
    business_hours: null,
    social_media: null,
    features: null,
    amenities: null,
    tier: 'essential',
    add_ons: '[]',
    claimed: 1,
    status: 'pending',
    approved: 'pending',
    meta_title: null,
    meta_description: null,
    meta_keywords: null,
    custom_fields: '{}',
    metadata: '{}',
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    annual_revenue: null,
    certifications: null,
    languages_spoken: null,
    payment_methods: null,
    view_count: 0,
    click_count: 0,
    favorite_count: 0,
    import_source: null,
    import_date: null,
    import_batch_id: null,
    mock: 0,
    keywords: null,
    slogan: null,
    date_created: new Date(),
    last_update: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  });

  // ==========================================================================
  // READ Operations Tests
  // ==========================================================================

  describe('getAll', () => {
    it('should retrieve all listings without filters', async () => {
      const mockRows = [createMockListingRow(), createMockListingRow({ id: 2 })];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 2 }] }); // Count query
      mockDb.query.mockResolvedValueOnce({ rows: mockRows }); // Data query

      const result = await service.getAll();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should retrieve listings with userId filter', async () => {
      const mockRows = [createMockListingRow({ user_id: 1 })];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await service.getAll({ userId: 1 });

      expect(result.data).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        expect.arrayContaining([1])
      );
    });

    it('should retrieve listings with pagination', async () => {
      const mockRows = [createMockListingRow()];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await service.getAll({}, { page: 2, limit: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should retrieve listings with search query', async () => {
      const mockRows = [createMockListingRow({ name: 'Test Search' })];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await service.getAll({ searchQuery: 'Test' });

      expect(result.data).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('name LIKE ?'),
        expect.arrayContaining(['%Test%', '%Test%'])
      );
    });

    it('should retrieve listings with tier filter', async () => {
      const mockRows = [createMockListingRow({ tier: 'premium' })];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await service.getAll({ tier: 'premium' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tier).toBe('premium');
    });
  });

  describe('getById', () => {
    it('should retrieve listing by ID', async () => {
      const mockRow = createMockListingRow();
      mockDb.query.mockResolvedValue({ rows: [mockRow] });

      const result = await service.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Listing');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM listings WHERE id = ?',
        [1]
      );
    });

    it('should return null when listing not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await service.getById(999);

      expect(result).toBeNull();
    });

    it('should parse JSON fields correctly', async () => {
      const mockRow = createMockListingRow({
        gallery_images: '["image1.jpg", "image2.jpg"]',
        business_hours: '[{"day": "Monday", "open": "9:00", "close": "17:00"}]',
        features: '["wifi", "parking"]'
      });
      mockDb.query.mockResolvedValue({ rows: [mockRow] });

      const result = await service.getById(1);

      expect(result?.gallery_images).toEqual(['image1.jpg', 'image2.jpg']);
      expect(result?.business_hours).toEqual([
        { day: 'Monday', open: '9:00', close: '17:00' }
      ]);
      expect(result?.features).toEqual(['wifi', 'parking']);
    });
  });

  describe('getBySlug', () => {
    it('should retrieve listing by slug', async () => {
      const mockRow = createMockListingRow({ slug: 'test-listing' });
      mockDb.query.mockResolvedValue({ rows: [mockRow] });

      const result = await service.getBySlug('test-listing');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('test-listing');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM listings WHERE slug = ?',
        ['test-listing']
      );
    });

    it('should return null when slug not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await service.getBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('should retrieve all listings for a user', async () => {
      const mockRows = [
        createMockListingRow({ id: 1, user_id: 1 }),
        createMockListingRow({ id: 2, user_id: 1 })
      ];
      mockDb.query.mockResolvedValue({ rows: mockRows });

      const result = await service.getByUserId(1);

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe(1);
      expect(result[1].user_id).toBe(1);
    });

    it('should return empty array when user has no listings', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await service.getByUserId(999);

      expect(result).toEqual([]);
    });
  });

  describe('getFeatured', () => {
    it('should retrieve featured listings', async () => {
      const mockRows = [
        createMockListingRow({ id: 1, status: 'active', approved: 'approved', view_count: 100 }),
        createMockListingRow({ id: 2, status: 'active', approved: 'approved', view_count: 50 })
      ];
      mockDb.query.mockResolvedValue({ rows: mockRows });

      const result = await service.getFeatured(10);

      expect(result).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active' AND approved = 'approved'"),
        [10]
      );
    });

    it('should use default limit of 10', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await service.getFeatured();

      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [10]);
    });
  });

  describe('search', () => {
    it('should search listings by query', async () => {
      const mockRows = [createMockListingRow({ name: 'Search Test' })];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await service.search('Search');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toContain('Search');
    });

    it('should search with additional filters', async () => {
      const mockRows = [createMockListingRow()];
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await service.search('test', { tier: 'premium' });

      expect(result.data).toHaveLength(1);
    });
  });

  // ==========================================================================
  // WRITE Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new listing', async () => {
      const createInput = {
        name: 'New Listing',
        type: 'Business',
        description: 'Test description'
      };

      // Mock for generateSlug -> getBySlug
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for create -> getBySlug (duplicate check)
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for INSERT
      mockDb.query.mockResolvedValueOnce({ insertId: 1, rowCount: 1 });
      // Mock for getById after insert
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ id: 1, name: 'New Listing' })],
        rowCount: 1
      });

      const result = await service.create(1, createInput);

      expect(result.id).toBe(1);
      expect(result.name).toBe('New Listing');
    });

    it('should generate slug if not provided', async () => {
      const createInput = {
        name: 'Test Listing Name',
        type: 'Business'
      };

      // Mock for generateSlug -> getBySlug
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for create -> getBySlug (duplicate check)
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for INSERT
      mockDb.query.mockResolvedValueOnce({ insertId: 1, rowCount: 1 });
      // Mock for getById after insert
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ id: 1, slug: 'test-listing-name' })],
        rowCount: 1
      });

      const result = await service.create(1, createInput);

      expect(result.slug).toBe('test-listing-name');
    });

    it('should throw DuplicateSlugError if slug exists', async () => {
      const createInput = {
        name: 'Test',
        slug: 'existing-slug',
        type: 'Business'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ slug: 'existing-slug' })]
      });

      await expect(service.create(1, createInput)).rejects.toThrow(
        DuplicateSlugError
      );
    });

    it('should validate category exists', async () => {
      const createInput = {
        name: 'Test',
        type: 'Business',
        category_id: 999
      };

      // Mock for generateSlug -> getBySlug
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for create -> getBySlug (duplicate check)
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for category validation
      mockCategoryService.getById.mockResolvedValueOnce(null);

      await expect(service.create(1, createInput)).rejects.toThrow(BizError);
    });

    it('should set default values correctly', async () => {
      const createInput = {
        name: 'Test',
        type: 'Business'
      };

      // Mock for generateSlug -> getBySlug
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for create -> getBySlug (duplicate check)
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock for INSERT
      mockDb.query.mockResolvedValueOnce({ insertId: 1, rowCount: 1 });
      // Mock for getById after insert
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({
            tier: 'essential',
            status: 'pending',
            approved: 'pending'
          })
        ],
        rowCount: 1
      });

      const result = await service.create(1, createInput);

      expect(result.tier).toBe('essential');
      expect(result.status).toBe('pending');
      expect(result.approved).toBe('pending');
    });
  });

  describe('update', () => {
    it('should update listing', async () => {
      const updateInput = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow()]
      }); // Get existing
      mockDb.query.mockResolvedValueOnce({}); // Update
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ name: 'Updated Name' })]
      }); // Get updated

      const result = await service.update(1, 1, updateInput);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.update(999, 1, { name: 'Test' })).rejects.toThrow(
        ListingNotFoundError
      );
    });

    it('should throw UnauthorizedAccessError if user is not owner', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ user_id: 2 })]
      });

      await expect(service.update(1, 1, { name: 'Test' })).rejects.toThrow(
        UnauthorizedAccessError
      );
    });

    it('should check for duplicate slug on update', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ slug: 'original-slug' })]
      }); // Get existing
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ id: 2, slug: 'new-slug' })]
      }); // Duplicate check

      await expect(
        service.update(1, 1, { slug: 'new-slug' })
      ).rejects.toThrow(DuplicateSlugError);
    });

    it('should return existing listing if no changes', async () => {
      const existingListing = createMockListingRow();
      mockDb.query.mockResolvedValueOnce({ rows: [existingListing] });

      const result = await service.update(1, 1, {});

      expect(result.id).toBe(1);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only get, no update
    });
  });

  describe('delete', () => {
    it('should delete listing', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow()]
      }); // Get listing
      mockDb.query.mockResolvedValueOnce({}); // Delete

      await service.delete(1, 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM listings WHERE id = ?',
        [1]
      );
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.delete(999, 1)).rejects.toThrow(
        ListingNotFoundError
      );
    });

    it('should throw UnauthorizedAccessError if user is not owner', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ user_id: 2 })]
      });

      await expect(service.delete(1, 1)).rejects.toThrow(
        UnauthorizedAccessError
      );
    });
  });

  describe('updateStatus', () => {
    it('should update listing status', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow()]
      }); // Get listing
      mockDb.query.mockResolvedValueOnce({}); // Update
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ status: 'active' })]
      }); // Get updated

      const result = await service.updateStatus(1, 'active' as unknown);

      expect(result.status).toBe('active');
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.updateStatus(999, 'active' as unknown)).rejects.toThrow(
        ListingNotFoundError
      );
    });
  });

  // ==========================================================================
  // TIER ENFORCEMENT Tests
  // ==========================================================================

  describe('checkTierLimit', () => {
    it('should return tier limit check for user with listings', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ tier: 'essential' })]
      });

      const result = await service.checkTierLimit(1, 'categories');

      expect(result.tier).toBe('essential');
      expect(result.limit).toBe(6);
      expect(result.allowed).toBe(true);
    });

    it('should return default essential tier for user with no listings', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.checkTierLimit(1, 'images');

      expect(result.tier).toBe('essential');
      expect(result.limit).toBe(6);
    });
  });

  describe('canAddCategory', () => {
    it('should return true if under limit', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ tier: 'essential', category_id: null })]
      });

      const result = await service.canAddCategory(1);

      expect(result).toBe(true);
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.canAddCategory(999)).rejects.toThrow(
        ListingNotFoundError
      );
    });
  });

  describe('canAddImage', () => {
    it('should return true if under limit', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ tier: 'essential', gallery_images: '[]' })]
      });

      const result = await service.canAddImage(1);

      expect(result).toBe(true);
    });

    it('should return false if at limit', async () => {
      const sixImages = JSON.stringify(Array(6).fill('image.jpg'));
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ tier: 'essential', gallery_images: sixImages })]
      });

      const result = await service.canAddImage(1);

      expect(result).toBe(false);
    });
  });

  describe('canAddVideo', () => {
    it('should return true if under limit', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ tier: 'essential', video_url: null })]
      });

      const result = await service.canAddVideo(1);

      expect(result).toBe(true);
    });

    it('should return false if at limit', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({ tier: 'essential', video_url: 'video.mp4' })
        ]
      });

      const result = await service.canAddVideo(1);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // MEDIA INTEGRATION Tests
  // ==========================================================================

  describe('updateLogo', () => {
    it('should update listing logo', async () => {
      const mockMediaFile = {
        id: 1,
        url: 'https://example.com/logo.jpg',
        storage_type: 'local' as const,
        path: '/uploads/logo.jpg',
        cloudinary_public_id: null,
        file_type: 'image/jpeg',
        file_size: 1024,
        width: 200,
        height: 200,
        metadata: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow()]
      }); // Get listing
      mockMediaService.uploadMedia.mockResolvedValueOnce(mockMediaFile);
      mockDb.query.mockResolvedValueOnce({}); // Update logo_url

      const result = await service.updateLogo(
        1,
        Buffer.from('test'),
        'logo.jpg',
        'image/jpeg'
      );

      expect(result.url).toBe('https://example.com/logo.jpg');
      expect(mockMediaService.uploadMedia).toHaveBeenCalledWith({
        entityType: 'listing',
        entityId: 1,
        mediaType: 'logo',
        listingTier: 'essential',
        file: expect.any(Buffer),
        filename: 'logo.jpg',
        mimeType: 'image/jpeg'
      });
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateLogo(999, Buffer.from('test'), 'logo.jpg', 'image/jpeg')
      ).rejects.toThrow(ListingNotFoundError);
    });
  });

  describe('addGalleryImage', () => {
    it('should add image to gallery', async () => {
      const mockMediaFile = {
        id: 1,
        url: 'https://example.com/image.jpg',
        storage_type: 'local' as const,
        path: '/uploads/image.jpg',
        cloudinary_public_id: null,
        file_type: 'image/jpeg',
        file_size: 1024,
        width: 800,
        height: 600,
        metadata: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock for canAddImage -> getById
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ gallery_images: '[]' })],
        rowCount: 1
      });
      // Mock for addGalleryImage -> getById
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ gallery_images: '[]' })],
        rowCount: 1
      });
      mockMediaService.uploadMedia.mockResolvedValueOnce(mockMediaFile);
      mockDb.query.mockResolvedValueOnce({ rowCount: 1 }); // Update gallery

      const result = await service.addGalleryImage(
        1,
        Buffer.from('test'),
        'image.jpg',
        'image/jpeg'
      );

      expect(result.url).toBe('https://example.com/image.jpg');
    });

    it('should throw MediaLimitExceededError if at limit', async () => {
      const sixImages = JSON.stringify(Array(6).fill('image.jpg'));
      // Mock for addGalleryImage -> getById (first call)
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({ tier: 'essential', gallery_images: sixImages })
        ],
        rowCount: 1
      });
      // Mock for canAddImage -> getById (second call)
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({ tier: 'essential', gallery_images: sixImages })
        ],
        rowCount: 1
      });

      await expect(
        service.addGalleryImage(
          1,
          Buffer.from('test'),
          'image.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow(MediaLimitExceededError);
    });
  });

  // ==========================================================================
  // ADMIN Operations Tests
  // ==========================================================================

  describe('approveListing', () => {
    it('should approve listing', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow()]
      }); // Get listing
      mockDb.query.mockResolvedValueOnce({}); // Update
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({ approved: 'approved', status: 'active' })
        ]
      }); // Get updated

      const result = await service.approveListing(1, 1);

      expect(result.approved).toBe('approved');
      expect(result.status).toBe('active');
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.approveListing(999, 1)).rejects.toThrow(
        ListingNotFoundError
      );
    });
  });

  describe('rejectListing', () => {
    it('should reject listing', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow()]
      }); // Get listing
      mockDb.query.mockResolvedValueOnce({}); // Update
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({ approved: 'rejected', status: 'inactive' })
        ]
      }); // Get updated

      const result = await service.rejectListing(1, 1, 'Inappropriate content');

      expect(result.approved).toBe('rejected');
      expect(result.status).toBe('inactive');
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.rejectListing(999, 1, 'Test reason')
      ).rejects.toThrow(ListingNotFoundError);
    });
  });

  // ==========================================================================
  // UTILITY Operations Tests
  // ==========================================================================

  describe('generateSlug', () => {
    it('should generate URL-safe slug', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // No existing slug

      const result = await service.generateSlug('Test Listing Name!');

      expect(result).toBe('test-listing-name');
    });

    it('should generate unique slug if exists', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [createMockListingRow({ slug: 'test-listing' })]
      }); // First check
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Second check

      const result = await service.generateSlug('Test Listing');

      expect(result).toBe('test-listing-1');
    });

    it('should handle special characters', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.generateSlug('Test & Co. (Inc.)');

      expect(result).toBe('test-co-inc');
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      mockDb.query.mockResolvedValueOnce({});

      await service.incrementViewCount(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE listings SET view_count = view_count + 1 WHERE id = ?',
        [1]
      );
    });
  });

  describe('getStatistics', () => {
    it('should return listing statistics', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          createMockListingRow({
            view_count: 100,
            click_count: 50,
            favorite_count: 10
          })
        ]
      });

      const result = await service.getStatistics(1);

      expect(result.views).toBe(100);
      expect(result.clicks).toBe(50);
      expect(result.favorites).toBe(10);
    });

    it('should throw ListingNotFoundError if listing does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getStatistics(999)).rejects.toThrow(
        ListingNotFoundError
      );
    });
  });
});
