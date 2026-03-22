/**
 * useLoyaltyStatus - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests user loyalty status fetching and progress calculation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoyaltyStatus } from '../useLoyaltyStatus';

// Mock fetch
global.fetch = vi.fn();

const mockLoyaltyData = {
  tier: 'silver',
  totalPoints: 150,
  businessStatuses: [
    { business_id: 1, points: 100, tier: 'silver' },
    { business_id: 2, points: 50, tier: 'bronze' },
  ],
};

describe('useLoyaltyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetching loyalty status', () => {
    it('fetches loyalty status on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoyaltyData,
      });

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        expect(result.current.overallTier).toBe('silver');
        expect(result.current.totalPoints).toBe(150);
      });
    });

    it('calls correct API endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoyaltyData,
      });

      renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/user/loyalty',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });

    it('provides default values on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        expect(result.current.overallTier).toBe('bronze');
        expect(result.current.totalPoints).toBe(0);
        expect(result.current.businessStatuses).toEqual([]);
      });
    });
  });

  describe('progress calculation', () => {
    it('calculates progress to next tier for bronze', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tier: 'bronze', totalPoints: 75, businessStatuses: [] }),
      });

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        const progress = result.current.getProgressToNextTier();
        expect(progress.current).toBe(25); // 75 - 50 (bronze min)
        expect(progress.required).toBe(50); // 100 - 50
        expect(progress.percentage).toBe(50); // 25/50 * 100
      });
    });

    it('calculates progress to next tier for silver', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tier: 'silver', totalPoints: 300, businessStatuses: [] }),
      });

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        const progress = result.current.getProgressToNextTier();
        expect(progress.current).toBe(200); // 300 - 100 (silver min)
        expect(progress.required).toBe(400); // 500 - 100
        expect(progress.percentage).toBe(50); // 200/400 * 100
      });
    });

    it('returns 100% for platinum tier', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tier: 'platinum', totalPoints: 1500, businessStatuses: [] }),
      });

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        const progress = result.current.getProgressToNextTier();
        expect(progress.percentage).toBe(100);
      });
    });

    it('caps progress percentage at 100%', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tier: 'bronze', totalPoints: 150, businessStatuses: [] }),
      });

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        const progress = result.current.getProgressToNextTier();
        expect(progress.percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoyaltyData,
      });

      const { result } = renderHook(() => useLoyaltyStatus());

      await waitFor(() => {
        expect(result.current).toHaveProperty('overallTier');
        expect(result.current).toHaveProperty('totalPoints');
        expect(result.current).toHaveProperty('businessStatuses');
        expect(result.current).toHaveProperty('loading');
        expect(result.current).toHaveProperty('error');
        expect(result.current).toHaveProperty('fetchLoyaltyStatus');
        expect(result.current).toHaveProperty('getProgressToNextTier');
      });
    });
  });
});
