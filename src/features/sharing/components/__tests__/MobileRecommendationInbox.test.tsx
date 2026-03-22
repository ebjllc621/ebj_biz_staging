/**
 * Unit tests for MobileRecommendationInbox component
 *
 * Tests loading states, error states, empty states, filter tabs, and recommendation list.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileRecommendationInbox } from '../MobileRecommendationInbox';

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock fetchWithCsrf
const mockFetchWithCsrf = vi.fn();
vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: (...args: unknown[]) => mockFetchWithCsrf(...args)
}));

// Mock MobileInboxFilters
vi.mock('../MobileInboxFilters', () => ({
  MobileInboxFilters: vi.fn(({ activeFilter, onFilterChange, counts }) => (
    <div data-testid="mobile-filters">
      <button data-testid="filter-all" onClick={() => onFilterChange('all')}>
        All ({counts.all})
      </button>
      <button data-testid="filter-unread" onClick={() => onFilterChange('unread')}>
        Unread ({counts.unread})
      </button>
      <button data-testid="filter-saved" onClick={() => onFilterChange('saved')}>
        Saved ({counts.saved})
      </button>
    </div>
  ))
}));

// Mock SwipeableRecommendationCard
vi.mock('../SwipeableRecommendationCard', () => ({
  SwipeableRecommendationCard: vi.fn(({ recommendation }) => (
    <div data-testid="swipeable-card">{recommendation.entity_preview?.title}</div>
  ))
}));

// Mock usePullToRefresh
vi.mock('@features/connections/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    state: { isPulling: false, pullDistance: 0, canRefresh: false },
    handlers: {},
    containerStyle: {}
  })
}));

describe('MobileRecommendationInbox', () => {
  const mockRecommendations = [
    {
      id: 1,
      sender_user_id: 100,
      recipient_user_id: 200,
      entity_type: 'listing',
      entity_id: '456',
      status: 'pending',
      referral_code: 'TEST1',
      viewed_at: null,
      is_saved: false,
      entity_preview: {
        id: '456',
        type: 'listing',
        title: 'First Listing'
      },
      sender: {
        username: 'johndoe',
        display_name: 'John Doe'
      }
    },
    {
      id: 2,
      sender_user_id: 101,
      recipient_user_id: 200,
      entity_type: 'event',
      entity_id: '789',
      status: 'pending',
      referral_code: 'TEST2',
      viewed_at: null,
      is_saved: false,
      entity_preview: {
        id: '789',
        type: 'event',
        title: 'Second Event'
      },
      sender: {
        username: 'janedoe',
        display_name: 'Jane Doe'
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithCsrf.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: mockRecommendations,
        counts: { all: 2, unread: 2, saved: 0 }
      })
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading text while fetching', async () => {
      let resolveRequest: (value: unknown) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      mockFetchWithCsrf.mockReturnValue(requestPromise);

      render(<MobileRecommendationInbox />);

      expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();

      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ items: mockRecommendations, counts: { all: 2, unread: 2, saved: 0 } })
      });
    });
  });

  // ============================================================================
  // Recommendation List
  // ============================================================================
  describe('Recommendation List', () => {
    it('renders recommendation cards after loading', async () => {
      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getAllByTestId('swipeable-card')).toHaveLength(2);
      });
    });

    it('shows recommendation titles', async () => {
      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByText('First Listing')).toBeInTheDocument();
        expect(screen.getByText('Second Event')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Filter Tabs
  // ============================================================================
  describe('Filter Tabs', () => {
    it('renders filter tabs', async () => {
      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filters')).toBeInTheDocument();
      });
    });

    it('passes counts to filter tabs', async () => {
      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByText('All (2)')).toBeInTheDocument();
        expect(screen.getByText('Unread (2)')).toBeInTheDocument();
        expect(screen.getByText('Saved (0)')).toBeInTheDocument();
      });
    });

    it('refetches when filter changes', async () => {
      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-unread')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('filter-unread'));

      await waitFor(() => {
        expect(mockFetchWithCsrf).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('shows error message on fetch failure', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Empty States
  // ============================================================================
  describe('Empty States', () => {
    it('shows empty state for all filter', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [], counts: { all: 0, unread: 0, saved: 0 } })
      });

      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByText('No recommendations yet')).toBeInTheDocument();
      });
    });

    it('shows appropriate empty state for unread filter', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [], counts: { all: 5, unread: 0, saved: 2 } })
      });

      render(<MobileRecommendationInbox initialFilter="unread" />);

      await waitFor(() => {
        expect(screen.getByText('All caught up!')).toBeInTheDocument();
      });
    });

    it('shows appropriate empty state for saved filter', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [], counts: { all: 5, unread: 3, saved: 0 } })
      });

      render(<MobileRecommendationInbox initialFilter="saved" />);

      await waitFor(() => {
        expect(screen.getByText('No saved recommendations')).toBeInTheDocument();
      });
    });

    it('shows mailbox emoji in empty state', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [], counts: { all: 0, unread: 0, saved: 0 } })
      });

      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByText('📭')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // End of List
  // ============================================================================
  describe('End of List', () => {
    it('shows no more message when hasMore is false', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [mockRecommendations[0]], // Less than 20 items
          counts: { all: 1, unread: 1, saved: 0 }
        })
      });

      render(<MobileRecommendationInbox />);

      await waitFor(() => {
        expect(screen.getByText('No more recommendations')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Initial Filter
  // ============================================================================
  describe('Initial Filter', () => {
    it('uses initialFilter prop', async () => {
      render(<MobileRecommendationInbox initialFilter="saved" />);

      await waitFor(() => {
        const url = (mockFetchWithCsrf.mock.calls[0][0] as string);
        expect(url).toContain('saved=true');
      });
    });
  });
});
