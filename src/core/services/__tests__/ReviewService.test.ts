/**
 * ReviewService Test Suite
 *
 * Comprehensive tests for ReviewService covering:
 * - READ operations (getAll, getById, getByListingId, getByUserId, getPendingReviews)
 * - WRITE operations (create, update, delete, addOwnerResponse)
 * - MODERATION operations (approve, reject, flag)
 * - HELPFULNESS operations (markHelpful, getHelpfulnessStats)
 * - STATISTICS operations (calculateAverageRating, getRatingDistribution, updateListingRating)
 * - VALIDATION operations (canUserReview, hasUserReviewed)
 * - Error scenarios
 * - Edge cases
 *
 * Coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ReviewService,
  ReviewNotFoundError,
  DuplicateReviewError,
  UnauthorizedReviewError,
  InvalidRatingError,
  ReviewAlreadyModeratedError,
  ReviewStatus
} from '../ReviewService';
import { DatabaseService } from '../DatabaseService';
import { ListingService } from '../ListingService';
import { BizError } from '@core/errors/BizError';

describe('ReviewService', () => {
  let service: ReviewService;
  let mockDb: unknown;
  let mockListingService: unknown;

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    // Create mock ListingService
    mockListingService = {
      getById: vi.fn()
    };

    service = new ReviewService(mockDb, mockListingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // READ Operations Tests
  // ==========================================================================

  describe('getAll', () => {
    it('should retrieve all reviews without filters', async () => {
      const mockRows = [
        {
          id: 1,
          listing_id: 1,
          user_id: 1,
          rating: 5,
          title: 'Great place!',
          review_text: 'Really enjoyed my visit',
          images: null,
          status: 'approved',
          moderation_reason: null,
          moderated_by: null,
          moderated_at: null,
          is_verified_purchase: 0,
          helpful_count: 0,
          not_helpful_count: 0,
          owner_response: null,
          owner_response_date: null,
          is_mock: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 }) // count query
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 }); // data query

      const result = await service.getAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should retrieve reviews with listingId filter', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAll({ listingId: 1 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('listing_id = ?'),
        expect.arrayContaining([1])
      );
    });

    it('should retrieve reviews with rating filters', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAll({ minRating: 4, maxRating: 5 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('rating >='),
        expect.any(Array)
      );
    });

    it('should retrieve reviews with owner response filter', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAll({ hasOwnerResponse: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_response IS NOT NULL'),
        expect.any(Array)
      );
    });
  });

  describe('getById', () => {
    it('should retrieve review by ID', async () => {
      const mockRow = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        title: 'Great!',
        review_text: 'Excellent service',
        images: null,
        status: 'approved',
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: 1,
        helpful_count: 5,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await service.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.rating).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM reviews WHERE id = ?',
        [1]
      );
    });

    it('should return null if review not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getByListingId', () => {
    it('should retrieve approved reviews for a listing', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getByListingId(1);

      // Verify it filters by listing_id and approved status
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('listing_id = ?'),
        expect.arrayContaining([1, 'approved'])
      );
    });
  });

  describe('getByUserId', () => {
    it('should retrieve all reviews by a user', async () => {
      const mockRows = [
        {
          id: 1,
          user_id: 1,
          listing_id: 1,
          rating: 5,
          title: null,
          review_text: null,
          images: null,
          status: 'approved',
          moderation_reason: null,
          moderated_by: null,
          moderated_at: null,
          is_verified_purchase: 0,
          helpful_count: 0,
          not_helpful_count: 0,
          owner_response: null,
          owner_response_date: null,
          is_mock: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1 });

      const result = await service.getByUserId(1);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        [1]
      );
    });
  });

  describe('getPendingReviews', () => {
    it('should retrieve all pending reviews', async () => {
      const mockRows = [
        {
          id: 1,
          listing_id: 1,
          user_id: 1,
          rating: 4,
          title: null,
          review_text: null,
          images: null,
          status: 'pending',
          moderation_reason: null,
          moderated_by: null,
          moderated_at: null,
          is_verified_purchase: 0,
          helpful_count: 0,
          not_helpful_count: 0,
          owner_response: null,
          owner_response_date: null,
          is_mock: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1 });

      const result = await service.getPendingReviews();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });

  // ==========================================================================
  // WRITE Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new review', async () => {
      const mockListing = { id: 1, user_id: 2, name: 'Test Business' };
      mockListingService.getById.mockResolvedValue(mockListing);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 }) // hasUserReviewed check
        .mockResolvedValueOnce({ insertId: 1, rowCount: 1 }) // insert
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              listing_id: 1,
              user_id: 1,
              rating: 5,
              title: 'Great!',
              review_text: 'Excellent',
              images: null,
              status: 'pending',
              moderation_reason: null,
              moderated_by: null,
              moderated_at: null,
              is_verified_purchase: 0,
              helpful_count: 0,
              not_helpful_count: 0,
              owner_response: null,
              owner_response_date: null,
              is_mock: 0,
              created_at: new Date(),
              updated_at: new Date()
            }
          ],
          rowCount: 1
        }); // getById

      const result = await service.create(1, 1, {
        rating: 5,
        title: 'Great!',
        review_text: 'Excellent'
      });

      expect(result.id).toBe(1);
      expect(result.status).toBe('pending');
      expect(mockListingService.getById).toHaveBeenCalledWith(1);
    });

    it('should throw InvalidRatingError for rating < 1', async () => {
      const mockListing = { id: 1, user_id: 2 };
      mockListingService.getById.mockResolvedValue(mockListing);

      await expect(
        service.create(1, 1, { rating: 0 })
      ).rejects.toThrow(InvalidRatingError);
    });

    it('should throw InvalidRatingError for rating > 5', async () => {
      const mockListing = { id: 1, user_id: 2 };
      mockListingService.getById.mockResolvedValue(mockListing);

      await expect(
        service.create(1, 1, { rating: 6 })
      ).rejects.toThrow(InvalidRatingError);
    });

    it('should throw DuplicateReviewError if user already reviewed', async () => {
      const mockListing = { id: 1, user_id: 2 };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValue({ rows: [{ count: 1 }], rowCount: 1 });

      await expect(
        service.create(1, 1, { rating: 5 })
      ).rejects.toThrow(DuplicateReviewError);
    });

    it('should throw BizError if listing not found', async () => {
      mockListingService.getById.mockResolvedValue(null);

      await expect(
        service.create(999, 1, { rating: 5 })
      ).rejects.toThrow(BizError);
    });
  });

  describe('update', () => {
    it('should update a review', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 4,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockReview], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // update
        .mockResolvedValueOnce({
          rows: [{ ...mockReview, rating: 5, status: 'pending' }],
          rowCount: 1
        }) // getById after update
        .mockResolvedValueOnce({ rows: [{ average: 5 }], rowCount: 1 }); // calculateAverageRating

      const result = await service.update(1, 1, { rating: 5 });

      expect(result.rating).toBe(5);
      expect(result.status).toBe('pending'); // Reset to pending after edit
    });

    it('should throw UnauthorizedReviewError if user is not owner', async () => {
      const mockReview = {
        id: 1,
        user_id: 2,
        listing_id: 1,
        rating: 4,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });

      await expect(
        service.update(1, 1, { rating: 5 })
      ).rejects.toThrow(UnauthorizedReviewError);
    });

    it('should throw ReviewNotFoundError if review does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        service.update(999, 1, { rating: 5 })
      ).rejects.toThrow(ReviewNotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete a review', async () => {
      const mockReview = {
        id: 1,
        user_id: 1,
        listing_id: 1,
        rating: 4,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockReview], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // delete
        .mockResolvedValueOnce({ rows: [{ average: 0 }], rowCount: 1 }); // calculateAverageRating

      await service.delete(1, 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM reviews WHERE id = ?',
        [1]
      );
    });

    it('should throw UnauthorizedReviewError if user is not owner', async () => {
      const mockReview = {
        id: 1,
        user_id: 2,
        listing_id: 1,
        rating: 4,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });

      await expect(service.delete(1, 1)).rejects.toThrow(UnauthorizedReviewError);
    });
  });

  describe('addOwnerResponse', () => {
    it('should add owner response to a review', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 2,
        rating: 5,
        owner_response: null,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockListing = { id: 1, user_id: 1, name: 'Test Business' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockReview], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // update
        .mockResolvedValueOnce({
          rows: [{ ...mockReview, owner_response: 'Thank you!' }],
          rowCount: 1
        }); // getById after update

      mockListingService.getById.mockResolvedValue(mockListing);

      const result = await service.addOwnerResponse(1, 1, 'Thank you!');

      expect(result.owner_response).toBe('Thank you!');
    });

    it('should throw error if response already exists', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 2,
        rating: 5,
        owner_response: 'Existing response',
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response_date: new Date(),
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });
      mockListingService.getById.mockResolvedValue({ id: 1, user_id: 1 });

      await expect(
        service.addOwnerResponse(1, 1, 'New response')
      ).rejects.toThrow(BizError);
    });
  });

  // ==========================================================================
  // MODERATION Operations Tests
  // ==========================================================================

  describe('approve', () => {
    it('should approve a pending review', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        status: 'pending',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockReview], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // update
        .mockResolvedValueOnce({
          rows: [{ ...mockReview, status: 'approved' }],
          rowCount: 1
        }) // getById after update
        .mockResolvedValueOnce({ rows: [{ average: 5 }], rowCount: 1 }); // calculateAverageRating

      const result = await service.approve(1, 10);

      expect(result.status).toBe('approved');
    });

    it('should throw ReviewAlreadyModeratedError for approved review', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });

      await expect(service.approve(1, 10)).rejects.toThrow(
        ReviewAlreadyModeratedError
      );
    });
  });

  describe('reject', () => {
    it('should reject a pending review', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        status: 'pending',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockReview], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // update
        .mockResolvedValueOnce({
          rows: [{ ...mockReview, status: 'rejected' }],
          rowCount: 1
        }) // getById after update
        .mockResolvedValueOnce({ rows: [{ average: 0 }], rowCount: 1 }); // calculateAverageRating

      const result = await service.reject(1, 10, 'Spam content');

      expect(result.status).toBe('rejected');
    });
  });

  describe('flag', () => {
    it('should flag a review for moderation', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        helpful_count: 0,
        not_helpful_count: 0,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockReview], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }); // update

      await service.flag(1, 2, 'Inappropriate content');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'flagged'"),
        expect.arrayContaining(['Inappropriate content', 1])
      );
    });
  });

  // ==========================================================================
  // HELPFULNESS Operations Tests
  // ==========================================================================

  describe('markHelpful', () => {
    it('should mark review as helpful', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        helpful_count: 0,
        not_helpful_count: 0,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });

      mockDb.transaction.mockImplementation(async (callback: (db: unknown) => Promise<unknown>) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // check existing
            .mockResolvedValueOnce({ insertId: 1, rowCount: 1 }) // insert
            .mockResolvedValueOnce({ rowCount: 1 }) // update count
        };
        return callback(mockClient);
      });

      await service.markHelpful(1, 2, true);

      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should update existing helpfulness vote', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        helpful_count: 1,
        not_helpful_count: 0,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });

      mockDb.transaction.mockImplementation(async (callback: (db: unknown) => Promise<unknown>) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({
              rows: [{ id: 1, is_helpful: 1 }],
              rowCount: 1
            }) // check existing
            .mockResolvedValueOnce({ rowCount: 1 }) // update vote
            .mockResolvedValueOnce({ rowCount: 1 }) // update counts
        };
        return callback(mockClient);
      });

      await service.markHelpful(1, 2, false);

      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('getHelpfulnessStats', () => {
    it('should return helpfulness statistics', async () => {
      const mockReview = {
        id: 1,
        listing_id: 1,
        user_id: 1,
        rating: 5,
        helpful_count: 10,
        not_helpful_count: 2,
        status: 'approved',
        title: null,
        review_text: null,
        images: null,
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
        is_verified_purchase: false,
        owner_response: null,
        owner_response_date: null,
        is_mock: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockReview], rowCount: 1 });

      const result = await service.getHelpfulnessStats(1);

      expect(result.helpful).toBe(10);
      expect(result.notHelpful).toBe(2);
    });
  });

  // ==========================================================================
  // STATISTICS Operations Tests
  // ==========================================================================

  describe('calculateAverageRating', () => {
    it('should calculate average rating', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ average: 4.5 }], rowCount: 1 });

      const result = await service.calculateAverageRating(1);

      expect(result).toBe(4.5);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AVG(rating)'),
        [1]
      );
    });

    it('should return 0 if no reviews', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ average: null }], rowCount: 1 });

      const result = await service.calculateAverageRating(1);

      expect(result).toBe(0);
    });
  });

  describe('getRatingDistribution', () => {
    it('should return rating distribution', async () => {
      const mockRows = [
        { rating: 5, count: 10 },
        { rating: 4, count: 5 },
        { rating: 3, count: 2 },
        { rating: 2, count: 1 },
        { rating: 1, count: 0 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 5 });

      const result = await service.getRatingDistribution(1);

      expect(result[5]).toBe(10);
      expect(result[4]).toBe(5);
      expect(result[3]).toBe(2);
      expect(result[2]).toBe(1);
      expect(result[1]).toBe(0);
      expect(result.total).toBe(18);
      // (5*10 + 4*5 + 3*2 + 2*1 + 1*0) / 18 = 78 / 18 = 4.333...
      expect(result.average).toBeCloseTo(4.33, 2);
    });

    it('should return zeros if no reviews', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await service.getRatingDistribution(1);

      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(0);
      expect(result[4]).toBe(0);
      expect(result[5]).toBe(0);
      expect(result.total).toBe(0);
      expect(result.average).toBe(0);
    });
  });

  describe('updateListingRating', () => {
    it('should update listing rating', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ average: 4.5 }], rowCount: 1 });

      await service.updateListingRating(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AVG(rating)'),
        [1]
      );
    });
  });

  // ==========================================================================
  // VALIDATION Operations Tests
  // ==========================================================================

  describe('canUserReview', () => {
    it('should return true if user can review', async () => {
      const mockListing = { id: 1, user_id: 2 };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValue({ rows: [{ count: 0 }], rowCount: 1 });

      const result = await service.canUserReview(1, 1);

      expect(result).toBe(true);
    });

    it('should return false if user is listing owner', async () => {
      const mockListing = { id: 1, user_id: 1 };
      mockListingService.getById.mockResolvedValue(mockListing);

      const result = await service.canUserReview(1, 1);

      expect(result).toBe(false);
    });

    it('should return false if user already reviewed', async () => {
      const mockListing = { id: 1, user_id: 2 };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValue({ rows: [{ count: 1 }], rowCount: 1 });

      const result = await service.canUserReview(1, 1);

      expect(result).toBe(false);
    });

    it('should return false if listing not found', async () => {
      mockListingService.getById.mockResolvedValue(null);

      const result = await service.canUserReview(1, 999);

      expect(result).toBe(false);
    });
  });

  describe('hasUserReviewed', () => {
    it('should return true if user has reviewed', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: 1 }], rowCount: 1 });

      const result = await service.hasUserReviewed(1, 1);

      expect(result).toBe(true);
    });

    it('should return false if user has not reviewed', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: 0 }], rowCount: 1 });

      const result = await service.hasUserReviewed(1, 1);

      expect(result).toBe(false);
    });
  });
});
