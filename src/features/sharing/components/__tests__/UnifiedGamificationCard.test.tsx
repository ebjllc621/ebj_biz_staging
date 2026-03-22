/**
 * Unit tests for UnifiedGamificationCard component
 *
 * Tests loading states, error handling, compact vs regular modes, and stats display.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnifiedGamificationCard } from '../UnifiedGamificationCard';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('UnifiedGamificationCard', () => {
  const mockData = {
    total_points: 1250,
    total_recommendations_sent: 45,
    helpful_rate: 78,
    total_thank_yous: 22,
    recommendation_points: 450,
    combined_activities: 65
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading spinner when fetching data', async () => {
      let resolveRequest: (value: unknown) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      mockFetch.mockReturnValue(requestPromise);

      render(<UnifiedGamificationCard />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });
    });

    it('does not fetch when initialData is provided', () => {
      render(<UnifiedGamificationCard initialData={mockData} />);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('shows error message on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<UnifiedGamificationCard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch gamification stats')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Regular Mode
  // ============================================================================
  describe('Regular Mode', () => {
    it('renders title with trophy icon', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.getByText('Your Gamification Stats')).toBeInTheDocument();
      });
    });

    it('shows total points', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });
    });

    it('shows stats grid with all values', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();   // sent
        expect(screen.getByText('78%')).toBeInTheDocument();  // helpful
        expect(screen.getByText('22')).toBeInTheDocument();   // thanks
        expect(screen.getByText('450')).toBeInTheDocument();  // rec points
      });
    });

    it('shows labels for stats', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.getByText('Sent')).toBeInTheDocument();
        expect(screen.getByText('Helpful')).toBeInTheDocument();
        expect(screen.getByText('Thanks')).toBeInTheDocument();
        expect(screen.getByText('Rec Points')).toBeInTheDocument();
      });
    });

    it('shows activity count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.getByText('From 65 activities')).toBeInTheDocument();
      });
    });

    it('shows helpful rate progress bar when rate > 0', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.getByText('Recommendation Quality')).toBeInTheDocument();
        expect(screen.getByText('78% Helpful')).toBeInTheDocument();
      });
    });

    it('hides progress bar when helpful rate is 0', async () => {
      const zeroRateData = { ...mockData, helpful_rate: 0 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: zeroRateData })
      });

      render(<UnifiedGamificationCard mode="regular" />);

      await waitFor(() => {
        expect(screen.queryByText('Recommendation Quality')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Compact Mode
  // ============================================================================
  describe('Compact Mode', () => {
    it('shows "Your Impact" title in compact mode', async () => {
      render(<UnifiedGamificationCard mode="compact" initialData={mockData} />);

      expect(screen.getByText('Your Impact')).toBeInTheDocument();
    });

    it('shows total points prominently', () => {
      render(<UnifiedGamificationCard mode="compact" initialData={mockData} />);

      expect(screen.getByText('1250')).toBeInTheDocument();
    });

    it('shows compact stats grid', () => {
      render(<UnifiedGamificationCard mode="compact" initialData={mockData} />);

      // Should show sent, helpful%, and thanks
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Initial Data
  // ============================================================================
  describe('Initial Data', () => {
    it('uses initialData without fetching', () => {
      render(<UnifiedGamificationCard initialData={mockData} />);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });
});
