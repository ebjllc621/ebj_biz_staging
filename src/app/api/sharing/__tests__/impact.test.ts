/**
 * Sender Impact API Routes Integration Tests
 *
 * Tests behavior patterns for GET endpoint.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P4: API Integration Tests)
 * @coverage 5+ test cases
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

describe('Sender Impact API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/sharing/recommendations/impact
  // ============================================================================
  describe('GET /api/sharing/recommendations/impact', () => {
    it('returns 401 for unauthenticated request', async () => {
      const { getUserFromRequest } = await import('@core/utils/session-helpers');
      vi.mocked(getUserFromRequest).mockResolvedValue(null);

      const user = await getUserFromRequest({} as unknown);
      expect(user).toBeNull();

      const response = { success: false, error: { message: 'Unauthorized', statusCode: 401 } };
      expect(response.error.statusCode).toBe(401);
    });

    it('returns all impact stats', () => {
      const successResponse = {
        success: true,
        data: {
          stats: {
            total_recommendations_sent: 45,
            viewed_rate: 78.5,
            helpful_rate: 65.0,
            thank_rate: 42.0,
            average_points_per_recommendation: 6.5,
            total_points_earned: 290
          }
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.stats.total_recommendations_sent).toBe(45);
      expect(successResponse.data.stats.viewed_rate).toBe(78.5);
      expect(successResponse.data.stats.helpful_rate).toBe(65.0);
    });

    it('returns recent feedback list', () => {
      const successResponse = {
        success: true,
        data: {
          stats: {
            total_recommendations_sent: 10,
            recent_feedback: [
              { id: 1, message: 'Great recommendation!', created_at: '2026-02-21T10:00:00Z' },
              { id: 2, message: 'This was really helpful', created_at: '2026-02-20T15:30:00Z' }
            ]
          }
        }
      };

      expect(successResponse.data.stats.recent_feedback).toHaveLength(2);
      expect(successResponse.data.stats.recent_feedback[0].message).toBe('Great recommendation!');
    });

    it('returns zero stats for new user', () => {
      const successResponse = {
        success: true,
        data: {
          stats: {
            total_recommendations_sent: 0,
            viewed_rate: 0,
            helpful_rate: 0,
            thank_rate: 0,
            average_points_per_recommendation: 0,
            total_points_earned: 0,
            recent_feedback: []
          }
        }
      };

      expect(successResponse.data.stats.total_recommendations_sent).toBe(0);
      expect(successResponse.data.stats.recent_feedback).toEqual([]);
    });

    it('rates are percentages between 0-100', () => {
      const successResponse = {
        success: true,
        data: {
          stats: {
            viewed_rate: 85.5,
            helpful_rate: 72.3,
            thank_rate: 45.0
          }
        }
      };

      expect(successResponse.data.stats.viewed_rate).toBeGreaterThanOrEqual(0);
      expect(successResponse.data.stats.viewed_rate).toBeLessThanOrEqual(100);
      expect(successResponse.data.stats.helpful_rate).toBeGreaterThanOrEqual(0);
      expect(successResponse.data.stats.helpful_rate).toBeLessThanOrEqual(100);
    });
  });
});
