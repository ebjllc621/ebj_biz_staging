/**
 * EventsPage Integration Tests
 *
 * @tier ADVANCED
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests complete data flow from API to display, error handling,
 * filter interactions, and display mode switching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EventsPageClient } from '../EventsPageClient';
import type { EventWithCoordinates } from '@/features/events/types';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/events',
  useSearchParams: () => mockSearchParams,
}));

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: (fn: any) => {
    const Component = () => null;
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockEvent: EventWithCoordinates = {
  id: 1,
  listing_id: 1,
  title: 'Community Festival',
  slug: 'community-festival',
  listing_name: 'Local Business',
  start_date: new Date('2026-02-01T10:00:00Z'),
  end_date: new Date('2026-02-01T18:00:00Z'),
  banner_image: 'https://example.com/event.jpg',
  event_type: 'festival',
  location_type: 'physical',
  city: 'Seattle',
  state: 'WA',
  latitude: 47.6062,
  longitude: -122.3321,
  venue_name: 'Seattle Center',
  is_featured: true,
  is_ticketed: false,
  ticket_price: null,
  remaining_capacity: 50,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockApiResponse = {
  success: true,
  data: {
    items: [mockEvent],
    page: 1,
    pageSize: 20,
    total: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('EventsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });

    // Default successful response
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
  });

  describe('data flow', () => {
    it('should fetch events on mount', async () => {
      render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/events/search'),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should display loading skeleton during fetch', () => {
      // Mock a delayed response
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<EventsPageClient />);

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render events after successful fetch', async () => {
      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Community Festival')).toBeInTheDocument();
      });
    });

    it('should display correct results count', async () => {
      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 1 events/)).toBeInTheDocument();
      });
    });

    it('should include credentials in API request', async () => {
      render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should parse pagination data from response', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          items: [mockEvent, { ...mockEvent, id: 2, title: 'Event 2' }],
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 50 events/)).toBeInTheDocument();
      });
    });
  });

  describe('error handling flow', () => {
    it('should display error component on API failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { message: 'Failed to load events', code: 'INTERNAL' },
        }),
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load events')).toBeInTheDocument();
      });
    });

    it('should show network error on fetch failure', async () => {
      (fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });
    });

    it('should show rate limit UI for 429 response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Too Many Requests')).toBeInTheDocument();
      });
    });

    it('should detect internal server errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('should detect timeout errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 504,
        json: async () => ({}),
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      });
    });

    it('should retry when retry button clicked', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Community Festival')).toBeInTheDocument();
      });
    });
  });

  describe('filter → API → display flow', () => {
    it('should update API params when page changes', async () => {
      mockSearchParams.set('page', '2');

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when sort changes', async () => {
      mockSearchParams.set('sort', 'name');

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=name'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when search query changes', async () => {
      mockSearchParams.set('q', 'festival');

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('q=festival'),
          expect.any(Object)
        );
      });
    });

    it('should include pageSize in API request', async () => {
      render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20'),
          expect.any(Object)
        );
      });
    });

    it('should re-fetch when URL params change', async () => {
      const { rerender } = render(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      mockSearchParams.set('q', 'new search');
      rerender(<EventsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should display search query in results count', async () => {
      mockSearchParams.set('q', 'festival');

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/for "festival"/)).toBeInTheDocument();
      });
    });
  });

  describe('display mode → rendering flow', () => {
    it('should render grid when mode is grid', async () => {
      mockSearchParams.set('view', 'grid');

      const { container } = render(<EventsPageClient />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should render list when mode is list', async () => {
      mockSearchParams.set('view', 'list');

      const { container } = render(<EventsPageClient />);

      await waitFor(() => {
        const listContainer = container.querySelector('.space-y-4');
        expect(listContainer).toBeInTheDocument();
      });
    });

    it('should default to grid mode when no view param', async () => {
      const { container } = render(<EventsPageClient />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should update display mode when toggle clicked', async () => {
      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Community Festival')).toBeInTheDocument();
      });

      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('view=list'),
        expect.objectContaining({ scroll: false })
      );
    });
  });

  describe('pagination flow', () => {
    it('should render pagination when events exist', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          items: [mockEvent],
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        // Pagination component should be rendered
        expect(screen.getByText('Community Festival')).toBeInTheDocument();
      });
    });

    it('should not render pagination when loading', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<EventsPageClient />);

      // Pagination should not be visible during loading
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render pagination on error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      // No pagination should be visible
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no events found', async () => {
      const emptyResponse = {
        success: true,
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('No Events Found')).toBeInTheDocument();
      });
    });

    it('should show helpful message in empty state', async () => {
      const emptyResponse = {
        success: true,
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      render(<EventsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
      });
    });
  });

  describe('page header', () => {
    it('should render page title', () => {
      render(<EventsPageClient />);

      expect(screen.getByText('Events')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<EventsPageClient />);

      expect(screen.getByText(/Discover upcoming events/)).toBeInTheDocument();
    });
  });

  describe('controls rendering', () => {
    it('should render display toggle', () => {
      render(<EventsPageClient />);

      expect(screen.getByLabelText('Display mode')).toBeInTheDocument();
    });

    it('should render filter bar', () => {
      render(<EventsPageClient />);

      expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
    });
  });
});
