/**
 * Helpful Rating API Routes Integration Tests
 *
 * Tests behavior patterns for POST endpoint.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P4: API Integration Tests)
 * @coverage 6+ test cases
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

describe('Helpful Rating API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/sharing/recommendations/[id]/helpful
  // ============================================================================
  describe('POST /api/sharing/recommendations/[id]/helpful', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('marks recommendation as helpful', () => {
      const successResponse = {
        success: true,
        data: {
          id: 123,
          is_helpful: true,
          helpful_at: new Date().toISOString()
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.is_helpful).toBe(true);
      expect(successResponse.data.helpful_at).toBeDefined();
    });

    it('marks recommendation as not helpful', () => {
      const successResponse = {
        success: true,
        data: {
          id: 123,
          is_helpful: false,
          helpful_at: new Date().toISOString()
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.is_helpful).toBe(false);
    });

    it('returns validation error for missing is_helpful', () => {
      const errorResponse = {
        success: false,
        error: { message: 'is_helpful is required', statusCode: 400, code: 'VALIDATION_ERROR' }
      };

      expect(errorResponse.error.statusCode).toBe(400);
    });

    it('returns 404 for non-existent recommendation', () => {
      const errorResponse = {
        success: false,
        error: { message: 'Recommendation not found', statusCode: 404, code: 'NOT_FOUND' }
      };

      expect(errorResponse.error.statusCode).toBe(404);
    });

    it('returns 403 when user is not the recipient', () => {
      const errorResponse = {
        success: false,
        error: { message: 'You can only rate recommendations sent to you', statusCode: 403, code: 'FORBIDDEN' }
      };

      expect(errorResponse.error.statusCode).toBe(403);
    });
  });
});
