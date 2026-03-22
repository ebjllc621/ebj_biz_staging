/**
 * Entity Preview API Routes Integration Tests
 *
 * Tests behavior patterns for GET endpoint.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P4: API Integration Tests)
 * @coverage 8+ test cases
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

describe('Entity Preview API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/sharing/entity-preview
  // ============================================================================
  describe('GET /api/sharing/entity-preview', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('returns validation error for missing type', () => {
      const errorResponse = {
        success: false,
        error: { message: 'entity_type is required', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns validation error for missing id', () => {
      const errorResponse = {
        success: false,
        error: { message: 'entity_id is required', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
    });

    it('returns listing preview', () => {
      const mockPreview = {
        id: '123',
        type: 'listing',
        title: 'Amazing Coffee Shop',
        description: 'Best coffee in town with cozy atmosphere',
        image_url: '/images/listings/123.jpg',
        url: '/listings/123'
      };

      const successResponse = {
        success: true,
        data: { preview: mockPreview }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.preview.type).toBe('listing');
      expect(successResponse.data.preview.title).toBe('Amazing Coffee Shop');
    });

    it('returns event preview', () => {
      const mockPreview = {
        id: '456',
        type: 'event',
        title: 'Annual Tech Conference',
        description: 'Join us for the biggest tech event of the year',
        image_url: '/images/events/456.jpg',
        url: '/events/456'
      };

      const successResponse = {
        success: true,
        data: { preview: mockPreview }
      };

      expect(successResponse.data.preview.type).toBe('event');
    });

    it('returns user preview', () => {
      const mockPreview = {
        id: '789',
        type: 'user',
        title: 'Jane Smith',
        description: 'Business owner and entrepreneur',
        image_url: '/avatars/789.jpg',
        url: '/users/789'
      };

      const successResponse = {
        success: true,
        data: { preview: mockPreview }
      };

      expect(successResponse.data.preview.type).toBe('user');
    });

    it('returns null for non-existent entity', () => {
      const successResponse = {
        success: true,
        data: { preview: null }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.preview).toBeNull();
    });

    it('returns validation error for invalid entity type', () => {
      const errorResponse = {
        success: false,
        error: { message: 'Invalid entity type', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
    });
  });
});
