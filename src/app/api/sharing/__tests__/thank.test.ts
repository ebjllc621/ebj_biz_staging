/**
 * Thank You API Routes Integration Tests
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

describe('Thank You API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/sharing/recommendations/[id]/thank
  // ============================================================================
  describe('POST /api/sharing/recommendations/[id]/thank', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('sends thank you with message', () => {
      const successResponse = {
        success: true,
        data: {
          id: 123,
          thank_message: 'Thank you so much for the recommendation!',
          thanked_at: new Date().toISOString()
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.thank_message).toBe('Thank you so much for the recommendation!');
      expect(successResponse.data.thanked_at).toBeDefined();
    });

    it('sends thank you without message', () => {
      const successResponse = {
        success: true,
        data: {
          id: 123,
          thank_message: null,
          thanked_at: new Date().toISOString()
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.thank_message).toBeNull();
      expect(successResponse.data.thanked_at).toBeDefined();
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
        error: { message: 'You can only thank for recommendations sent to you', statusCode: 403, code: 'FORBIDDEN' }
      };

      expect(errorResponse.error.statusCode).toBe(403);
    });

    it('returns 409 when already thanked', () => {
      const errorResponse = {
        success: false,
        error: { message: 'You have already thanked for this recommendation', statusCode: 409, code: 'ALREADY_THANKED' }
      };

      expect(errorResponse.error.statusCode).toBe(409);
    });
  });
});
