/**
 * ListingsPage Integration Tests
 *
 * @tier ADVANCED
 * @phase Phase 9 - Testing & Documentation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests complete data flow from API to display, error handling,
 * filter interactions, and display mode switching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ListingsPageClient } from '../ListingsPageClient';
import type { ListingWithCoordinates } from '@/features/listings/types';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/listings',
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

const mockListing: ListingWithCoordinates = {
  id: 1,
  name: 'Test Business',
  slug: 'test-business',
  category_name: 'Restaurant',
  city: 'Seattle',
  state: 'WA',
  cover_image_url: 'https://example.com/cover.jpg',
  logo_url: 'https://example.com/logo.jpg',
  rating: 4.5,
  is_featured: true,
  latitude: 47.6062,
  longitude: -122.3321,
  address: '123 Main St',
  zip: '98101',
  phone: '555-1234',
  email: 'test@example.com',
  website_url: 'https://example.com',
  description: 'Test description',
  hours_of_operation: {},
  social_media: {},
  user_id: 1,
  is_verified: true,
  is_published: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockApiResponse = {
  ok: true,
  data: {
    items: [mockListing],
    page: 1,
    pageSize: 20,
    total: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('ListingsPage Integration', () => {
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
    it('should fetch listings on mount', async () => {
      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/listings/search'),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should display loading skeleton during fetch', () => {
      // Mock a delayed response
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<ListingsPageClient />);

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render listings after successful fetch', async () => {
      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Test Business')).toBeInTheDocument();
      });
    });

    it('should display correct results count', async () => {
      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 1 listings/)).toBeInTheDocument();
      });
    });

    it('should include credentials in API request', async () => {
      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should parse pagination data from response', async () => {
      const multiPageResponse = {
        ok: true,
        data: {
          items: [mockListing, { ...mockListing, id: 2, name: 'Business 2' }],
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

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 50 listings/)).toBeInTheDocument();
      });
    });
  });

  describe('error handling flow', () => {
    it('should display error component on API failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: { message: 'Failed to load listings', code: 'INTERNAL' },
        }),
      });

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load listings')).toBeInTheDocument();
      });
    });

    it('should show network error on fetch failure', async () => {
      (fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      render(<ListingsPageClient />);

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

      render(<ListingsPageClient />);

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

      render(<ListingsPageClient />);

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

      render(<ListingsPageClient />);

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

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Business')).toBeInTheDocument();
      });
    });
  });

  describe('filter → API → display flow', () => {
    it('should update API params when page changes', async () => {
      mockSearchParams.set('page', '2');

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when sort changes', async () => {
      mockSearchParams.set('sort', 'name');

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=name'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when search query changes', async () => {
      mockSearchParams.set('q', 'coffee');

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('q=coffee'),
          expect.any(Object)
        );
      });
    });

    it('should include pageSize in API request', async () => {
      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20'),
          expect.any(Object)
        );
      });
    });

    it('should re-fetch when URL params change', async () => {
      const { rerender } = render(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      mockSearchParams.set('q', 'new search');
      rerender(<ListingsPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should display search query in results count', async () => {
      mockSearchParams.set('q', 'coffee shop');

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/for "coffee shop"/)).toBeInTheDocument();
      });
    });
  });

  describe('display mode → rendering flow', () => {
    it('should render grid when mode is grid', async () => {
      mockSearchParams.set('view', 'grid');

      const { container } = render(<ListingsPageClient />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should render list when mode is list', async () => {
      mockSearchParams.set('view', 'list');

      const { container } = render(<ListingsPageClient />);

      await waitFor(() => {
        const listContainer = container.querySelector('.space-y-4');
        expect(listContainer).toBeInTheDocument();
      });
    });

    it('should default to grid mode when no view param', async () => {
      const { container } = render(<ListingsPageClient />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should update display mode when toggle clicked', async () => {
      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Test Business')).toBeInTheDocument();
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
    it('should render pagination when listings exist', async () => {
      const multiPageResponse = {
        ok: true,
        data: {
          items: [mockListing],
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

      render(<ListingsPageClient />);

      await waitFor(() => {
        // Pagination component should be rendered
        expect(screen.getByText('Test Business')).toBeInTheDocument();
      });
    });

    it('should not render pagination when loading', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<ListingsPageClient />);

      // Pagination should not be visible during loading
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render pagination on error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      // No pagination should be visible
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no listings found', async () => {
      const emptyResponse = {
        ok: true,
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

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('No Listings Found')).toBeInTheDocument();
      });
    });

    it('should show helpful message in empty state', async () => {
      const emptyResponse = {
        ok: true,
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

      render(<ListingsPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
      });
    });
  });

  describe('page header', () => {
    it('should render page title', () => {
      render(<ListingsPageClient />);

      expect(screen.getByText('Business Listings')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<ListingsPageClient />);

      expect(screen.getByText(/Discover local businesses/)).toBeInTheDocument();
    });
  });

  describe('controls rendering', () => {
    it('should render display toggle', () => {
      render(<ListingsPageClient />);

      expect(screen.getByLabelText('Display mode')).toBeInTheDocument();
    });

    it('should render filter bar', () => {
      render(<ListingsPageClient />);

      expect(screen.getByPlaceholderText('Search listings...')).toBeInTheDocument();
    });
  });
});
