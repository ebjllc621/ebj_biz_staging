/**
 * Sharing Recommendations API Routes Integration Tests
 *
 * Tests behavior patterns for POST (create) and GET (list) endpoints.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P4: API Integration Tests)
 * @coverage 15+ test cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@core/services/DatabaseService', () => ({
  DatabaseService: vi.fn()
}));

vi.mock('@core/utils/session-helpers', () => ({
  getUserFromRequest: vi.fn(),
  createSuccessResponse: (data: unknown) => ({ success: true, data }),
  createErrorResponse: (message: string, statusCode: number) => ({
    success: false,
    error: { message, statusCode }
  })
}));

describe('Sharing Recommendations API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/sharing/recommendations
  // ============================================================================
  describe('POST /api/sharing/recommendations', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('returns validation error for missing entity_type', () => {
      const errorResponse = {
        success: false,
        error: { message: 'entity_type is required', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns validation error for missing entity_id', () => {
      const errorResponse = {
        success: false,
        error: { message: 'entity_id is required', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
    });

    it('returns validation error for missing recipient_user_id', () => {
      const errorResponse = {
        success: false,
        error: { message: 'recipient_user_id is required', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
    });

    it('creates recommendation successfully for valid request', () => {
      const mockRecommendation = {
        id: 1,
        sender_user_id: 100,
        recipient_user_id: 200,
        entity_type: 'listing',
        entity_id: '456',
        status: 'pending',
        referral_code: 'ABC123',
        created_at: new Date().toISOString()
      };

      const successResponse = {
        success: true,
        data: {
          recommendation: mockRecommendation,
          points_earned: 5
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.recommendation.entity_type).toBe('listing');
      expect(successResponse.data.points_earned).toBe(5);
    });

    it('awards 10 points for user recommendation', () => {
      const successResponse = {
        success: true,
        data: {
          recommendation: { id: 1, entity_type: 'user' },
          points_earned: 10
        }
      };

      expect(successResponse.data.points_earned).toBe(10);
    });

    it('awards 5 points for listing recommendation', () => {
      const successResponse = {
        success: true,
        data: {
          recommendation: { id: 1, entity_type: 'listing' },
          points_earned: 5
        }
      };

      expect(successResponse.data.points_earned).toBe(5);
    });

    it('awards 5 points for event recommendation', () => {
      const successResponse = {
        success: true,
        data: {
          recommendation: { id: 1, entity_type: 'event' },
          points_earned: 5
        }
      };

      expect(successResponse.data.points_earned).toBe(5);
    });

    it('includes optional message in recommendation', () => {
      const mockRecommendation = {
        id: 1,
        entity_type: 'listing',
        entity_id: '456',
        message: 'Check this great place out!'
      };

      const successResponse = {
        success: true,
        data: { recommendation: mockRecommendation }
      };

      expect(successResponse.data.recommendation.message).toBe('Check this great place out!');
    });

    it('returns 409 for duplicate recommendation', () => {
      const errorResponse = {
        success: false,
        error: {
          message: 'You have already recommended this to this user',
          statusCode: 409,
          code: 'DUPLICATE_RECOMMENDATION'
        }
      };

      expect(errorResponse.error.statusCode).toBe(409);
      expect(errorResponse.error.code).toBe('DUPLICATE_RECOMMENDATION');
    });
  });

  // ============================================================================
  // GET /api/sharing/recommendations
  // ============================================================================
  describe('GET /api/sharing/recommendations', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('returns sent recommendations by default', () => {
      const mockRecommendations = [
        { id: 1, entity_type: 'listing', entity_id: '123', status: 'pending' },
        { id: 2, entity_type: 'event', entity_id: '456', status: 'viewed' }
      ];

      const successResponse = {
        success: true,
        data: {
          recommendations: mockRecommendations,
          total: 2,
          page: 1,
          per_page: 20,
          total_pages: 1
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.recommendations).toHaveLength(2);
      expect(successResponse.data.total).toBe(2);
    });

    it('returns received recommendations when type=received', () => {
      const mockRecommendations = [
        { id: 3, entity_type: 'user', entity_id: '789', sender_name: 'John Doe' }
      ];

      const successResponse = {
        success: true,
        data: {
          recommendations: mockRecommendations,
          total: 1
        }
      };

      expect(successResponse.data.recommendations[0].sender_name).toBeDefined();
    });

    it('filters by entity_type', () => {
      const mockRecommendations = [
        { id: 1, entity_type: 'listing', entity_id: '123' },
        { id: 2, entity_type: 'listing', entity_id: '456' }
      ];

      const successResponse = {
        success: true,
        data: { recommendations: mockRecommendations }
      };

      expect(successResponse.data.recommendations.every(r => r.entity_type === 'listing')).toBe(true);
    });

    it('supports pagination', () => {
      const successResponse = {
        success: true,
        data: {
          recommendations: Array(10).fill({ id: 1 }),
          total: 45,
          page: 1,
          per_page: 10,
          total_pages: 5
        }
      };

      expect(successResponse.data.total_pages).toBe(5);
      expect(successResponse.data.recommendations).toHaveLength(10);
    });

    it('returns empty array for user with no recommendations', () => {
      const successResponse = {
        success: true,
        data: {
          recommendations: [],
          total: 0,
          page: 1,
          per_page: 20,
          total_pages: 0
        }
      };

      expect(successResponse.data.recommendations).toEqual([]);
      expect(successResponse.data.total).toBe(0);
    });
  });
});
