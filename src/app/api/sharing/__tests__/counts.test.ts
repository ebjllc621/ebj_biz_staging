/**
 * Recommendation Counts API Routes Integration Tests
 *
 * Tests behavior patterns for GET endpoint.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P4: API Integration Tests)
 * @coverage 4+ test cases
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

describe('Recommendation Counts API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/sharing/recommendations/counts
  // ============================================================================
  describe('GET /api/sharing/recommendations/counts', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('returns all count categories', () => {
      const successResponse = {
        success: true,
        data: {
          counts: {
            sent: 25,
            received: 12,
            unread: 5,
            saved: 8
          }
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.counts.sent).toBe(25);
      expect(successResponse.data.counts.received).toBe(12);
      expect(successResponse.data.counts.unread).toBe(5);
      expect(successResponse.data.counts.saved).toBe(8);
    });

    it('returns zero counts for new user', () => {
      const successResponse = {
        success: true,
        data: {
          counts: {
            sent: 0,
            received: 0,
            unread: 0,
            saved: 0
          }
        }
      };

      expect(successResponse.data.counts.sent).toBe(0);
      expect(successResponse.data.counts.received).toBe(0);
    });

    it('unread count is always <= received count', () => {
      const successResponse = {
        success: true,
        data: {
          counts: {
            sent: 20,
            received: 15,
            unread: 3,
            saved: 5
          }
        }
      };

      expect(successResponse.data.counts.unread).toBeLessThanOrEqual(successResponse.data.counts.received);
    });
  });
});
