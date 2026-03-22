/**
 * Unit tests for ContentCreatorImpactCard component
 *
 * Tests loading states, error handling, stats display, and content type breakdown.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContentCreatorImpactCard } from '../ContentCreatorImpactCard';

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ContentCreatorImpactCard', () => {
  const mockStats = {
    total_recommendations: 120,
    recommendation_views: 450,
    helpful_rate: 85,
    by_type: {
      articles: { recommendations: 50, views: 200, helpful_rate: 90 },
      newsletters: { recommendations: 30, views: 100, helpful_rate: 80 },
      podcasts: { recommendations: 25, views: 100, helpful_rate: 85 },
      videos: { recommendations: 15, views: 50, helpful_rate: 75 }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading spinner while fetching', async () => {
      let resolveRequest: (value: unknown) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      mockFetch.mockReturnValue(requestPromise);

      render(<ContentCreatorImpactCard />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });
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

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch content stats')).toBeInTheDocument();
      });
    });

    it('shows no stats message when stats is null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: null } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('No content stats available')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Stats Display
  // ============================================================================
  describe('Stats Display', () => {
    it('renders card title with icon', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Content Recommendation Impact')).toBeInTheDocument();
      });
    });

    it('shows total recommendations count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
      });
    });

    it('shows total views count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('450')).toBeInTheDocument();
        expect(screen.getByText('Views')).toBeInTheDocument();
      });
    });

    it('shows helpful rate percentage', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        // There are multiple 85% elements (summary + per content type)
        const helpfulRates = screen.getAllByText('85%');
        expect(helpfulRates.length).toBeGreaterThan(0);
        expect(screen.getByText('Helpful Rate')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Content Type Breakdown
  // ============================================================================
  describe('Content Type Breakdown', () => {
    it('shows By Content Type section header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('By Content Type')).toBeInTheDocument();
      });
    });

    it('shows articles stats', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Articles')).toBeInTheDocument();
        expect(screen.getByText('50 recs')).toBeInTheDocument();
      });
    });

    it('shows newsletters stats', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
        expect(screen.getByText('30 recs')).toBeInTheDocument();
      });
    });

    it('hides content types with 0 recommendations', async () => {
      const statsWithZero = {
        ...mockStats,
        by_type: {
          ...mockStats.by_type,
          videos: { recommendations: 0, views: 0, helpful_rate: 0 }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: statsWithZero } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.queryByText('Videos')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state message when total is 0', async () => {
      const emptyStats = {
        ...mockStats,
        total_recommendations: 0
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: emptyStats } })
      });

      render(<ContentCreatorImpactCard />);

      await waitFor(() => {
        expect(screen.getByText(/No content recommendations yet/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Custom ClassName
  // ============================================================================
  describe('Custom ClassName', () => {
    it('applies custom className prop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats } })
      });

      const { container } = render(<ContentCreatorImpactCard className="custom-class" />);

      await waitFor(() => {
        const card = container.querySelector('.custom-class');
        expect(card).toBeInTheDocument();
      });
    });
  });
});
